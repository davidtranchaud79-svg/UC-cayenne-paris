import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';

const src = new URL('../src/', import.meta.url);
const publicUrl = 'https://script.google.com/macros/s/TEST_FIXTURE/exec';
const events = [
  {id:'evt-1',date:'19/09/2026',title:'Journées du patrimoine',type:'JEP',start:'09:00',end:'18:00',place:'Paris',sheetName:'CR_JEP'},
  {id:'evt-2',date:'21/11/2026',title:'Fête de novembre',type:'Fête de novembre',start:'19:00',end:'23:00',place:'Paris',sheetName:'CR_FETE'}
];
const config = {activeYear:2026,statuses:['Sociétaire','Aspirant','Compagnon'],cayennes:['Paris','Autre'],responseTypes:['Présent','Absent excusé','Disponible pour aider'],causes:['Travail','Familiale'],events,eventTypes:['JEP','Fête de novembre'],eventTemplates:[{id:'tpl-1',name:'JEP',defaultTitle:'Journées du patrimoine',type:'JEP',cayenne:'Paris',start:'09:00',end:'18:00',place:'Paris'}],urls:{publicUrl,adminUrl:publicUrl+'?page=admin'}};
const dashboard = {year:2026,kpis:{events:2,members:1,presents:1,excused:0,noResponse:1,aids:1},events:events.map(e=>({...e,presents:1,excused:0,noResponse:0,aids:1})),members:[{nom:'Exemple',prenom:'Camille',statut:'Sociétaire',cayenne:'Paris',presents:1,excused:0,noResponse:1,aids:1,presenceRate:0.5}],causes:[]};
function render(file) {
  return readFileSync(new URL(file,src),'utf8').replace(/<\?!= include\('([A-Za-z]+)'\); \?>/g,(_,name)=>readFileSync(new URL(name+'.html',src),'utf8')).replaceAll('<?= appVersion ?>','2026.09.23.2').replaceAll('<?= publicUrl ?>',publicUrl).replaceAll('<?= adminUrl ?>',publicUrl+'?page=admin');
}
function app(file, overrides={}) {
  config.profile={nom:'Exemple',prenom:'Camille',statut:'Sociétaire',cayenne:'Paris',email:'camille@example.test',telephone:''};
  config.responses=[];
  config.notifications={enabled:true};
  const calls=[],errors=[],queue=[];
  const console=new VirtualConsole();console.on('jsdomError',error=>errors.push(error));
  const dom=new JSDOM(render(file),{url:'https://preview.invalid/',runScripts:'dangerously',virtualConsole:console,beforeParse(window){
    for(const [key,value] of Object.entries(overrides.localStorage||{}))window.localStorage.setItem(key,value);
    for(const [key,value] of Object.entries(overrides.sessionStorage||{}))window.sessionStorage.setItem(key,value);
    if(overrides.blockStorage)Object.defineProperty(window,'localStorage',{get(){throw Error('Storage blocked');}});
    window.HTMLElement.prototype.scrollIntoView=function(){};
    window.confirm=()=>true;
    window.google={script:{get run(){let success=()=>{},failure=()=>{};const runner=new Proxy({}, {get(_,method){
      if(method==='withSuccessHandler')return fn=>{success=fn;return runner;};
      if(method==='withFailureHandler')return fn=>{failure=fn;return runner;};
      return (...args)=>{calls.push({method,args});queue.push(()=>{try{
        if(overrides[method])success(overrides[method](...args));
        else if(method==='getPublicConfig'||method==='getBootstrapConfig')success(structuredClone(config));
        else if(method==='loginMember')success({token:'MEMBER_SESSION',remembered:args[1]===true});
        else if(method==='loginBureau')success({token:'BUREAU_SESSION'});
        else if(method==='logoutAccess')success({ok:true});
        else if(method==='listMemberAccess')success([{...config.profile,key:config.profile.email,active:true,hasCode:false}]);
        else if(method==='manageMemberCode'||method==='createMemberAccess')success({profile:config.profile,code:'1234-5678-90AB-CDEF'});
        else if(method==='changeBureauCode')success({ok:true});
        else if(method==='getDashboardData')success(structuredClone(dashboard));
        else if(method==='submitResponses')success({ok:true,saved:args[0].answers.length});
        else if(method==='createEventFromTemplate')success({ok:true,message:'Événement créé.'});
        else if(method==='generateEventSheet')success({sheetName:'CR_JEP',sheetUrl:'https://docs.google.com/spreadsheets/d/demo/edit#gid=1'});
        else if(method==='generateAllEventSheets')success([{sheetName:'CR_JEP',sheetUrl:'https://docs.google.com/spreadsheets/d/demo/edit#gid=1'}]);
        else throw Error('Unexpected method '+method);
      }catch(error){failure(error);}});};
    }});return runner;}}};
  }});
  const doc=dom.window.document;
  function flush(){while(queue.length)queue.shift()();assert.equal(errors.length,0,errors.map(e=>e.message).join('\n'));}
  function fill(id,value,event='input'){const node=doc.getElementById(id);node.value=value;node.dispatchEvent(new dom.window.Event(event,{bubbles:true}));}
  function submit(id){const node=doc.getElementById(id);assert.equal(node.checkValidity(),true,'Form should be valid');node.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));}
  function login(){fill('adminPin','LOCAL_TEST_VALUE');submit('accessForm');flush();}
  function memberLogin(){fill('memberCode','1234-5678-90AB-CDEF');submit('memberLoginForm');flush();}
  flush();if(file==='Public.html'&&!overrides.startLocked)memberLogin();
  return {dom,doc,calls,flush,fill,submit,login,memberLogin};
}
function identity(a){assert.equal(a.doc.getElementById('prenom').value,'Camille');assert.ok(a.doc.getElementById('prenom').disabled);}

