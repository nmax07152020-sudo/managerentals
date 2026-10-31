const SPREADSHEET_ID = 'PASTE_YOUR_GOOGLE_SHEET_ID_HERE';
const API_SECRET = 'CHANGE_THIS_TO_A_LONG_RANDOM_SECRET';
const SHEETS = {
  Users:['id','name','business','email','salt','passwordHash','phone','address','createdAt','status'],
  Sessions:['tokenHash','userId','expiresAt','createdAt'],
  Tenants:['id','accountId','name','phone','unit','rent','createdAt'],
  Properties:['id','accountId','name','unit','rent','status','createdAt'],
  Bills:['id','accountId','tenantName','type','period','due','amount','status','createdAt'],
  Payments:['id','accountId','tenantName','type','period','date','amount','method','createdAt'],
  Ads:['id','accountId','title','location','price','description','createdAt']
};
const ALLOWED = {tenants:'Tenants',properties:'Properties',bills:'Bills',payments:'Payments',ads:'Ads'};
function setupRentFlow(){
  const ss=SpreadsheetApp.openById(SPREADSHEET_ID);
  Object.keys(SHEETS).forEach(n=>{
    let sh=ss.getSheetByName(n)||ss.insertSheet(n);
    if(sh.getLastRow()===0) sh.appendRow(SHEETS[n]);
  });
}
function doPost(e){
  try{
    const body=JSON.parse((e&&e.postData&&e.postData.contents)||'{}');
    if(body.secret!==API_SECRET) return out({ok:false,error:'Unauthorized backend request'});
    const result=route(body);
    return out(Object.assign({ok:true},result||{}));
  }catch(err){return out({ok:false,error:String(err.message||err)});}
}
function out(o){return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);}
function ss(){return SpreadsheetApp.openById(SPREADSHEET_ID);}
function sh(name){let s=ss().getSheetByName(name);if(!s)throw new Error('Run setupRentFlow() first');return s;}
function rows(name){let v=sh(name).getDataRange().getValues();if(v.length<2)return [];let h=v[0];return v.slice(1).filter(r=>r.some(x=>x!=='')).map(r=>Object.fromEntries(h.map((k,i)=>[k,r[i]])));}
function append(name,obj){let s=sh(name),h=s.getRange(1,1,1,s.getLastColumn()).getValues()[0];s.appendRow(h.map(k=>obj[k]===undefined?'':obj[k]));}
function updateRow(name,key,value,obj){let s=sh(name),v=s.getDataRange().getValues(),h=v[0],ki=h.indexOf(key);for(let i=1;i<v.length;i++){if(String(v[i][ki])===String(value)){h.forEach((k,j)=>{if(obj[k]!==undefined)v[i][j]=obj[k]});s.getRange(i+1,1,1,h.length).setValues([v[i]]);return true;}}return false;}
function deleteRow(name,key,value){let s=sh(name),v=s.getDataRange().getValues(),ki=v[0].indexOf(key);for(let i=v.length-1;i>=1;i--)if(String(v[i][ki])===String(value)){s.deleteRow(i+1);return true;}return false;}
function digest(s){return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,s,Utilities.Charset.UTF_8).map(b=>(b<0?b+256:b).toString(16).padStart(2,'0')).join('');}
function newId(){return Utilities.getUuid();}
function findUser(email){return rows('Users').find(u=>String(u.email).toLowerCase()===String(email).toLowerCase()&&u.status!=='Disabled');}
function createSession(userId){let token=newId()+newId(),expires=Date.now()+1000*60*60*24*7;append('Sessions',{tokenHash:digest(token),userId,expiresAt:expires,createdAt:Date.now()});return token;}
function auth(token){if(!token)throw new Error('Please log in again');let hash=digest(token),s=rows('Sessions').find(x=>x.tokenHash===hash&&Number(x.expiresAt)>Date.now());if(!s)throw new Error('Session expired. Please log in again.');let u=rows('Users').find(x=>x.id===s.userId&&x.status!=='Disabled');if(!u)throw new Error('Account unavailable');return u;}
function publicUser(u){return {id:u.id,name:u.name,business:u.business,email:u.email,phone:u.phone,address:u.address};}
function route(b){
  if(b.action==='register'){
    let email=String(b.email||'').trim().toLowerCase(),password=String(b.password||'');
    if(!email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('Enter a valid email address');
    if(password.length<8)throw new Error('Password must be at least 8 characters');
    if(findUser(email))throw new Error('Email is already registered');
    let salt=newId(),u={id:newId(),name:String(b.name||'').trim(),business:String(b.business||'').trim(),email,salt,passwordHash:digest(salt+'|'+password),createdAt:Date.now(),status:'Active'};
    if(!u.name||!u.business)throw new Error('Complete your name and business name');
    append('Users',u);return {token:createSession(u.id),user:publicUser(u)};
  }
  if(b.action==='login'){
    let u=findUser(String(b.email||'').trim().toLowerCase());if(!u||digest(u.salt+'|'+String(b.password||''))!==u.passwordHash)throw new Error('Invalid email or password');
    return {token:createSession(u.id),user:publicUser(u)};
  }
  if(b.action==='me'){let u=auth(b.token);return {user:publicUser(u)};}
  if(b.action==='profile'){let u=auth(b.token);updateRow('Users','id',u.id,{business:String(b.business||u.business),phone:String(b.phone||''),address:String(b.address||'')});return {user:publicUser(Object.assign({},u,{business:b.business,phone:b.phone,address:b.address}))};}
  if(b.action==='list'){
    let u=auth(b.token),accountId=u.id,records={};
    Object.keys(ALLOWED).forEach(k=>records[k]=rows(ALLOWED[k]).filter(x=>x.accountId===accountId).map(x=>{delete x.accountId;return x;}));
    return {records};
  }
  if(b.action==='save'){
    let u=auth(b.token),sheet=ALLOWED[b.collection];if(!sheet)throw new Error('Invalid collection');
    let rec=b.record||{},id=String(rec.id||newId());rec.id=id;rec.accountId=u.id;rec.createdAt=Date.now();
    let existing=rows(sheet).find(x=>x.id===id&&x.accountId===u.id);
    if(existing)updateRow(sheet,'id',id,rec);else append(sheet,rec);
    return {id};
  }
  if(b.action==='delete'){
    let u=auth(b.token),sheet=ALLOWED[b.collection];if(!sheet)throw new Error('Invalid collection');
    let id=String(b.id||''),exists=rows(sheet).some(x=>x.id===id&&x.accountId===u.id);
    if(!exists)throw new Error('Record not found');deleteRow(sheet,'id',id);return {deleted:true};
  }
  throw new Error('Unknown action');
}