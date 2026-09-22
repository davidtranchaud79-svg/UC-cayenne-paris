import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';

function formatDate(date,zone,pattern){
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date).map(p=>[p.type,p.value]));
  return pattern.replace(/yyyy|MM|dd|HH|mm/g,k=>parts[{yyyy:'year',MM:'month',dd:'day',HH:'hour',mm:'minute'}[k]]);
}
function fixture(){
  const props=new Map([['uc.mail.enabled','true'],['uc.mail.since',String(Date.parse('2026-09-01'))]]),db={REPONSES:[],MEMBRES:[],CALENDRIER:[]},sent=[],triggers=[];
  let quota=100,failSend=false,failLog=false,locked=false;
  const c=vm.createContext({Date,Set,console,Utilities:{formatDate,computeDigest:(_,s)=>Array.from(createHash('sha256').update(s).digest()),DigestAlgorithm:{SHA_256:'sha256'},Charset:{UTF_8:'utf8'}},Session:{getScriptTimeZone:()=> 'Europe/Paris'},
    PropertiesService:{getScriptProperties:()=>({getProperty:k=>props.get(k)||null,setProperty:(k,v)=>props.set(k,v),deleteProperty:k=>props.delete(k)})},
    LockService:{getScriptLock:()=>({waitLock(){assert.equal(locked,false);locked=true;},releaseLock(){locked=false;}})},
    SpreadsheetApp:{flush(){}},
    MailApp:{getRemainingDailyQuota:()=>quota,sendEmail(message){if(failSend)throw Error('Timeout');sent.push(message);}},
    ScriptApp:{getProjectTriggers:()=>triggers.slice(),deleteTrigger:t=>triggers.splice(triggers.indexOf(t),1),newTrigger:name=>({timeBased(){return this;},everyHours(n){assert.equal(n,1);return this;},create(){triggers.push({getHandlerFunction:()=>name});}})}
  });
  vm.runInContext(['Code.gs','Access.gs','Notifications.gs'].map(f=>readFileSync(new URL('../src/'+f,import.meta.url),'utf8')).join('\n'),c);
  const headers=vm.runInContext('UC_APP.headers',c);
  const sheet=name=>({getLastRow:()=>db[name]?db[name].length+1:0,setFrozenRows(){},getRange(row){return {setValues(values){
    if(name==='JOURNAL_MAILS'&&failLog&&values.some(r=>r[6]==='ENVOYE'||r[6]==='A_VERIFIER'))throw Error('Storage unavailable');
    if(row===1){db[name]=[];return;}
    const h=name==='REPONSES'?headers.reponses:headers.mails;
    values.forEach((v,i)=>db[name][row-2+i]=Object.fromEntries(h.map((k,j)=>[k,v[j]])));
  }};}});
  c.getRowsAsObjects_=name=>db[name]||[];
  c.getTableData_=name=>({rows:db[name]||[],rowNumbers:(db[name]||[]).map((_,i)=>i+2)});
  c.getSpreadsheet_=()=>({getSheetByName:sheet});c.ensureSheet_=(_,name)=>sheet(name);
  c.setupSystemIfMissing_=()=>{};c.getOptionList_=(_,fallback)=>fallback;c.refreshDashboardSheet_=()=>{};c.generateEventSheet_=()=>{};
  const member={Nom:'Exemple',Prenom:'Camille',Email:'camille@example.test',Statut:'Compagnon',Cayenne:'Paris',Actif:'Oui'};
  db.MEMBRES.push(member);c.assertMember_=token=>{assert.equal(token,'MEMBER');return member;};
  const event={ID_Evenement:'e1',Date:new Date('2026-09-23T12:00:00Z'),Annee:2026,Titre:'Réunion',Actif:'Oui',Heure_Debut:'19:00',Heure_Fin:'21:00',Lieu:'Paris'};
  db.CALENDRIER.push(event);
  const response={ID_Reponse:'r1',ID_Evenement:'e1',Cle_Personne:'camille@example.test',Horodatage:new Date('2026-09-21T12:00:00Z'),Reponse:'Présent',Participation:'Repas et aide',Creneaux:'Soir',Precision:'PRIVATE_REASON',Commentaire:'PRIVATE_COMMENT'};
  db.REPONSES.push(response);
  const now=new Date('2026-09-22T10:00:00Z');
  return {c,props,db,sent,triggers,member,event,response,now,quota:n=>quota=n,failSend:v=>failSend=v,failLog:v=>failLog=v};
}