test('bureau mail status shows pending deliveries and clears at logout',()=>{
 const a=app('Admin.html',{getDashboardData:()=>({...structuredClone(dashboard),notifications:{enabled:true,waiting:2,review:1,lastRun:'2026-09-22T10:00:00Z',error:''}})});
 a.login();const status=a.doc.getElementById('notificationStatus');assert.match(status.textContent,/activés/);assert.match(status.textContent,/2 envoi/);assert.match(status.textContent,/1 envoi/);
 a.doc.getElementById('lockSession').click();a.flush();assert.match(status.textContent,/Connectez-vous/);assert.doesNotMatch(status.textContent,/2 envoi/);
});

test('bureau attendance preserves drafts after failure and clears personal data when locked',()=>{
 const a=app('Admin.html',{getAttendance:()=>({eventId:'evt-1',members:[{key:'camille@example.test',name:'Camille Exemple',announced:'Je ne sais pas encore',actual:'Non pointé',version:''}]}),saveAttendance:()=>{throw Error('Connexion interrompue');}});
 a.login();a.fill('attendanceEvent','evt-1','change');a.doc.getElementById('loadAttendance').click();a.flush();
 const select=a.doc.querySelector('[data-attendance-index]');assert.equal(select.value,'Non pointé');select.value='Présent';
 a.doc.getElementById('saveAttendance').click();a.flush();
 const call=a.calls.find(c=>c.method==='saveAttendance');assert.equal(call.args[1],'BUREAU_SESSION');assert.equal(call.args[0].changes[0].actual,'Présent');
 assert.equal(select.value,'Présent');assert.equal(a.doc.getElementById('saveAttendance').disabled,false);
 a.doc.getElementById('lockSession').click();a.flush();assert.equal(a.doc.getElementById('attendanceRoster').textContent,'');assert.equal(a.doc.getElementById('attendanceSummary').textContent,'');
 a.dom.window.close();
});

function answer(a,id,value){a.doc.querySelector('[data-event="'+id+'"] [data-field="reponse"][value="'+value+'"]').click();}

