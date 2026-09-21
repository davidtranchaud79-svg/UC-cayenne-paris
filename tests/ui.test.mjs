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
  return readFileSync(new URL(file,src),'utf8').replace(/<\?!= include\('([A-Za-z]+)'\); \?>/g,(_,name)=>readFileSync(new URL(name+'.html',src),'utf8')).replaceAll('<?= publicUrl ?>',publicUrl).replaceAll('<?= adminUrl ?>',publicUrl+'?page=admin');
}
function app(file, overrides={}) {
  config.profile={nom:'Exemple',prenom:'Camille',statut:'Sociétaire',cayenne:'Paris',email:'camille@example.test',telephone:''};
  config.responses=[];
  const calls=[],errors=[],queue=[];
  const console=new VirtualConsole();console.on('jsdomError',error=>errors.push(error));
  const dom=new JSDOM(render(file),{url:'https://preview.invalid/',runScripts:'dangerously',virtualConsole:console,beforeParse(window){
    window.HTMLElement.prototype.scrollIntoView=function(){};
    window.confirm=()=>true;
    window.google={script:{get run(){let success=()=>{},failure=()=>{};const runner=new Proxy({}, {get(_,method){
      if(method==='withSuccessHandler')return fn=>{success=fn;return runner;};
      if(method==='withFailureHandler')return fn=>{failure=fn;return runner;};
      return (...args)=>{calls.push({method,args});queue.push(()=>{try{
        if(overrides[method])success(overrides[method](...args));
        else if(method==='getPublicConfig'||method==='getBootstrapConfig')success(structuredClone(config));
        else if(method==='loginMember')success({token:'MEMBER_SESSION'});
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