test('visible mail commands reject anonymous or other Google users before any changes',()=>{
 const f=fixture();f.props.clear();
 f.c.Session.getEffectiveUser=()=>({getEmail:()=> 'owner@example.test'});
 for(const email of ['', 'member@example.test']){
   f.c.Session.getActiveUser=()=>({getEmail:()=>email});
   assert.throws(()=>f.c.activerMails(),/compte Google/);
   assert.throws(()=>f.c.desactiverMails(),/compte Google/);
   assert.equal(f.triggers.length,0);assert.equal(f.props.size,0);assert.equal(f.sent.length,0);
 }
 f.c.Session.getActiveUser=()=>({getEmail:()=> 'owner@example.test'});
 assert.equal(f.c.activerMails().ok,true);assert.equal(f.triggers.length,1);assert.equal(f.sent.length,0);
 f.c.desactiverMails();assert.equal(f.triggers.length,0);assert.equal(f.props.get('uc.mail.enabled'),'false');
});

test('activation is idempotent, installs one trigger, sends nothing and excludes historical confirmations',()=>{
 const f=fixture();f.props.clear();f.c.activerNotifications_();const since=f.props.get('uc.mail.since');f.c.activerNotifications_();
 assert.equal(f.triggers.length,1);assert.equal(f.props.get('uc.mail.since'),since);assert.equal(f.sent.length,0);
 const candidates=f.c.mailCandidates_([f.response],[f.event],[f.member],Number(since),f.now,['r1']);assert.equal(candidates.length,0);
 f.c.desactiverNotifications_();assert.equal(f.triggers.length,0);assert.equal(f.c.traiterMails_(null,f.now).enabled,false);
});
test('one confirmation per saved event, server identity, retries deduplicated, updates get a new receipt',()=>{
 const f=fixture();f.db.REPONSES=[];f.db.CALENDRIER.push({...f.event,ID_Evenement:'e2'});
 const payload={requestId:'request-number-0001',email:'attacker@example.test',answers:[{eventId:'e1',reponse:'Présent'},{eventId:'e2',reponse:'Absent'}]};
 assert.equal(f.c.submitResponses(payload,'MEMBER').ok,true);assert.equal(f.sent.length,2);assert.ok(f.sent.every(m=>m.to===f.member.Email));
 f.c.submitResponses(payload,'MEMBER');assert.equal(f.sent.length,2);assert.equal(f.db.REPONSES.length,2);
 f.c.submitResponses({...payload,requestId:'request-number-0002',answers:[{eventId:'e1',reponse:'Je ne sais pas encore'}]},'MEMBER');
 assert.equal(f.sent.length,3);assert.match(f.sent[2].body,/Je ne sais pas encore/);
});
test('quota exhausted defers confirmations and background recovers once; send failure preserves the answer',()=>{
 const f=fixture();f.quota(0);f.c.traiterMails_(['r1'],f.now);assert.equal(f.db.JOURNAL_MAILS[0].Etat,'ATTENTE');assert.equal(f.sent.length,0);
 f.quota(10);const early=new Date('2026-09-22T05:00:00Z');f.c.traiterMails_(null,early);f.c.traiterMails_(null,early);assert.equal(f.sent.length,1);
 f.failSend(true);const result=f.c.submitResponses({requestId:'request-number-0003',answers:[{eventId:'e1',reponse:'Absent'}]},'MEMBER');
 assert.equal(result.ok,true);assert.equal(f.db.REPONSES.length,2);assert.match(result.message,/attente/);
 assert.equal(f.db.JOURNAL_MAILS.at(-1).Etat,'A_VERIFIER');f.failSend(false);f.c.traiterMails_(null,early);assert.equal(f.sent.length,1);
});
test('crash after sending never causes a blind duplicate',()=>{
 const f=fixture();f.failLog(true);assert.throws(()=>f.c.traiterMails_(['r1'],f.now),/Storage/);assert.equal(f.sent.length,1);
 assert.equal(f.db.JOURNAL_MAILS[0].Etat,'EN_COURS');f.failLog(false);f.c.traiterMails_(['r1'],f.now);assert.equal(f.sent.length,1);
});
test('reminder uses latest answer, suppresses absence, inactive entities and people without replies',()=>{
 const f=fixture();const candidates=()=>f.c.mailCandidates_(f.db.REPONSES,f.db.CALENDRIER,f.db.MEMBRES,Date.now()+10000,f.now,null);
 assert.equal(candidates().length,1);
 for(const reponse of ['Absent','Absent excusé']){f.db.REPONSES.push({...f.response,ID_Reponse:reponse,Horodatage:new Date('2026-09-22T08:00:00Z'),Reponse:reponse});assert.equal(candidates().length,0);}
 f.db.REPONSES.push({...f.response,ID_Reponse:'updated',Horodatage:new Date('2026-09-22T09:00:00Z'),Reponse:'Je ne sais pas encore'});assert.equal(candidates()[0].response.Reponse,'Je ne sais pas encore');
 f.member.Actif='Non';assert.equal(candidates().length,0);f.member.Actif='Oui';f.event.Actif='Non';assert.equal(candidates().length,0);f.event.Actif='Oui';
 f.db.REPONSES=[];assert.equal(candidates().length,0);
});
test('reminder deduplicates per event date, revised date permits a new reminder',()=>{
 const f=fixture();f.props.set('uc.mail.since',String(Date.now()+10000));
 f.c.traiterMails_(null,f.now);f.response.Reponse='Je ne sais pas encore';f.c.traiterMails_(null,f.now);assert.equal(f.sent.length,1);
 f.event.Date=new Date('2026-09-24T12:00:00Z');f.c.traiterMails_(null,new Date('2026-09-23T10:00:00Z'));assert.equal(f.sent.length,2);
});
test('Paris calendar date, midnight and DST transitions define the previous day and sending window',()=>{
 const f=fixture();
 for(const [date,next] of [['2026-03-28T23:30:00Z','2026-03-30'],['2026-10-24T22:30:00Z','2026-10-26'],['2026-12-31T23:30:00Z','2027-01-02']])assert.equal(f.c.mailTomorrow_(new Date(date)),next);
 const candidates=iso=>f.c.mailCandidates_([f.response],[f.event],[f.member],Date.now()+10000,new Date(iso),null);
 assert.equal(candidates('2026-09-22T06:59:00Z').length,0);assert.equal(candidates('2026-09-22T07:00:00Z').length,1);assert.equal(candidates('2026-09-22T19:00:00Z').length,0);
});
test('missing or unsafe addresses are journaled; receipt excludes private reasons and credentials',()=>{
 const f=fixture();for(const email of ['', 'a@example.test,b@example.test','a@example.test\nBcc:b@example.test'])assert.equal(f.c.mailAddressValid_(email),false);
 f.member.Email='';f.response.Cle_Personne=f.c.memberKey_(f.member);f.c.traiterMails_(['r1'],f.now);assert.equal(f.sent.length,0);assert.equal(f.db.JOURNAL_MAILS[0].Etat,'SANS_EMAIL');
 const content=f.c.mailContent_({event:f.event,response:f.response,member:f.member,type:'CONFIRMATION'});
 for(const text of ['23/09/2026','19:00','Repas et aide','Soir','Référence : r1','https://script.google.com'])assert.ok(content.body.includes(text));
 assert.doesNotMatch(content.body,/PRIVATE_REASON|PRIVATE_COMMENT/);
});
test('a newer answer cancels an unsent stale confirmation',()=>{
 const f=fixture();f.quota(0);f.c.traiterMails_(['r1'],f.now);
 f.db.REPONSES.push({...f.response,ID_Reponse:'r2',Horodatage:new Date('2026-09-22T09:00:00Z'),Reponse:'Absent'});
 f.quota(10);f.c.traiterMails_(null,f.now);assert.equal(f.db.JOURNAL_MAILS[0].Etat,'ANNULE');assert.equal(f.sent.length,1);assert.match(f.sent[0].body,/Votre réponse : Absent/);
});
