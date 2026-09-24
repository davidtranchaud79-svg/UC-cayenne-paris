import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {randomUUID,createHash} from 'node:crypto';

function fixture(){
  const props=new Map([['uc.participation.schema','2']]),cache=new Map(),sheets=new Map(),writes=[],sent=[];
  let locked=false,failWrite=null;
  function makeSheet(name,grid=[]){
    const sheet={grid,getName:()=>name,getSheetId:()=>Array.from(sheets.keys()).indexOf(name)+1,
      getLastRow:()=>grid.length,getLastColumn:()=>Math.max(1,...grid.map(r=>r.length)),getMaxColumns:()=>50,getMaxRows:()=>1000,
      insertColumnsAfter(){},insertRowsAfter(){},setFrozenRows(){},setHiddenGridlines(){},autoResizeColumns(){},setConditionalFormatRules(){},
      clear(){grid.length=0;},clearContents(){grid.length=0;},getRange(row,col=1,n=1,m=1){
        if(typeof row==='string'){
          const match=row.match(/^([A-Z]+)(\d+)(?::([A-Z]+)(\d+))?$/);
          const number=s=>[...s].reduce((v,c)=>v*26+c.charCodeAt(0)-64,0);
          col=number(match[1]);row=Number(match[2]);n=match[4]?Number(match[4])-row+1:1;m=match[3]?number(match[3])-col+1:1;
        }
        const range={getValues:()=>Array.from({length:n},(_,i)=>Array.from({length:m},(_,j)=>grid[row-1+i]?.[col-1+j]??'')),
          getFormulas:()=>range.getValues().map(r=>r.map(v=>typeof v==='string'&&v.startsWith('=')?v:'')),
          setValues(values){
            assert.equal(values.length,n);assert.ok(values.every(r=>r.length===m));
            if(failWrite?.({name,row,col,values}))throw Error('Interrupted write');
            writes.push({name,row,col,values:structuredClone(values)});
            values.forEach((r,i)=>r.forEach((v,j)=>{grid[row-1+i]??=[];grid[row-1+i][col-1+j]=v;}));return range;
          },setValue:v=>(n===1&&m===1?range.setValues([[v]]):sheet.getRange(row,col,1,1).setValue(v)),clearContent:()=>range.setValues(Array.from({length:n},()=>Array(m).fill('')))};
        for(const f of ['merge','setFontWeight','setFontColor','setBackground','setFontSize','setNumberFormat'])range[f]=()=>range;
        return range;
      }
    };sheets.set(name,sheet);return sheet;
  }
  const ss={getSheetByName:name=>sheets.get(name),getSheets:()=>Array.from(sheets.values()),insertSheet:makeSheet,getUrl:()=> 'https://docs.google.com/spreadsheets/d/TEST/edit'};
  const c=vm.createContext({console,Date,Set,Map,JSON,
    PropertiesService:{getScriptProperties:()=>({getProperties:()=>Object.fromEntries(props),getProperty:k=>props.get(k)||null,setProperty:(k,v)=>props.set(k,v),deleteProperty:k=>props.delete(k)})},
    CacheService:{getScriptCache:()=>({get:k=>cache.get(k)||null,put:(k,v)=>cache.set(k,v),remove:k=>cache.delete(k)})},
    LockService:{getScriptLock:()=>({waitLock(){assert.equal(locked,false);locked=true;},releaseLock(){locked=false;}})},
    Utilities:{getUuid:randomUUID,computeDigest:(_,s)=>Array.from(createHash('sha256').update(s).digest()),DigestAlgorithm:{SHA_256:'sha256'},Charset:{UTF_8:'utf8'},formatDate:(d,z,p)=>{const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:z,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(d).map(p=>[p.type,p.value]));return p.replace(/yyyy|MM|dd|HH|mm/g,k=>parts[{yyyy:'year',MM:'month',dd:'day',HH:'hour',mm:'minute'}[k]]);}},
    Session:{getScriptTimeZone:()=> 'Europe/Paris'},SpreadsheetApp:{flush(){}},
    ScriptApp:{getService:()=>({getUrl:()=> 'https://script.google.com/macros/s/TEST/exec'}),getProjectTriggers:()=>[],newTrigger:()=>({timeBased(){return this;},everyMinutes(){return this;},create(){}})},
    MailApp:{getRemainingDailyQuota:()=>100,sendEmail:m=>{assert.equal(locked,false);sent.push(m);}}
  });
  vm.runInContext(['Code.gs','Access.gs','Notifications.gs','Reliability.gs','Background.gs'].map(f=>readFileSync(new URL('../src/'+f,import.meta.url),'utf8')).join('\n'),c);
  const headers=vm.runInContext('UC_APP.headers',c),names=vm.runInContext('UC_APP.sheets',c);
  for(const [key,h] of Object.entries(headers))makeSheet(names[key],[['Titre conservé'],[],Array.from(h)]);
  const members=sheets.get('MEMBRES'),calendar=sheets.get('CALENDRIER'),responses=sheets.get('REPONSES');
  members.grid.push(['Exemple','Camille','Compagnon','Paris','camille@example.test','','Oui','NOTE_ORIGINALE']);
  members.grid.push(['Autre','Alex','Aspirant','Autre','alex@example.test','','Oui','']);
  calendar.grid.push(['EVT-1',2026,new Date('2026-09-22T12:00:00Z'),'Réunion','Réunion compagnon','19:00','','Paris','Paris','Réunion','Oui','','Standard']);
  function appendResponse(values={}){
    const r={ID_Reponse:randomUUID(),Horodatage:new Date('2026-09-20T12:00:00Z'),ID_Evenement:'EVT-1',Annee:2026,Cle_Personne:'camille@example.test',Reponse:'Présent',Nom:'Exemple',Prenom:'Camille',Email:'camille@example.test',...values};
    responses.grid.push(headers.reponses.map(h=>r[h]??''));return r;
  }
  appendResponse();
  c.getSpreadsheet_=()=>ss;c.getSettings_=()=>({admin_pin:'bureau-test-code',annee_active:2026});c.getOptionList_=(_,fallback)=>fallback;
  const bureau=c.loginBureau('bureau-test-code').token;
  return {c,props,cache,sheets,members,calendar,responses,headers,writes,sent,bureau,appendResponse,makeSheet,failWrite:fn=>failWrite=fn,locked:()=>locked};
}