test('upcoming unanswered events come first, filters retain drafts, and server receipt time appears after saving',()=>{
 const data={...structuredClone(config),today:'2026-09-23',events:[{...events[0],date:'2026-09-19',version:'V1'},{...events[1],date:'2026-11-21',version:'V2'}],responses:[]};
 const a=app('Public.html',{getPublicConfig:()=>data,submitResponses:payload=>({ok:true,receipts:payload.answers.map(r=>({eventId:r.eventId,savedAt:'2026-09-23T12:34:00Z'}))})});
 assert.equal(a.doc.querySelector('[data-event]').dataset.event,'evt-2');
 answer(a,'evt-1','Présent');a.fill('eventView','upcoming','change');answer(a,'evt-2','Je ne sais pas encore');
 a.doc.getElementById('saveAllTop').click();a.flush();assert.equal(a.calls.find(c=>c.method==='submitResponses').args[0].answers.length,2);
 assert.match(a.doc.querySelector('[data-event="evt-2"] .save-indicator').textContent,/23\/09.*14:34/);
 assert.equal(a.calls.find(c=>c.method==='submitResponses').args[0].answers[0].eventVersion,'V1');
 a.fill('eventView','unanswered','change');assert.equal(a.doc.querySelectorAll('[data-event]').length,0);a.dom.window.close();
});

test('bureau edits or cancels an existing event with its ID, version and selected audience',()=>{
 const event={...events[0],date:'2026-09-19',version:'ORIGINAL',statuses:['Compagnon'],cayennes:['Paris'],active:true,modalites:'Standard'};
 const a=app('Admin.html',{getDashboardData:()=>({...structuredClone(dashboard),calendar:[event]}),updateEvent:()=>({ok:true,message:'Mis à jour'})});
 a.login();a.doc.querySelector('[data-edit-calendar]').click();
 assert.equal(a.doc.getElementById('eventDate').value,'2026-09-19');assert.equal(a.doc.getElementById('templateSelect').disabled,true);
 assert.equal(a.doc.querySelector('[data-audience="statuses"][value="Compagnon"]').checked,true);
 a.fill('eventDate','2027-02-04');a.fill('eventTitle','Réunion reportée');a.submit('eventForm');a.flush();
 const call=a.calls.find(c=>c.method==='updateEvent');assert.equal(call.args[0].id,'evt-1');assert.equal(call.args[0].version,'ORIGINAL');assert.equal(call.args[0].date,'2027-02-04');assert.equal(call.args[0].statuses[0],'Compagnon');
 assert.equal(a.calls.filter(c=>c.method==='createEventFromTemplate').length,0);
 a.doc.querySelector('[data-toggle-calendar]').click();a.flush();assert.equal(a.calls.filter(c=>c.method==='updateEvent').at(-1).args[0].active,false);
 a.dom.window.close();
});

test('bureau corrects email without replacing code and discards private mail/reason displays on logout',()=>{
 const a=app('Admin.html',{
   updateMemberProfile:()=>({ok:true,message:'Adresse corrigée'}),
   listMailDeliveries:()=>[{id:'CONF1',name:'Camille Exemple',title:'Réunion des jeunes',email:'PRIVATE_EMAIL',type:'CONFIRMATION',state:'SANS_EMAIL',detail:'Adresse à corriger'}],
   getEventConfidentialDetails:()=>[{name:'Camille Exemple',response:'Absent excusé',causes:'PRIVATE_REASON',precision:'PRIVATE_DETAIL',comment:'PRIVATE_COMMENT'}]
 });
 a.login();a.doc.querySelector('[data-email-member]').click();a.fill('memberEmailValue','nouvelle@example.test');a.submit('memberEmailForm');a.flush();
 const call=a.calls.find(c=>c.method==='updateMemberProfile');assert.equal(call.args[0].previousEmail,'camille@example.test');assert.equal(call.args[0].email,'nouvelle@example.test');assert.equal(call.args[1],'BUREAU_SESSION');
 assert.equal(a.calls.filter(c=>c.method==='manageMemberCode').length,0);
 a.doc.getElementById('loadMailLog').click();a.flush();assert.match(a.doc.getElementById('mailDeliveries').textContent,/Réunion des jeunes.*Confirmation.*Adresse à corriger/);
 a.fill('mailSearch','introuvable');assert.doesNotMatch(a.doc.getElementById('mailDeliveries').textContent,/PRIVATE_EMAIL/);
 a.doc.querySelector('[data-confidential-event]').click();a.flush();assert.match(a.doc.getElementById('confidentialDetails').textContent,/PRIVATE_REASON/);
 a.doc.getElementById('lockSession').click();a.flush();assert.doesNotMatch(a.doc.body.textContent,/PRIVATE_EMAIL|PRIVATE_REASON|PRIVATE_DETAIL|PRIVATE_COMMENT/);assert.equal(a.doc.getElementById('memberEmailForm').hidden,true);
 a.dom.window.close();
});

