// Additive migrations: historical response and attendance rows are never rewritten.
let ucAuditReady_ = false;
function legacyMemberKey_(m) { return personKey_(m.Nom, m.Prenom, m.Email); }
function memberAliases_(m) { return [memberKey_(m), clean_(m.Cle_Historique)].filter(Boolean); }
function memberCodeHash_(m) {
  const props = PropertiesService.getScriptProperties();
  return memberAliases_(m).map(function(k) { return props.getProperty(memberAccessKey_(k)); }).filter(Boolean)[0] || '';
}
function identityResolver_() {
  const map = {};
  getRowsAsObjects_(UC_APP.sheets.membres).forEach(function(m) {
    memberAliases_(m).forEach(function(k) {
      if (map[k] && map[k] !== memberKey_(m)) throw new Error('Identités de membres en double : le bureau doit corriger MEMBRES.');
      map[k] = memberKey_(m);
    });
  });
  return function(row) { const key = clean_(row.Cle_Personne) || personKey_(row.Nom, row.Prenom, row.Email); return map[key] || key; };
}
function responseRows_() {
  const resolve = identityResolver_();
  return getRowsAsObjects_(UC_APP.sheets.reponses).map(function(r) {
    return Object.assign({}, r, {Cle_Personne: resolve(r), Reponse: r.Reponse === 'Disponible pour aider' ? 'Présent' : r.Reponse,
      Aide_Disponible: r.Reponse === 'Disponible pour aider' ? 'Oui' : r.Aide_Disponible});
  });
}
function appendSchemaColumns_(name, columns) {
  const sheet = getSpreadsheet_().getSheetByName(name), table = getTableData_(name);
  const headers = sheet.getRange(table.headerRow, 1, 1, sheet.getLastColumn()).getValues()[0].map(clean_);
  columns.forEach(function(column) {
    if (headers.includes(column)) return;
    headers.push(column);
    if (sheet.getMaxColumns() < headers.length) sheet.insertColumnsAfter(sheet.getMaxColumns(), headers.length - sheet.getMaxColumns());
    sheet.getRange(table.headerRow, headers.length).setValue(column);
  });
  return headers;
}
function ensureAuditSchema_() {
  if (ucAuditReady_) return;
  accessLocked_(function() {
    const props = PropertiesService.getScriptProperties();
    const headers = appendSchemaColumns_(UC_APP.sheets.membres, ['ID_Membre', 'Cle_Historique']);
    appendSchemaColumns_(UC_APP.sheets.calendrier, ['Public_Statuts', 'Public_Cayennes', 'Version', 'Modifie_Le']);
    const table = getTableData_(UC_APP.sheets.membres), used = new Set(), aliases = new Set();
    // Validate the whole migration before assigning any identifiers.
    const planned = table.rows.map(function(m, i) {
      if (!m.Nom || !m.Prenom) return null;
      const key = clean_(m.ID_Membre) || 'MEM-' + Utilities.getUuid();
      const alias = clean_(m.Cle_Historique) || (!m.ID_Membre ? legacyMemberKey_(m) : '');
      if (used.has(key) || (alias && aliases.has(alias))) throw new Error('Migration interrompue : identité de membre en double dans MEMBRES. Aucune réponse n’a été effacée.');
      used.add(key); if (alias) aliases.add(alias);
      return {row: table.rowNumbers[i], member: m, key: key, alias: alias};
    });
    const sheet = getSpreadsheet_().getSheetByName(UC_APP.sheets.membres);
    planned.filter(Boolean).forEach(function(p) {
      // Save the legacy key first, so an interrupted migration remains recoverable.
      if (p.alias && !p.member.Cle_Historique) sheet.getRange(p.row, headers.indexOf('Cle_Historique') + 1).setValue(sheetLiteral_(p.alias));
      if (!p.member.ID_Membre) sheet.getRange(p.row, headers.indexOf('ID_Membre') + 1).setValue(p.key);
    });
    if (props.getProperty('uc.audit.schema') !== '1') {
      queueFollowup_(getRowsAsObjects_(UC_APP.sheets.calendrier).map(function(e) { return e.ID_Evenement; }).filter(Boolean));
      props.setProperty('uc.audit.schema', '1');
    }
    try { ensureBackgroundTrigger_(); } catch (_) { props.setProperty('uc.worker.error', 'Activation Google nécessaire : exécuter activerTraitements dans Apps Script.'); }
    ucAuditReady_ = true;
  });
}
function eventYear_(e) { const date = asDate_(e.Date); return date ? date.getFullYear() : Number(e.Annee); }
function calendarRows_() {
  const seen = new Set();
  return getRowsAsObjects_(UC_APP.sheets.calendrier).filter(function(e) { return clean_(e.ID_Evenement); }).map(function(e) {
    if (seen.has(e.ID_Evenement)) throw new Error('Identifiant d’événement en double dans CALENDRIER : ' + e.ID_Evenement + '. Le bureau doit vérifier les lignes concernées.');
    seen.add(e.ID_Evenement); return e;
  });
}
function audienceList_(value) { return clean_(value).split(' ; ').filter(Boolean); }
function eventForMember_(event, member) {
  const statuses = audienceList_(event.Public_Statuts), cayennes = audienceList_(event.Public_Cayennes);
  return (!statuses.length || statuses.includes(clean_(member.Statut))) && (!cayennes.length || cayennes.includes(clean_(member.Cayenne)));
}
function eventVersion_(event) {
  return accessHash_(JSON.stringify(['Date','Titre','Type_Evenement','Heure_Debut','Heure_Fin','Lieu','Cayenne','Actif','Commentaire','Modalites','Public_Statuts','Public_Cayennes','Version'].map(function(k) { return String(event[k] || ''); })));
}
function validateAudience_(payload) {
  const statuses = Array.isArray(payload.statuses) ? payload.statuses : [], cayennes = Array.isArray(payload.cayennes) ? payload.cayennes : [];
  if (statuses.some(function(s) { return !getOptionList_('D', UC_APP.defaults.statuses).includes(s); }) || cayennes.some(function(s) { return !getOptionList_('E', UC_APP.defaults.cayennes).includes(s); })) throw new Error('Public concerné invalide.');
  return {Public_Statuts: Array.from(new Set(statuses)).join(' ; '), Public_Cayennes: Array.from(new Set(cayennes)).join(' ; ')};
}
function writeRecord_(sheetName, rowNumber, record) {
  const sheet = getSpreadsheet_().getSheetByName(sheetName), table = getTableData_(sheetName);
  const headers = sheet.getRange(table.headerRow, 1, 1, sheet.getLastColumn()).getValues()[0].map(clean_);
  if (rowNumber > sheet.getMaxRows()) sheet.insertRowsAfter(sheet.getMaxRows(), rowNumber - sheet.getMaxRows());
  const range = sheet.getRange(rowNumber, 1, 1, headers.length), values = range.getValues()[0], formulas = range.getFormulas()[0];
  formulas.forEach(function(formula, i) { if (formula) values[i] = formula; });
  Object.keys(record).forEach(function(key) {
    const column = headers.indexOf(key); if (column < 0) throw new Error('Colonne manquante : ' + key);
    values[column] = sheetLiteral_(record[key]);
  });
  range.setValues([values]);
}
function updateEvent(payload, token) {
  assertAdmin_(token); setupSystemIfMissing_();
  return accessLocked_(function() {
    const table = getTableData_(UC_APP.sheets.calendrier);
    const matches = table.rows.map(function(e, i) { return {e:e, i:i}; }).filter(function(x) { return x.e.ID_Evenement === payload.id; });
    if (matches.length !== 1) throw new Error('Événement introuvable ou en double.');
    const current = matches[0].e;
    if (payload.version !== eventVersion_(current)) throw new Error('Cet événement a été modifié. Actualisez avant de réessayer.');
    const date = parseInputDate_(payload.date), title = clean_(payload.title);
    if (!date || !title || title.length > 200) throw new Error('Date et titre valides obligatoires.');
    const changes = Object.assign(validateAudience_(payload), {Date: date, Annee: date.getFullYear(), Titre:title,
      Type_Evenement:clean_(payload.type), Heure_Debut:clean_(payload.start), Heure_Fin:clean_(payload.end),
      Lieu:clean_(payload.place), Cayenne:clean_(payload.cayenne), Commentaire:clean_(payload.comment),
      Modalites:clean_(payload.modalites || 'Standard'), Actif:payload.active === false ? 'Non' : 'Oui',
      Version:Utilities.getUuid(), Modifie_Le:new Date()});
    if (!['Standard','Repas et aide','Réception'].includes(changes.Modalites)) throw new Error('Modalités invalides.');
    ['Heure_Debut','Heure_Fin'].forEach(function(k) { if (changes[k] && !/^([01]\d|2[0-3]):[0-5]\d$/.test(changes[k])) throw new Error('Horaire invalide.'); });
    if (changes.Commentaire.length > 2000 || changes.Lieu.length > 300) throw new Error('Texte trop long.');
    queueFollowup_([current.ID_Evenement]);
    writeRecord_(UC_APP.sheets.calendrier, table.rowNumbers[matches[0].i], changes);
    return {ok:true,message:changes.Actif === 'Non' ? 'Événement annulé. Les réponses sont conservées.' : 'Événement mis à jour. Les réponses restent rattachées à ce rendez-vous.'};
  });
}
function updateMemberProfile(payload, token) {
  assertAdmin_(token); ensureAuditSchema_();
  return accessLocked_(function() {
    const table = getTableData_(UC_APP.sheets.membres), index = table.rows.findIndex(function(m) { return memberKey_(m) === payload.key; });
    if (index < 0) throw new Error('Membre introuvable.');
    const m = table.rows[index];
    if (payload.previousEmail !== clean_(m.Email)) throw new Error('Le profil a changé. Actualisez la liste.');
    const email = clean_(payload.email);
    if (email && !mailAddressValid_(email)) throw new Error('Adresse email invalide.');
    queueFollowup_(calendarRows_().map(function(e) { return e.ID_Evenement; }));
    writeRecord_(UC_APP.sheets.membres, table.rowNumbers[index], {Email:email});
    return {ok:true,message:'Adresse modifiée. Le code et l’historique du membre sont conservés.'};
  });
}