test('additive migration keeps row-three validation headers, original cells and history; interrupted ID assignment is recoverable',()=>{
  const f=fixture(),before=structuredClone(f.responses.grid),original=structuredClone(f.members.grid);
  f.failWrite(({name,row,col})=>name==='MEMBRES'&&row===4&&col===9);
  assert.throws(()=>f.c.ensureAuditSchema_(),/Interrupted/);
  assert.equal(f.members.grid[3][9],'camille@example.test','historical identity saved before identifier');
  f.failWrite(null);f.c.ensureAuditSchema_();
  const id=f.c.getRowsAsObjects_('MEMBRES')[0].ID_Membre;assert.match(id,/^MEM-/);
  f.c.ensureAuditSchema_();assert.equal(f.c.getRowsAsObjects_('MEMBRES')[0].ID_Membre,id);
  assert.deepEqual(structuredClone(f.responses.grid),before);assert.equal(f.responses.grid[2][12],'Statut');
  assert.deepEqual(f.members.grid.slice(0,3).map(r=>r.slice(0,8)),original.slice(0,3));
  assert.deepEqual(f.members.grid[3].slice(0,8),original[3]);
  assert.equal(f.props.get('uc.audit.schema'),'1');assert.equal(f.c.backgroundStatus_().pending,2);
});

test('ambiguous legacy members stop migration without guessing or rewriting historical identities',()=>{
  const f=fixture();f.members.grid.push([...f.members.grid[3]]);
  assert.throws(()=>f.c.ensureAuditSchema_(),/identité de membre en double/);
  assert.ok(f.members.grid.slice(3).every(r=>!r[8]));assert.equal(f.responses.grid.length,4);
});