test('a late confidential response is discarded after closing the panel or locking the bureau',()=>{
 const a=app('Admin.html',{getEventConfidentialDetails:()=>[{name:'Personne',precision:'PRIVATE_LATE'}]});a.login();
 a.doc.querySelector('[data-confidential-event]').click();a.doc.getElementById('closeConfidential').click();a.flush();
 assert.equal(a.doc.getElementById('confidentialPanel').hidden,true);assert.doesNotMatch(a.doc.body.textContent,/PRIVATE_LATE/);
 a.doc.querySelector('[data-confidential-event]').click();a.doc.getElementById('lockSession').click();a.flush();assert.doesNotMatch(a.doc.body.textContent,/PRIVATE_LATE/);a.dom.window.close();
});

test('either general save button records every changed choice, including the youth meeting hidden by a filter',()=>{
 for(const buttonId of ['saveAllTop','submitBtn']){
   const a=app('Public.html',{getPublicConfig:()=>({...structuredClone(config),events:events.map((e,i)=>i?e:{...e,title:'Réunion des jeunes'})})});
   answer(a,'evt-1','Présent');a.fill('eventSearch','novembre');answer(a,'evt-2','Je ne sais pas encore');
   assert.match(a.doc.getElementById('pendingResponses').textContent,/Réunion des jeunes/);
   assert.equal(a.doc.getElementById('saveAllTop').textContent,a.doc.getElementById('submitBtn').textContent);
   a.doc.getElementById(buttonId).click();a.doc.getElementById(buttonId==='saveAllTop'?'submitBtn':'saveAllTop').click();a.flush();
   const calls=a.calls.filter(c=>c.method==='submitResponses');assert.equal(calls.length,1);
   assert.deepEqual(Array.from(calls[0].args[0].answers,a=>[a.eventId,a.reponse]),[['evt-1','Présent'],['evt-2','Je ne sais pas encore']]);
   assert.equal(a.doc.getElementById('submitBtn').disabled,true);assert.equal(a.doc.getElementById('saveAllTop').disabled,true);
   assert.equal(a.doc.getElementById('pendingResponses').hidden,true);
   assert.match(a.doc.getElementById('saveFeedback').textContent,/Aucune autre validation/);
   assert.match(a.doc.getElementById('memberHistory').textContent,/Réunion des jeunes/);a.dom.window.close();
 }
});

test('individual saving names its scope and warns about remaining choices before a single general save',()=>{
 const a=app('Public.html');answer(a,'evt-1','Présent');answer(a,'evt-2','Absent');
 assert.match(a.doc.querySelector('[data-save-event]').textContent,/cet événement uniquement/);
 a.doc.querySelector('[data-save-event="evt-1"]').click();a.flush();
 assert.match(a.doc.getElementById('saveFeedback').textContent,/1 autre réponse reste à enregistrer/);
 assert.ok(a.doc.getElementById('saveFeedback').classList.contains('warning'));
 assert.match(a.doc.getElementById('pendingResponses').textContent,/Fête de novembre/);
 assert.match(a.doc.getElementById('selectionSummary').textContent,/1 réponse à enregistrer/);
 a.doc.getElementById('saveAllTop').click();a.flush();
 const calls=a.calls.filter(c=>c.method==='submitResponses');assert.equal(calls.length,2);
 assert.deepEqual(Array.from(calls[1].args[0].answers,a=>a.eventId),['evt-2']);
 assert.match(a.doc.querySelector('[data-event="evt-1"] .save-indicator').textContent,/Enregistré : Présent/);
 assert.equal(a.doc.getElementById('saveAllTop').disabled,true);a.dom.window.close();
});

test('general save reveals an incomplete hidden event and saves nothing until it is corrected',()=>{
 const a=app('Public.html');answer(a,'evt-1','Absent excusé');detail(a,'evt-1','cause','Autres');
 a.fill('eventSearch','novembre');answer(a,'evt-2','Présent');a.doc.getElementById('saveAllTop').click();a.flush();
 assert.equal(a.calls.some(c=>c.method==='submitResponses'),false);assert.equal(a.doc.getElementById('eventSearch').value,'');
 assert.equal(a.doc.activeElement.dataset.field,'precision');assert.match(a.doc.getElementById('saveFeedback').textContent,/non effectué/);
 detail(a,'evt-1','precision','Déplacement personnel');a.doc.getElementById('saveAllTop').click();a.flush();
 assert.equal(a.calls.find(c=>c.method==='submitResponses').args[0].answers.length,2);a.dom.window.close();
});

