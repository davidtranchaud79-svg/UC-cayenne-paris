import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createHash,randomUUID} from 'node:crypto';

const code=readFileSync(new URL('../src/Code.gs',import.meta.url),'utf8');
const access=readFileSync(new URL('../src/Access.gs',import.meta.url),'utf8');
function fixture(){
  const props=new Map(),cache=new Map();let locked=false;
  const db={MEMBRES:[{Nom:'Exemple',Prenom:'Camille',Email:'camille@example.test',Statut:'Compagnon',Cayenne:'Paris',Actif:'Oui'},
    {Nom:'Autre',Prenom:'Alex',Email:'alex@example.test',Statut:'Aspirant',Cayenne:'Paris',Actif:'Oui'}],
    REPONSES:[], CALENDRIER:[{ID_Evenement:'evt1',Annee:2026,Date:new Date('2026-09-19'),Titre:'JEP',Type_Evenement:'JEP',Actif:'Oui'}]};
  const settings={admin_pin:'bureau-test-code',annee_active:2026};
  const context=vm.createContext({console,Date,Set,JSON,
    PropertiesService:{getScriptProperties:()=>({getProperty:k=>props.get(k)||null,setProperty:(k,v)=>props.set(k,v),deleteProperty:k=>props.delete(k)})},
    CacheService:{getScriptCache:()=>({get:k=>cache.get(k)||null,put:(k,v)=>cache.set(k,v),remove:k=>cache.delete(k)})},
    LockService:{getScriptLock:()=>({waitLock:()=>{assert.ok(!locked,'No nested lock');locked=true;},releaseLock:()=>{locked=false;}})},
    Utilities:{getUuid:randomUUID,computeDigest:(_,text)=>Array.from(createHash('sha256').update(text).digest()),DigestAlgorithm:{SHA_256:'sha256'},Charset:{UTF_8:'utf8'},formatDate:d=>d.toISOString().slice(0,10)},
    Session:{getScriptTimeZone:()=> 'Europe/Paris'}
  });
  vm.runInContext(code+'\n'+access,context);
  const headers=vm.runInContext('UC_APP.headers.reponses',context);
  context.getSettings_=()=>settings;
  context.getRowsAsObjects_=name=>db[name]||[];
  context.getOptionList_=(_,fallback)=>fallback;
  context.setupSystemIfMissing_=()=>{};
  context.refreshDashboardSheet_=()=>{};
  context.generateEventSheet_=()=>{};
  context.getSpreadsheet_=()=>({getSheetByName:()=>({getLastRow:()=>db.REPONSES.length+1,getRange:()=>({setValues:rows=>rows.forEach(row=>db.REPONSES.push(Object.fromEntries(headers.map((h,i)=>[h,row[i]]))))})})});
  context.upsertMember_=member=>db.MEMBRES.push(member);
  const bureau=context.loginBureau(settings.admin_pin).token;
  function issue(key='camille@example.test'){return context.manageMemberCode(key,'issue',bureau).code;}
  function member(key){return context.loginMember(issue(key)).token;}
  return {c:context,db,settings,props,cache,bureau,issue,member,headers};
}

test('a member code opens only that identity; bureau and member sessions are not interchangeable',()=>{
  const {c,member,bureau}=fixture();const token=member();
  assert.equal(c.assertMember_(token).Prenom,'Camille');
  assert.equal(c.getPublicConfig(token,null).activeYear,2026);
  assert.throws(()=>c.assertMember_(bureau),/SESSION_EXPIRED/);
  assert.throws(()=>c.assertAdmin_(token),/SESSION_EXPIRED/);
  assert.throws(()=>c.getPublicConfig(),/SESSION_EXPIRED/);
  assert.throws(()=>c.submitResponses({}),/SESSION_EXPIRED/);
  assert.throws(()=>c.manageMemberCode('camille@example.test','reset',token),/SESSION_EXPIRED/);
});

test('personal codes are stored as hashes, can be rotated and revoked, and inactive members cannot sign in',()=>{
  const {c,issue,bureau,props,db}=fixture();const code=issue();const token=c.loginMember(code.toLowerCase()).token;
  assert.ok(!JSON.stringify([...props]).includes(code.replaceAll('-','')));
  const replacement=c.manageMemberCode('camille@example.test','reset',bureau).code;
  assert.throws(()=>c.loginMember(code),/Code incorrect/);
  assert.throws(()=>c.assertMember_(token),/SESSION_EXPIRED/);
  const renewed=c.loginMember(replacement).token;
  db.MEMBRES[0].Actif='Non';assert.throws(()=>c.assertMember_(renewed),/SESSION_EXPIRED/);
  assert.throws(()=>c.loginMember(replacement),/Code incorrect/);
  db.MEMBRES[0].Actif='Oui';c.manageMemberCode('camille@example.test','revoke',bureau);
  assert.throws(()=>c.assertMember_(renewed),/SESSION_EXPIRED/);
});