test('legacy code and remembered session survive migration and email correction; reset revokes both old and new sessions',()=>{
  const f=fixture(),code='1234567890ABCDEF',hash=f.c.accessHash_(code);
  f.sheets.get('POINTAGES').grid.push(['POINTAGE-LEGACY',new Date('2026-09-22T12:00:00Z'),'EVT-1','camille@example.test','Présent']);
  f.props.set('uc.code.'+hash,'camille@example.test');f.props.set(f.c.memberAccessKey_('camille@example.test'),hash);
  const legacy=f.c.createAccessSession_({role:'member',key:'camille@example.test',version:hash},true);
  f.c.ensureAuditSchema_();const member=f.c.getRowsAsObjects_('MEMBRES')[0],key=member.ID_Membre;
  const login=f.c.loginMember(code,true);assert.equal(f.c.assertMember_(legacy).ID_Membre,key);
  f.c.updateMemberProfile({key,previousEmail:'camille@example.test',email:'nouvelle@example.test'},f.bureau);
  assert.equal(f.c.assertMember_(legacy).Email,'nouvelle@example.test');assert.equal(f.c.assertMember_(login.token).ID_Membre,key);
  assert.equal(f.c.loginMember(code).profile.email,'nouvelle@example.test');
  assert.equal(f.c.memberResponses_(f.c.assertMember_(login.token),2026).length,1);
  assert.equal(f.c.buildEventRows_('EVT-1').filter(r=>r.reponse==='Présent').length,1);
  const dashboard=f.c.computeDashboard_(2026);assert.equal(dashboard.kpis.presents,1);assert.equal(dashboard.members.find(m=>m.key===key).presents,1);
  assert.equal(dashboard.attendance.members.find(m=>m.key===key).present,1);
  assert.equal(f.members.grid[3][7],'NOTE_ORIGINALE');
  f.c.manageMemberCode(key,'reset',f.bureau);
  assert.throws(()=>f.c.assertMember_(legacy),/SESSION_EXPIRED/);assert.throws(()=>f.c.assertMember_(login.token),/SESSION_EXPIRED/);
  assert.throws(()=>f.c.loginMember(code),/incorrect/);
});

test('event moved to another year remains one event across member history, dashboard, monthly totals and report',()=>{
  const f=fixture();f.c.ensureAuditSchema_();const m=f.c.getRowsAsObjects_('MEMBRES')[0],event=f.c.formatEventForClient_(f.c.calendarRows_()[0]);
  const responseBefore=structuredClone(f.responses.grid),oldName=f.c.makeCrSheetName_(f.c.calendarRows_()[0]);
  const payload={...event,date:'2027-02-04',title:'Réunion reportée',active:true};
  assert.throws(()=>f.c.updateEvent({...payload,date:'2027-02-31'},f.bureau),/Date et titre/);
  f.c.updateEvent(payload,f.bureau);
  assert.deepEqual(structuredClone(f.responses.grid),responseBefore,'immutable original receipt');
  assert.equal(f.c.computeDashboard_(2026).kpis.presents,0);
  const d=f.c.computeDashboard_(2027);assert.equal(d.kpis.presents,1);assert.equal(d.monthly[0].month,2);
  const history=f.c.memberResponses_(m,2027);assert.equal(history.length,1);assert.equal(history[0].title,'Réunion reportée');assert.equal(history[0].date,'2027-02-04');
  assert.equal(f.c.buildEventRows_('EVT-1')[0].reponse,'Présent');assert.equal(f.c.makeCrSheetName_(f.c.calendarRows_()[0]),oldName);
  assert.throws(()=>f.c.updateEvent(payload,f.bureau),/modifié/);
  const current=f.c.formatEventForClient_(f.c.calendarRows_()[0]);f.c.updateEvent({...current,active:false},f.bureau);
  assert.equal(f.c.computeDashboard_(2027).kpis.events,0);assert.equal(f.c.memberResponses_(m,2027)[0].cancelled,true);
});

test('audience controls visibility, missing counts, reports, pointage and save authorization; stale event form is rejected',()=>{
  const f=fixture();f.c.ensureAuditSchema_();const all=f.c.getRowsAsObjects_('MEMBRES'),event=f.c.formatEventForClient_(f.c.calendarRows_()[0]);
  f.c.updateEvent({...event,statuses:['Compagnon'],cayennes:['Paris']},f.bureau);
  const d=f.c.computeDashboard_(2026);assert.equal(d.kpis.noResponse,0);assert.equal(d.members[1].noResponse,0);
  assert.equal(f.c.buildEventRows_('EVT-1').length,1);assert.equal(f.c.getAttendance('EVT-1',f.bureau).members.length,1);
  const payload={requestId:randomUUID(),answers:[{eventId:'EVT-1',reponse:'Présent'}]};
  assert.throws(()=>f.c.submitMemberResponses_(payload,all[1]),/ne concerne plus/);
  assert.throws(()=>f.c.submitMemberResponses_({...payload,answers:[{...payload.answers[0],eventVersion:event.version}]},all[0]),/modifié/);
  const code=f.c.manageMemberCode(all[1].ID_Membre,'issue',f.bureau).code,token=f.c.loginMember(code).token;
  assert.equal(f.c.getPublicConfig(token,2026).events.length,0);
});