test('email guidance explains the action, address and delay, and does not promise disabled confirmations',()=>{
 const a=app('Public.html');const help=a.doc.getElementById('emailHelp').textContent;
 assert.match(help,/vous recevrez un email de confirmation par événement enregistré/);assert.match(help,/camille@example.test/);
 assert.match(help,/différé/);a.dom.window.close();
 const b=app('Public.html',{getPublicConfig:()=>({...structuredClone(config),notifications:{enabled:false}})});
 assert.match(b.doc.getElementById('emailHelp').textContent,/pas encore activés/);
 assert.doesNotMatch(b.doc.getElementById('emailHelp').textContent,/vous recevrez/);b.dom.window.close();
 const c=app('Public.html',{getPublicConfig:()=>({...structuredClone(config),profile:{...config.profile,email:''}})});
 assert.match(c.doc.getElementById('emailHelp').textContent,/compléter votre adresse/);c.dom.window.close();
});

test('first login remembers only a session token and a new visit restores the member without asking for the code',()=>{
 const a=app('Public.html');const storage=a.dom.window.localStorage;
 assert.equal(a.calls.find(c=>c.method==='loginMember').args[1],true);
 assert.equal(storage.getItem('uc.member.remembered'),'MEMBER_SESSION');
 assert.equal(JSON.stringify({...storage}).includes('1234-5678-90AB-CDEF'),false);
 assert.equal(a.doc.getElementById('memberCode').value,'');assert.match(a.doc.getElementById('memberConnection').textContent,/mémorisée/);
 const saved={...storage};a.dom.window.close();
 const b=app('Public.html',{startLocked:true,localStorage:saved});
 assert.equal(b.calls.some(c=>c.method==='loginMember'),false);assert.equal(b.calls[0].method,'getPublicConfig');
 assert.equal(b.calls[0].args[0],'MEMBER_SESSION');assert.equal(b.doc.getElementById('memberLogin').hidden,true);
 b.doc.getElementById('memberLogout').click();b.flush();
 assert.equal(b.dom.window.localStorage.getItem('uc.member.remembered'),null);
 assert.equal(b.dom.window.sessionStorage.getItem('uc.member.session'),null);
 assert.equal(b.doc.getElementById('memberIdentity').textContent,'');
 assert.equal(b.doc.getElementById('emailHelp').textContent,'');assert.equal(b.calls.at(-1).method,'logoutAccess');b.dom.window.close();
});

test('remembering is optional and blocked device storage is explained without blocking login',()=>{
 const a=app('Public.html',{startLocked:true});a.doc.getElementById('rememberMember').checked=false;a.memberLogin();
 assert.equal(a.calls.find(c=>c.method==='loginMember').args[1],false);
 assert.equal(a.dom.window.localStorage.getItem('uc.member.remembered'),null);
 assert.equal(a.dom.window.sessionStorage.getItem('uc.member.session'),'MEMBER_SESSION');a.dom.window.close();
 const b=app('Public.html',{blockStorage:true});assert.equal(b.doc.getElementById('memberLogin').hidden,true);
 assert.match(b.doc.getElementById('memberConnection').textContent,/empêche la mémorisation/);b.dom.window.close();
});

test('a rejected remembered session is removed, while a temporary connection error preserves it for retry',()=>{
 for(const expired of [true,false]){
   const a=app('Public.html',{startLocked:true,localStorage:{'uc.member.remembered':'OLD_SESSION'},getPublicConfig:()=>{throw Error(expired?'SESSION_EXPIRED: Reconnectez-vous.':'Réseau indisponible');}});
   assert.equal(a.dom.window.localStorage.getItem('uc.member.remembered'),expired?null:'OLD_SESSION');
   assert.equal(a.doc.getElementById('memberLogin').hidden,false);assert.equal(a.doc.getElementById('memberLoginBtn').disabled,false);
   assert.equal(a.calls.some(c=>c.method==='loginMember'),false);a.dom.window.close();
 }
});