test('submissions use server identity, reject inactive events and are safe to retry',()=>{
  const {c,member,db}=fixture();const token=member();
  const payload={requestId:randomUUID(),eventIds:['evt1','evt1'],reponse:'Présent',nom:'Autre',prenom:'Alex',email:'alex@example.test',statut:'Aspirant'};
  assert.equal(c.submitResponses(payload,token).saved,1);
  assert.equal(db.REPONSES[0].Cle_Personne,'camille@example.test');
  assert.equal(db.REPONSES[0].Statut,'Compagnon');
  assert.equal(c.submitResponses(payload,token).saved,1);assert.equal(db.REPONSES.length,1);
  db.CALENDRIER[0].Actif='Non';assert.throws(()=>c.submitResponses({...payload,requestId:randomUUID()},token),/plus disponible/);
});

test('member history never returns another member, and the latest response replaces the prior display',()=>{
  const {c,db,member}=fixture();const a=member();const b=member('alex@example.test');
  c.submitResponses({requestId:randomUUID(),eventIds:['evt1'],reponse:'Absent excusé',causes:['Travail']},a);
  c.submitResponses({requestId:randomUUID(),eventIds:['evt1'],reponse:'Présent'},b);
  const aData=c.getPublicConfig(a,2026),bData=c.getPublicConfig(b,2026);
  assert.equal(aData.responses.length,1);assert.equal(aData.responses[0].response,'Absent excusé');
  assert.equal(bData.responses[0].response,'Présent');assert.equal(aData.profile.prenom,'Camille');
  assert.ok(!JSON.stringify(aData).includes('alex@example.test'));
  c.submitResponses({requestId:randomUUID(),eventIds:['evt1'],reponse:'Disponible pour aider'},a);
  assert.equal(c.getPublicConfig(a,2026).responses[0].response,'Disponible pour aider');assert.equal(db.REPONSES.length,3);
});

test('a report failure after a saved response returns success with a warning, not a retry error',()=>{
  const {c,member,db}=fixture();const token=member();c.generateEventSheet_=()=>{throw Error('M3 validation');};
  const result=c.submitResponses({requestId:randomUUID(),eventIds:['evt1'],reponse:'Présent'},token);
  assert.equal(result.ok,true);assert.match(result.warning,/enregistrées/);assert.equal(db.REPONSES.length,1);
});

test('bureau code changes, expired sessions and logout invalidate previous access',()=>{
  const {c,member,bureau,settings,cache}=fixture();const token=member();c.logoutAccess(token);assert.throws(()=>c.assertMember_(token),/SESSION_EXPIRED/);
  settings.admin_pin='new-bureau-code';assert.throws(()=>c.assertAdmin_(bureau),/SESSION_EXPIRED/);
  const updated=c.loginBureau(settings.admin_pin).token;
  const key='uc.session.'+c.accessHash_(updated);cache.set(key,JSON.stringify({role:'bureau',expires:Date.now()-1}));
  assert.throws(()=>c.assertAdmin_(updated),/SESSION_EXPIRED/);
});

test('failed code guessing is bounded and creating access requires a bureau session',()=>{
  const {c,member,bureau}=fixture();const token=member();
  assert.throws(()=>c.createMemberAccess({nom:'Test',prenom:'Test'},token),/SESSION_EXPIRED/);
  const result=c.createMemberAccess({nom:'Nouveau',prenom:'Sam',statut:'Sociétaire',cayenne:'Paris'},bureau);
  assert.equal(c.assertMember_(c.loginMember(result.code).token).Prenom,'Sam');
  for(let i=0;i<100;i++)assert.throws(()=>c.loginMember('0000-0000-0000-0000'),/Code incorrect/);
  assert.throws(()=>c.loginMember('0000-0000-0000-0000'),/Trop de tentatives/);
});

test('report linking respects a row-three header and never rewrites validated M3',()=>{
  const {c,headers}=fixture();const writes=[];
  const row=headers.map(()=> '');row[4]='evt1';row[12]='Compagnon';
  const grid=[['ID_Reponse'],[],Array.from(headers),row];
  c.getSpreadsheet_=()=>({getSheetByName:()=>({getLastRow:()=>4,getLastColumn:()=>25,getRange:(r,col,n)=>({getValues:()=>grid.slice(r-1,r-1+n),setValue:value=>{writes.push({r,col,value});}})})});
  c.markResponseReportSheet_('evt1','CR_JEP');
  assert.deepEqual(writes,[{r:4,col:25,value:'CR_JEP'}]);
  assert.equal(grid[2][12],'Statut');
});

test('maintenance functions cannot be called remotely from a member page',()=>{
  const {c}=fixture();
  for(const name of ['setupSystem','refreshDashboardSheet','generateAllEventSheetsForActiveYear','exportActiveSheetPdf','verifierConnexionSheet'])assert.equal(c[name],undefined);
});
