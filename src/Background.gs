// Durable work items are reserved under a short lock. Slow work never holds that lock.
function queueFollowup_(ids) {
  const props = PropertiesService.getScriptProperties(), version = Utilities.getUuid();
  Array.from(new Set(ids)).forEach(function(id) { props.setProperty('uc.job.event.' + accessHash_(id), JSON.stringify({id:id,version:version})); });
  props.setProperty('uc.job.dashboard', JSON.stringify({version:version}));
}
function ensureBackgroundTrigger_() {
  const props = PropertiesService.getScriptProperties();
  const old = ScriptApp.getProjectTriggers().filter(function(t) { return t.getHandlerFunction() === 'envoyerNotifications_'; });
  if (props.getProperty('uc.worker.trigger') === '1' && old.length === 1) return;
  ScriptApp.newTrigger('envoyerNotifications_').timeBased().everyMinutes(5).create();
  old.forEach(function(t) { ScriptApp.deleteTrigger(t); });
  props.setProperty('uc.worker.trigger','1'); props.deleteProperty('uc.worker.error');
}
function activerTraitements() {
  assertMailOperator_();
  accessLocked_(function() { PropertiesService.getScriptProperties().deleteProperty('uc.worker.trigger'); ensureBackgroundTrigger_(); });
  return {ok:true,message:'Mise à jour automatique installée. Les mails conservent leur réglage actuel.'};
}
function withBackgroundLease_(action) {
  const props = PropertiesService.getScriptProperties();
  const id = accessLocked_(function() {
    const old = JSON.parse(props.getProperty('uc.worker.lease') || 'null');
    if (old && old.until > Date.now()) return null;
    const lease = {id:Utilities.getUuid(),until:Date.now()+7*60000};
    props.setProperty('uc.worker.lease',JSON.stringify(lease)); return lease.id;
  });
  if (!id) return {ok:false,busy:true,message:'Un traitement est déjà en cours. Réessayez dans quelques instants.'};
  try { return action(); } finally {
    accessLocked_(function() { const current=JSON.parse(props.getProperty('uc.worker.lease') || 'null'); if(current && current.id===id)props.deleteProperty('uc.worker.lease'); });
  }
}
function processFollowups_() {
  const props = PropertiesService.getScriptProperties(), jobs = props.getProperties(), started=Date.now();
  let done=0;
  Object.keys(jobs).filter(function(k) { return k.indexOf('uc.job.')===0; }).sort().forEach(function(key) {
    if (Date.now()-started>45000 || done>=6) return;
    const job=JSON.parse(jobs[key]);
    try {
      if (key==='uc.job.dashboard') refreshDashboardSheet_(); else generateEventSheet_(job.id);
      accessLocked_(function() { if(props.getProperty(key)===jobs[key])props.deleteProperty(key); });
      done++;
    } catch (error) { props.setProperty('uc.worker.error','Une synthèse reste à actualiser : ' + clean_(error.message).slice(0, 200)); }
  });
  return done;
}
function backgroundStatus_() {
  const values=PropertiesService.getScriptProperties().getProperties();
  return {ready:values['uc.worker.trigger']==='1',pending:Object.keys(values).filter(function(k) { return k.indexOf('uc.job.')===0; }).length,
    lastRun:values['uc.worker.lastRun']||'',error:values['uc.worker.error']||''};
}
function listMailDeliveries(token) {
  assertAdmin_(token); ensureAuditSchema_();
  const events=indexBy_(calendarRows_(),'ID_Evenement'), members={},resolve=identityResolver_();
  getRowsAsObjects_(UC_APP.sheets.membres).forEach(function(m) { members[memberKey_(m)]=m; });
  return getRowsAsObjects_(UC_APP.sheets.mails).slice(-200).reverse().map(function(r) {
    const m=members[resolve(r)]||{};
    return {id:r.ID_Notification,eventId:r.ID_Evenement,title:(events[r.ID_Evenement]||{}).Titre||r.ID_Evenement,
      name:clean_((m.Prenom||'')+' '+(m.Nom||''))||'Ancien membre',email:clean_(r.Destinataire),type:r.Type,state:r.Etat,
      sentAt:r.Envoye_Le ? new Date(r.Envoye_Le).toISOString() : '',detail:clean_(r.Detail)};
  });
}
function getEventConfidentialDetails(eventId, token) {
  assertAdmin_(token); ensureAuditSchema_();
  return buildEventRows_(eventId).filter(function(r) { return r.causes || r.precision || r.commentaire; }).map(function(r) {
    return {name:r.prenom+' '+r.nom,response:r.reponse,causes:r.causes,precision:r.precision,comment:r.commentaire};
  });
}

// Generated reports are shareable. Originals remain in the bureau's REPONSES table.
function redactLegacyReports_() {
  getSpreadsheet_().getSheets().filter(function(s) { return /^CR_/.test(s.getName()) && s.getLastRow() >= 10; }).forEach(function(sheet) {
    const headers = sheet.getRange(10, 1, 1, sheet.getLastColumn()).getValues()[0];
    if (headers[0] !== 'Nom' || headers[1] !== 'Prénom') return;
    headers.forEach(function(h, index) {
      if (['Cause', 'Précision', 'Commentaire'].includes(h)) sheet.getRange(10, index + 1, sheet.getLastRow() - 9, 1).clearContent();
    });
  });
}