test('individual validation saves only its event, keeps other drafts, and ignores their incomplete fields',()=>{
 const a=app('Public.html');answer(a,'evt-1','Présent');answer(a,'evt-2','Absent excusé');
 a.doc.querySelector('[data-save-event="evt-1"]').click();a.flush();
 const sent=a.calls.filter(c=>c.method==='submitResponses');assert.equal(sent.length,1);assert.equal(sent[0].args[0].answers.length,1);assert.equal(sent[0].args[0].answers[0].eventId,'evt-1');
 assert.ok(a.doc.querySelector('[data-save-event="evt-1"]').disabled);assert.equal(a.doc.querySelector('[data-save-event="evt-2"]').disabled,false);
 assert.match(a.doc.querySelector('[data-event="evt-2"] .save-indicator').textContent,/à enregistrer/);
 a.doc.querySelector('[data-save-event="evt-2"]').click();a.flush();assert.equal(a.calls.filter(c=>c.method==='submitResponses').length,1);
 detail(a,'evt-2','cause','Travail');a.doc.querySelector('[data-save-event="evt-2"]').click();a.flush();
 assert.equal(a.calls.filter(c=>c.method==='submitResponses').length,2);assert.equal(a.doc.querySelector('[data-save-event="evt-2"]').disabled,true);a.dom.window.close();
});

test('individual retry keeps its ID even after another draft is changed; saving another event uses a different ID',()=>{
 let fail=true;const a=app('Public.html',{submitResponses:()=>{if(fail)throw Error('Réseau');return {ok:true};}});
 answer(a,'evt-1','Présent');a.doc.querySelector('[data-save-event="evt-1"]').click();a.flush();
 answer(a,'evt-2','Absent');fail=false;a.doc.querySelector('[data-save-event="evt-1"]').click();a.flush();
 a.doc.querySelector('[data-save-event="evt-2"]').click();a.flush();
 const calls=a.calls.filter(c=>c.method==='submitResponses');assert.equal(calls.length,3);assert.equal(calls[0].args[0].requestId,calls[1].args[0].requestId);assert.notEqual(calls[1].args[0].requestId,calls[2].args[0].requestId);a.dom.window.close();
});

