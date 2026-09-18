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
  const calls=[],errors=[],queue=[];
  const console=new VirtualConsole();console.on('jsdomError',error=>errors.push(error));
  const dom=new JSDOM(render(file),{url:'https://preview.invalid/',runScripts:'dangerously',virtualConsole:console,beforeParse(window){
    window.HTMLElement.prototype.scrollIntoView=function(){};
    window.google={script:{get run(){let success=()=>{},failure=()=>{};const runner=new Proxy({}, {get(_,method){
      if(method==='withSuccessHandler')return fn=>{success=fn;return runner;};
      if(method==='withFailureHandler')return fn=>{failure=fn;return runner;};
      return (...args)=>{calls.push({method,args});queue.push(()=>{try{
        if(overrides[method])success(overrides[method](...args));
        else if(method==='getPublicConfig'||method==='getBootstrapConfig')success(structuredClone(config));
        else if(method==='getDashboardData')success(structuredClone(dashboard));
        else if(method==='submitResponses')success({ok:true,saved:args[0].eventIds.length});
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
  flush();return {dom,doc,calls,flush,fill,submit,login};
}
function identity(a){a.fill('prenom','Camille');a.fill('nom','Exemple');a.fill('statut','Sociétaire','change');}

test('member screen starts, has no administration link, and exposes real calendar choices',()=>{
  const a=app('Public.html');assert.equal(a.doc.querySelectorAll('[name="eventIds"]').length,2);assert.ok(a.doc.getElementById('submitBtn').disabled);assert.equal(a.doc.querySelectorAll('a[href*="page=admin"]').length,0);assert.ok(a.doc.querySelector('img[alt="Écusson de la Cayenne de Paris"]'));a.dom.window.close();
});
test('filtering preserves hidden selections and sends absence reasons for all selected dates',()=>{
  const a=app('Public.html');identity(a);a.doc.querySelector('[value="evt-1"]').click();a.fill('eventSearch','novembre');assert.equal(a.doc.querySelectorAll('[name="eventIds"]').length,1);a.doc.getElementById('selectAll').click();a.doc.querySelector('[name="reponse"][value="Absent excusé"]').click();assert.equal(a.doc.getElementById('absenceBlock').hidden,false);a.doc.querySelector('[name="causes"][value="Travail"]').click();a.doc.querySelector('[name="causes"][value="Familiale"]').click();a.fill('precision','Un engagement familial');a.submit('presenceForm');a.flush();const sent=a.calls.find(c=>c.method==='submitResponses').args[0];assert.deepEqual([...sent.eventIds],['evt-1','evt-2']);assert.deepEqual([...sent.causes],['Travail','Familiale']);assert.equal(sent.source,'Réponse anticipée');assert.equal(a.doc.getElementById('successState').hidden,false);a.dom.window.close();
});
test('changing from absence to help removes hidden absence details and preserves overnight availability',()=>{
  const a=app('Public.html');identity(a);a.doc.getElementById('selectAll').click();a.doc.querySelector('[value="Absent excusé"]').click();a.doc.querySelector('[name="causes"][value="Travail"]').click();a.fill('precision','Should not be sent');a.doc.querySelector('[value="Disponible pour aider"]').click();assert.equal(a.doc.getElementById('absenceBlock').hidden,true);assert.equal(a.doc.getElementById('aidBlock').hidden,false);a.fill('heureDebutAide','22:00');a.fill('heureFinAide','01:00');a.submit('presenceForm');a.flush();const sent=a.calls.find(c=>c.method==='submitResponses').args[0];assert.deepEqual([...sent.causes],[]);assert.equal(sent.precision,'');assert.equal(sent.heureFinAide,'01:00');a.dom.window.close();
});
test('failed submission keeps inputs and selections for a retry',()=>{
  const a=app('Public.html',{submitResponses(){throw Error('Connexion interrompue');}});identity(a);a.doc.getElementById('selectAll').click();a.doc.querySelector('[value="Présent"]').click();a.submit('presenceForm');a.flush();assert.equal(a.doc.getElementById('prenom').value,'Camille');assert.equal(a.doc.querySelectorAll('[name="eventIds"]:checked').length,2);assert.equal(a.doc.getElementById('submitBtn').disabled,false);assert.match(a.doc.getElementById('publicNotice').textContent,/Connexion interrompue/);a.dom.window.close();
});
test('bureau shows no fabricated figures before authentication and clears data when locked',()=>{
  const a=app('Admin.html');assert.match(a.doc.getElementById('kpiRoot').textContent,/—/);assert.equal(a.calls.some(c=>c.method==='getDashboardData'),false);a.login();assert.equal(a.doc.getElementById('accessPanel').hidden,true);assert.match(a.doc.getElementById('membersRoot').textContent,/Camille Exemple/);a.doc.getElementById('lockSession').click();assert.equal(a.doc.getElementById('adminPin').value,'');assert.doesNotMatch(a.doc.getElementById('membersRoot').textContent,/Camille Exemple/);assert.ok(a.doc.getElementById('generateAll').disabled);a.dom.window.close();
});
test('bureau navigation, filters, model creation, and individual report generation keep their server contracts',()=>{
  const a=app('Admin.html');a.login();a.doc.querySelector('[data-screen="events"]').click();assert.ok(a.doc.getElementById('screen-events').classList.contains('active'));assert.equal(a.doc.getElementById('eventTitle').value,'Journées du patrimoine');a.fill('eventDate','2026-10-10');a.submit('eventForm');a.flush();const sent=a.calls.find(c=>c.method==='createEventFromTemplate');assert.equal(sent.args[0].date,'2026-10-10');assert.equal(sent.args[0].templateId,'tpl-1');assert.equal(sent.args[1],'LOCAL_TEST_VALUE');a.doc.querySelector('[data-screen="members"]').click();a.fill('memberSearch','introuvable');assert.match(a.doc.getElementById('membersRoot').textContent,/Aucun membre/);a.fill('memberSearch','Camille');assert.match(a.doc.getElementById('membersRoot').textContent,/Camille Exemple/);a.doc.querySelector('[data-screen="reports"]').click();a.doc.querySelector('[data-event-id="evt-1"]').click();a.flush();assert.equal(a.calls.find(c=>c.method==='generateEventSheet').args[0],'evt-1');assert.ok(a.doc.querySelector('.report-links a[href^="https://docs.google.com/spreadsheets/"]'));a.dom.window.close();
});
test('event titles from the Sheet remain escaped text',()=>{
  const hostile=structuredClone(config);hostile.events[0].title='<img src=x onerror="alert(1)">';const a=app('Public.html',{getPublicConfig:()=>hostile});assert.equal(a.doc.querySelectorAll('.event-choice img').length,0);assert.match(a.doc.getElementById('events').textContent,/<img src=x/);a.dom.window.close();
});

// A refresh and an event/report write can overlap on a slow connection.
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