test('request receipts keep their original time on retry and an immediate synthesis failure cannot erase saved answers',()=>{
  const f=fixture();f.c.ensureAuditSchema_();const key=f.c.getRowsAsObjects_('MEMBRES')[0].ID_Membre;
  const token=f.c.loginMember(f.c.manageMemberCode(key,'issue',f.bureau).code).token;
  f.c.refreshDashboardSheet_=()=>{assert.equal(f.locked(),false);throw Error('Quota synthèse');};
  f.c.generateEventSheet_=()=>{assert.equal(f.locked(),false);throw Error('Quota synthèse');};
  const payload={requestId:randomUUID(),answers:[{eventId:'EVT-1',reponse:'Absent'}]};
  const first=f.c.submitResponses(payload,token),retry=f.c.submitResponses(payload,token);
  assert.equal(first.receipts[0].savedAt,retry.receipts[0].savedAt);assert.equal(f.responses.grid.length,5);
  assert.equal(f.c.backgroundStatus_().pending,2);assert.match(f.c.backgroundStatus_().error,/Quota synthèse/);
  f.c.refreshDashboardSheet_=()=>{};f.c.generateEventSheet_=()=>{};
  f.c.withBackgroundLease_(()=>f.c.processFollowups_());assert.equal(f.c.backgroundStatus_().pending,0);
  assert.equal(f.responses.grid.length,5);
});

test('background lease prevents overlapping workers and does not delete a newer job queued during a calculation',()=>{
  const f=fixture();f.c.ensureAuditSchema_();let calls=0;
  f.c.refreshDashboardSheet_=()=>{assert.equal(f.locked(),false);calls++;f.c.queueFollowup_(['EVT-1']);assert.equal(f.c.withBackgroundLease_(()=>assert.fail('overlap')).busy,true);};
  f.c.generateEventSheet_=()=>{assert.equal(f.locked(),false);calls++;};
  f.c.withBackgroundLease_(()=>f.c.processFollowups_());assert.equal(calls,2);assert.equal(f.c.backgroundStatus_().pending,2,'newer jobs remain queued');
  f.c.refreshDashboardSheet_=()=>{};f.c.withBackgroundLease_(()=>f.c.processFollowups_());assert.equal(f.c.backgroundStatus_().pending,0);
  assert.equal(f.props.has('uc.worker.lease'),false);
});

test('shareable report excludes private reasons and comments; confidential details and mail history require bureau access',()=>{
  const f=fixture();f.appendResponse({Horodatage:new Date('2026-09-21T12:00:00Z'),Reponse:'Absent excusé',Causes:'PRIVATE_CAUSE',Precision:'PRIVATE_DETAIL',Commentaire:'PRIVATE_COMMENT'});
  f.c.ensureAuditSchema_();f.c.colorResponseColumn_=()=>{};
  const result=f.c.generateEventSheet('EVT-1',f.bureau),report=f.sheets.get(result.sheetName);
  assert.doesNotMatch(JSON.stringify(report.grid),/PRIVATE_|Précision|Commentaire/);
  const details=f.c.getEventConfidentialDetails('EVT-1',f.bureau);assert.equal(details[0].precision,'PRIVATE_DETAIL');
  const key=f.c.getRowsAsObjects_('MEMBRES')[0].ID_Membre,token=f.c.loginMember(f.c.manageMemberCode(key,'issue',f.bureau).code).token;
  assert.throws(()=>f.c.getEventConfidentialDetails('EVT-1',token),/SESSION_EXPIRED/);assert.throws(()=>f.c.listMailDeliveries(token),/SESSION_EXPIRED/);
  assert.notEqual(f.c.makeCrSheetName_({...f.c.calendarRows_()[0],ID_Evenement:'SECOND'}),result.sheetName,'same date/type never shares a report');
  const legacy=f.makeSheet('CR_OLD',[...Array.from({length:9},()=>[]),['Nom','Prénom','Cause','Précision','Commentaire'],['Exemple','Camille','PRIVATE_CAUSE','PRIVATE_DETAIL','PRIVATE_COMMENT']]);
  f.c.redactLegacyReports_();assert.doesNotMatch(JSON.stringify(legacy.grid),/PRIVATE_/);assert.equal(f.c.getEventConfidentialDetails('EVT-1',f.bureau)[0].precision,'PRIVATE_DETAIL');
});