test('returning to a previous choice after a successful edit never reuses an uncertain old request',()=>{
 let fail=true;const a=app('Public.html',{submitResponses:()=>{if(fail)throw Error('Réponse du serveur perdue');return {ok:true};}});
 answer(a,'evt-1','Présent');a.doc.getElementById('saveAllTop').click();a.flush();
 fail=false;answer(a,'evt-1','Absent');a.doc.getElementById('saveAllTop').click();a.flush();
 answer(a,'evt-1','Présent');a.doc.getElementById('saveAllTop').click();a.flush();
 const calls=a.calls.filter(c=>c.method==='submitResponses');assert.equal(calls.length,3);
 assert.notEqual(calls[2].args[0].requestId,calls[0].args[0].requestId);a.dom.window.close();
});
function detail(a,id,key,value){const n=a.doc.querySelector('[data-event="'+id+'"] [data-field="'+key+'"]');n.value=value;n.dispatchEvent(new a.dom.window.Event('change',{bubbles:true}));}
test('one independent response per event, no admin link, and no fabricated initial answer',()=>{
 const a=app('Public.html');assert.equal(a.doc.querySelectorAll('[data-event]').length,2);assert.equal(a.doc.querySelectorAll('[data-field="reponse"]:checked').length,0);assert.ok(a.doc.getElementById('submitBtn').disabled);assert.equal(a.doc.querySelectorAll('a[href*="page=admin"]').length,0);a.dom.window.close();
});
test('different answers survive filtering and are sent together without member identity',()=>{
 const a=app('Public.html');answer(a,'evt-1','Absent excusé');detail(a,'evt-1','cause','Travail');a.fill('eventSearch','novembre');answer(a,'evt-2','Je ne sais pas encore');a.submit('presenceForm');a.flush();const sent=a.calls.find(c=>c.method==='submitResponses');assert.equal(sent.args[0].answers.length,2);assert.equal(sent.args[0].answers[0].reponse,'Absent excusé');assert.equal(sent.args[0].answers[1].reponse,'Je ne sais pas encore');assert.equal(sent.args[1],'MEMBER_SESSION');assert.equal('nom' in sent.args[0],false);assert.equal(a.doc.getElementById('submitBtn').disabled,true);a.dom.window.close();
});
test('changing an excuse to help removes stale reasons and retains overnight hours',()=>{
 const a=app('Public.html');answer(a,'evt-1','Absent excusé');detail(a,'evt-1','cause','Travail');answer(a,'evt-1','Présent');a.doc.querySelector('[data-event="evt-1"] [data-field="aideDisponible"]').click();detail(a,'evt-1','heureDebutAide','22:00');detail(a,'evt-1','heureFinAide','01:00');a.submit('presenceForm');a.flush();const row=a.calls.find(c=>c.method==='submitResponses').args[0].answers[0];assert.equal(row.causes.length,0);assert.equal(row.aideDisponible,true);assert.equal(row.heureFinAide,'01:00');a.dom.window.close();
});
test('failed batch preserves drafts and reuses the request ID on retry',()=>{
 const a=app('Public.html',{submitResponses:()=>{throw Error('Réseau indisponible');}});answer(a,'evt-1','Présent');a.submit('presenceForm');a.flush();assert.equal(a.doc.querySelector('[data-event="evt-1"] [data-field="reponse"]:checked').value,'Présent');a.submit('presenceForm');a.flush();const calls=a.calls.filter(c=>c.method==='submitResponses');assert.equal(calls[0].args[0].requestId,calls[1].args[0].requestId);assert.match(a.doc.getElementById('publicNotice').textContent,/Réseau/);a.dom.window.close();
});
test('other reason requires text even when its event is filtered out',()=>{
 const a=app('Public.html');answer(a,'evt-1','Absent excusé');detail(a,'evt-1','cause','Autres');a.fill('eventSearch','novembre');a.submit('presenceForm');a.flush();assert.equal(a.calls.some(c=>c.method==='submitResponses'),false);assert.match(a.doc.getElementById('publicNotice').textContent,/précision/);a.dom.window.close();
});
test('bureau shows no fabricated figures before authentication and clears data when locked',()=>{
  const a=app('Admin.html');assert.match(a.doc.getElementById('kpiRoot').textContent,/—/);assert.equal(a.calls.some(c=>c.method==='getDashboardData'),false);a.login();assert.equal(a.doc.getElementById('accessPanel').hidden,true);assert.match(a.doc.getElementById('membersRoot').textContent,/Camille Exemple/);a.doc.getElementById('lockSession').click();assert.equal(a.doc.getElementById('adminPin').value,'');assert.doesNotMatch(a.doc.getElementById('membersRoot').textContent,/Camille Exemple/);assert.ok(a.doc.getElementById('generateAll').disabled);a.dom.window.close();
});
test('bureau navigation, filters, model creation, and individual report generation keep their server contracts',()=>{
  const a=app('Admin.html');a.login();a.doc.querySelector('[data-screen="events"]').click();assert.ok(a.doc.getElementById('screen-events').classList.contains('active'));assert.equal(a.doc.getElementById('eventTitle').value,'Journées du patrimoine');a.fill('eventDate','2026-10-10');a.submit('eventForm');a.flush();const sent=a.calls.find(c=>c.method==='createEventFromTemplate');assert.equal(sent.args[0].date,'2026-10-10');assert.equal(sent.args[0].templateId,'tpl-1');assert.equal(sent.args[1],'BUREAU_SESSION');a.doc.querySelector('[data-screen="members"]').click();a.fill('memberSearch','introuvable');assert.match(a.doc.getElementById('membersRoot').textContent,/Aucun membre/);a.fill('memberSearch','Camille');assert.match(a.doc.getElementById('membersRoot').textContent,/Camille Exemple/);a.doc.querySelector('[data-screen="reports"]').click();a.doc.querySelector('[data-event-id="evt-1"]').click();a.flush();assert.equal(a.calls.find(c=>c.method==='generateEventSheet').args[0],'evt-1');assert.ok(a.doc.querySelector('.report-links a[href^="https://docs.google.com/spreadsheets/"]'));a.dom.window.close();
});
test('event titles from the Sheet remain escaped text',()=>{
  const hostile=structuredClone(config);hostile.events[0].title='<img src=x onerror="alert(1)">';const a=app('Public.html',{getPublicConfig:()=>hostile});assert.equal(a.doc.querySelectorAll('.event-answer img').length,0);assert.match(a.doc.getElementById('events').textContent,/<img src=x/);a.dom.window.close();
});

// A refresh and an event/report write can overlap on a slow connection.
test('member login protects the initial screen and logout discards late responses and personal information',()=>{
  const a=app('Public.html',{startLocked:true});
  assert.equal(a.calls.length,0);assert.equal(a.doc.getElementById('formContent').hidden,true);
  a.memberLogin();assert.match(a.doc.getElementById('memberWelcome').textContent,/Camille/);
  a.doc.getElementById('memberRefresh').click();a.doc.getElementById('memberLogout').click();a.flush();
  assert.equal(a.doc.getElementById('memberLogin').hidden,false);assert.equal(a.doc.getElementById('memberOverview').hidden,true);
  assert.equal(a.doc.getElementById('memberIdentity').textContent,'');assert.equal(a.doc.getElementById('events').textContent,'');
  assert.equal(a.calls.at(-1).method,'logoutAccess');a.dom.window.close();
});
test('bureau issues a code without exposing it after locking, and uses only its session for member management',()=>{
  const a=app('Admin.html');a.login();a.doc.querySelector('[data-access-action="issue"]').click();a.flush();
  assert.equal(a.calls.find(c=>c.method==='manageMemberCode').args[2],'BUREAU_SESSION');
  assert.equal(a.doc.getElementById('issuedCodePanel').hidden,false);
  a.doc.getElementById('lockSession').click();a.flush();
  assert.equal(a.doc.getElementById('issuedCode').value,'');assert.equal(a.doc.getElementById('memberAccessList').textContent,'');
  a.dom.window.close();
});
test('saved answers load under each event and can change from undecided to present',()=>{
 const a=app('Public.html',{getPublicConfig:()=>({...config,responses:[{eventId:'evt-1',date:'19/09/2026',title:'JEP',response:'Je ne sais pas encore',causes:[]}]})});
 assert.equal(a.doc.querySelector('[data-event="evt-1"] [data-field="reponse"]:checked').value,'Je ne sais pas encore');a.doc.querySelector('[data-edit-event]').click();answer(a,'evt-1','Présent');a.submit('presenceForm');a.flush();assert.equal(a.calls.find(c=>c.method==='submitResponses').args[0].answers[0].reponse,'Présent');assert.match(a.doc.getElementById('memberSummary').textContent,/1 présence/);a.dom.window.close();
});
test('meal and reception choices are independent and retained after save',()=>{
 const a=app('Public.html',{getPublicConfig:()=>({...config,events:config.events.map((e,i)=>({...e,modalites:i?'Réception':'Repas et aide'}))})});
 answer(a,'evt-1','Présent');detail(a,'evt-1','participation','Aide seulement (sans repas)');answer(a,'evt-2','Présent');a.doc.querySelectorAll('[data-event="evt-2"] [data-field="creneaux"]').forEach(n=>n.click());a.submit('presenceForm');a.flush();const rows=a.calls.find(c=>c.method==='submitResponses').args[0].answers;assert.equal(rows[0].aideDisponible,true);assert.equal(rows[0].participation,'Aide seulement (sans repas)');assert.equal(rows[1].creneaux.length,2);assert.match(a.doc.getElementById('memberHistory').textContent,/Matin · Soir/);a.dom.window.close();
});
test('refreshing does not strand an in-flight report and locking ignores its late response',()=>{
  const a=app('Admin.html');a.login();
  a.doc.querySelector('[data-event-id="evt-1"]').click();
  a.doc.getElementById('refreshDashboard').click();a.flush();
  assert.ok(a.doc.querySelector('.report-links a'));
  assert.equal(a.doc.querySelector('[data-event-id="evt-1"]').disabled,false);
  a.doc.getElementById('generateAll').click();a.doc.getElementById('lockSession').click();a.flush();
  assert.equal(a.doc.getElementById('accessPanel').hidden,false);
  assert.equal(a.doc.querySelector('.report-links a'),null);
  assert.equal(a.doc.getElementById('generateAll').disabled,true);
  a.dom.window.close();
});
