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

function agendaPropertyKey_(eventId) { return 'uc.agenda.' + accessHash_(clean_(eventId)); }
function agendaMeetingType_(event) {
  const type = clean_(event && event.Type_Evenement);
  return type === 'Réunion compagnon' || type === 'Réunion des jeunes' ? type : '';
}
function agendaMeta_(eventId) {
  const raw = PropertiesService.getScriptProperties().getProperty(agendaPropertyKey_(eventId));
  if (!raw) return null;
  try {
    const meta = JSON.parse(raw);
    return meta && clean_(meta.fileId) ? meta : null;
  } catch (_) { return null; }
}
function agendaAdminInfo_(event) {
  const meta = agendaMeta_(event.ID_Evenement);
  const type = agendaMeetingType_(event);
  return {
    eligible: !!type,
    available: !!meta,
    name: meta ? clean_(meta.name) : '',
    updatedAt: meta ? clean_(meta.updatedAt) : '',
    restrictedToCompanions: !!(meta && meta.visibility === 'companions') || type === 'Réunion compagnon'
  };
}
function canMemberReadAgenda_(event, member, meta) {
  if (!agendaMeetingType_(event) || !eventForMember_(event, member)) return false;
  const companionOnly = clean_(event.Type_Evenement) === 'Réunion compagnon' || (meta && meta.visibility === 'companions');
  return !companionOnly || clean_(member.Statut) === 'Compagnon';
}
function agendaClientInfo_(event, member) {
  const meta = agendaMeta_(event.ID_Evenement);
  if (!meta || !canMemberReadAgenda_(event, member, meta)) return null;
  return {available:true, name:clean_(meta.name), updatedAt:clean_(meta.updatedAt)};
}
function agendaFolder_() {
  const props = PropertiesService.getScriptProperties(), slot = 'uc.agenda.folder';
  const id = props.getProperty(slot);
  if (id) {
    try { return DriveApp.getFolderById(id); } catch (_) { props.deleteProperty(slot); }
  }
  const folder = DriveApp.createFolder('UC Cayenne de Paris - Ordres du jour');
  props.setProperty(slot, folder.getId());
  return folder;
}
function agendaPdfPayload_(meta) {
  let file;
  try { file = DriveApp.getFileById(meta.fileId); } catch (_) { throw new Error('Ordre du jour indisponible. Le bureau doit remettre le PDF.'); }
  const blob = file.getBlob(), bytes = blob.getBytes();
  return {name:clean_(meta.name) || file.getName() || 'ordre-du-jour.pdf', mimeType:'application/pdf', data:Utilities.base64Encode(bytes)};
}
function saveAgendaPdf(eventId, payload, token) {
  assertAdmin_(token); setupSystemIfMissing_();
  const id = clean_(eventId), event = calendarRows_().find(function(e) { return clean_(e.ID_Evenement) === id; });
  if (!event) throw new Error('Événement introuvable.');
  const type = agendaMeetingType_(event);
  if (!type) throw new Error('Un ordre du jour PDF peut être ajouté uniquement à une réunion des jeunes ou une réunion compagnon.');
  payload = payload || {};
  const originalName = clean_(payload.name);
  if (!/\.pdf$/i.test(originalName) || clean_(payload.mimeType) !== 'application/pdf') throw new Error('Choisissez un fichier PDF.');
  const encoded = clean_(payload.data).replace(/^data:application\/pdf;base64,/i, '');
  if (!encoded || encoded.length > 6 * 1024 * 1024) throw new Error('Le PDF est trop volumineux. Limite : 4 Mo.');
  let bytes;
  try { bytes = Utilities.base64Decode(encoded); } catch (_) { throw new Error('Le fichier PDF est illisible.'); }
  if (!bytes || !bytes.length || bytes.length > 4 * 1024 * 1024) throw new Error('Le PDF est trop volumineux. Limite : 4 Mo.');
  const signature = bytes.slice(0, 5).map(function(b) { return String.fromCharCode((Number(b) + 256) % 256); }).join('');
  if (signature !== '%PDF-') throw new Error('Le fichier sélectionné n’est pas un PDF valide.');
  const safeName = ('ODJ_' + formatDate_(event.Date) + '_' + slug_(event.Titre).slice(0, 60) + '.pdf').replace(/_+/g, '_');
  const blob = Utilities.newBlob(bytes, 'application/pdf', safeName);
  const file = agendaFolder_().createFile(blob);
  try { file.setDescription('Ordre du jour — ' + clean_(event.Titre) + ' — ' + formatDate_(event.Date)); } catch (_) {}
  const old = agendaMeta_(id);
  const meta = {fileId:file.getId(), name:safeName, updatedAt:new Date().toISOString(), visibility:type === 'Réunion compagnon' ? 'companions' : 'members'};
  PropertiesService.getScriptProperties().setProperty(agendaPropertyKey_(id), JSON.stringify(meta));
  if (old && old.fileId && old.fileId !== meta.fileId) {
    try { DriveApp.getFileById(old.fileId).setTrashed(true); } catch (_) {}
  }
  return {ok:true, agenda:agendaAdminInfo_(event), message:type === 'Réunion compagnon' ? 'Ordre du jour enregistré. Il est accessible uniquement aux Compagnons.' : 'Ordre du jour enregistré. Il est accessible aux membres concernés par cette réunion.'};
}
function getAgendaPdf(eventId, token) {
  const member = assertMember_(token), id = clean_(eventId);
  const event = calendarRows_().find(function(e) { return clean_(e.ID_Evenement) === id && isActive_(e.Actif); });
  if (!event || !eventForMember_(event, member)) throw new Error('Ordre du jour indisponible pour votre profil.');
  const meta = agendaMeta_(id);
  if (!meta) throw new Error('Aucun ordre du jour PDF n’a encore été ajouté.');
  if (!canMemberReadAgenda_(event, member, meta)) throw new Error('Cet ordre du jour est réservé aux Compagnons.');
  return agendaPdfPayload_(meta);
}
function getAgendaPdfAdmin(eventId, token) {
  assertAdmin_(token);
  const id = clean_(eventId), event = calendarRows_().find(function(e) { return clean_(e.ID_Evenement) === id; });
  if (!event) throw new Error('Événement introuvable.');
  const meta = agendaMeta_(id);
  if (!meta) throw new Error('Aucun ordre du jour PDF n’a encore été ajouté.');
  return agendaPdfPayload_(meta);
}
function deleteAgendaForEvent_(eventId) {
  const props = PropertiesService.getScriptProperties(), key = agendaPropertyKey_(eventId), meta = agendaMeta_(eventId);
  props.deleteProperty(key);
  if (meta && meta.fileId) {
    try { DriveApp.getFileById(meta.fileId).setTrashed(true); } catch (_) {}
  }
  return !!meta;
}
function deleteAgendaPdf(eventId, token) {
  assertAdmin_(token);
  const id = clean_(eventId);
  if (!calendarRows_().some(function(e) { return clean_(e.ID_Evenement) === id; })) throw new Error('Événement introuvable.');
  const deleted = deleteAgendaForEvent_(id);
  return {ok:true, deleted:deleted, message:deleted ? 'Ordre du jour supprimé.' : 'Aucun ordre du jour n’était enregistré.'};
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
    const agendaRemoved = clean_(current.Type_Evenement) !== changes.Type_Evenement && !!agendaMeta_(current.ID_Evenement) ? deleteAgendaForEvent_(current.ID_Evenement) : false;
    return {ok:true,message:(changes.Actif === 'Non' ? 'Événement annulé. Les réponses sont conservées.' : 'Événement mis à jour. Les réponses restent rattachées à ce rendez-vous.') + (agendaRemoved ? ' L’ordre du jour a été supprimé car le type de réunion a changé.' : '')};
  });
}
function updateOwnEmail(email, token) {
  ensureAuditSchema_();
  const member = assertMember_(token), key = memberKey_(member), value = clean_(email);
  if (value && !mailAddressValid_(value)) throw new Error('Adresse email invalide.');
  return accessLocked_(function() {
    const table = getTableData_(UC_APP.sheets.membres), index = table.rows.findIndex(function(m) { return memberKey_(m) === key; });
    if (index < 0) throw new Error('Membre introuvable.');
    writeRecord_(UC_APP.sheets.membres, table.rowNumbers[index], {Email:value});
    return {ok:true,email:value,message:value?'Adresse email mise à jour. Les prochaines confirmations utiliseront cette adresse.':'Adresse email retirée. Vous ne recevrez plus de confirmation par mail tant qu’une nouvelle adresse ne sera pas renseignée.'};
  });
}
function deleteEventRows_(sheetName, eventId) {
  const table = getTableData_(sheetName), sheet = getSpreadsheet_().getSheetByName(sheetName);
  const rows = table.rows.map(function(row,i) { return {row:row,number:table.rowNumbers[i]}; })
    .filter(function(item) { return clean_(item.row.ID_Evenement) === eventId; })
    .map(function(item) { return item.number; }).sort(function(a,b) { return b-a; });
  rows.forEach(function(rowNumber) { sheet.deleteRow(rowNumber); });
  return rows.length;
}
function deleteEvent(eventId, token) {
  assertAdmin_(token); setupSystemIfMissing_();
  return accessLocked_(function() {
    const id = clean_(eventId), table = getTableData_(UC_APP.sheets.calendrier);
    const matches = table.rows.map(function(e,i) { return {e:e,i:i}; }).filter(function(x) { return clean_(x.e.ID_Evenement) === id; });
    if (matches.length !== 1) throw new Error('Événement introuvable ou en double.');
    const deletedResponses = deleteEventRows_(UC_APP.sheets.reponses, id);
    const deletedAttendance = deleteEventRows_(UC_APP.sheets.pointages, id);
    const deletedMails = deleteEventRows_(UC_APP.sheets.mails, id);
    const deletedAgenda = deleteAgendaForEvent_(id);
    getSpreadsheet_().getSheetByName(UC_APP.sheets.calendrier).deleteRow(table.rowNumbers[matches[0].i]);
    PropertiesService.getScriptProperties().deleteProperty('uc.job.event.' + accessHash_(id));
    queueFollowup_([]);
    return {ok:true,deletedResponses:deletedResponses,deletedAttendance:deletedAttendance,deletedMails:deletedMails,deletedAgenda:deletedAgenda,
      message:'Événement supprimé définitivement avec ' + deletedResponses + ' réponse(s) associée(s).' + (deletedAgenda ? ' L’ordre du jour PDF a également été supprimé.' : '')};
  });
}
function updateMemberProfile(payload, token) {
  assertAdmin_(token); ensureAuditSchema_();
  return accessLocked_(function() {
    payload = payload || {};
    const table = getTableData_(UC_APP.sheets.membres), index = table.rows.findIndex(function(m) { return memberKey_(m) === clean_(payload.key); });
    if (index < 0) throw new Error('Membre introuvable.');
    const m = table.rows[index];
    if (payload.previousEmail != null && clean_(payload.previousEmail) !== clean_(m.Email)) throw new Error('Le profil a changé. Actualisez la liste.');
    const changes = {
      Nom:clean_(payload.nom == null ? m.Nom : payload.nom), Prenom:clean_(payload.prenom == null ? m.Prenom : payload.prenom),
      Statut:clean_(payload.statut == null ? m.Statut : payload.statut), Cayenne:clean_(payload.cayenne == null ? m.Cayenne : payload.cayenne),
      Email:clean_(payload.email == null ? m.Email : payload.email), Telephone:clean_(payload.telephone == null ? m.Telephone : payload.telephone),
      Actif:payload.active === false ? 'Non' : 'Oui'
    };
    if (!changes.Nom || !changes.Prenom) throw new Error('Nom et prénom obligatoires.');
    if (!getOptionList_('D', UC_APP.defaults.statuses).includes(changes.Statut) || !getOptionList_('E', UC_APP.defaults.cayennes).includes(changes.Cayenne)) throw new Error('Statut ou Cayenne invalide.');
    if (changes.Email && !mailAddressValid_(changes.Email)) throw new Error('Adresse email invalide.');
    if ([changes.Nom,changes.Prenom,changes.Email,changes.Telephone].some(function(v) { return v.length > 200 || /^[=+@]/.test(v); })) throw new Error('Un champ est invalide ou trop long.');
    queueFollowup_(calendarRows_().map(function(e) { return e.ID_Evenement; }));
    writeRecord_(UC_APP.sheets.membres, table.rowNumbers[index], changes);
    if (changes.Actif === 'Non') memberAliases_(m).forEach(function(alias) { pruneRememberedSessions_(alias, true); });
    return {ok:true,message:changes.Actif === 'Non' ? 'Membre mis à jour et désactivé. Son historique est conservé.' : 'Membre mis à jour. Son historique et son accès sont conservés.'};
  });
}
function deleteMemberRows_(sheetName, keys) {
  const table = getTableData_(sheetName), sheet = getSpreadsheet_().getSheetByName(sheetName);
  const rows = table.rows.map(function(row,i) { return {row:row,number:table.rowNumbers[i]}; })
    .filter(function(item) { return keys.indexOf(clean_(item.row.Cle_Personne)) >= 0; })
    .map(function(item) { return item.number; }).sort(function(a,b) { return b-a; });
  rows.forEach(function(rowNumber) { sheet.deleteRow(rowNumber); });
  return rows.length;
}
function deleteMember(key, token) {
  assertAdmin_(token); ensureAuditSchema_();
  return accessLocked_(function() {
    const table = getTableData_(UC_APP.sheets.membres);
    const index = table.rows.findIndex(function(m) { return memberAliases_(m).includes(clean_(key)); });
    if (index < 0) throw new Error('Membre introuvable.');
    const member = table.rows[index], aliases = memberAliases_(member), currentKey = memberKey_(member);
    if (aliases.indexOf(currentKey) < 0) aliases.push(currentKey);
    const responses = deleteMemberRows_(UC_APP.sheets.reponses, aliases);
    const attendance = deleteMemberRows_(UC_APP.sheets.pointages, aliases);
    const mails = deleteMemberRows_(UC_APP.sheets.mails, aliases);
    const props = PropertiesService.getScriptProperties(), old = memberCodeHash_(member);
    aliases.forEach(function(alias) { props.deleteProperty(memberAccessKey_(alias)); props.deleteProperty(memberCredentialKindKey_(alias)); pruneRememberedSessions_(alias, true); });
    if (old) props.deleteProperty('uc.code.' + old);
    getSpreadsheet_().getSheetByName(UC_APP.sheets.membres).deleteRow(table.rowNumbers[index]);
    queueFollowup_(calendarRows_().map(function(e) { return e.ID_Evenement; }));
    return {ok:true,deletedResponses:responses,deletedAttendance:attendance,deletedMails:mails,
      message:'Membre supprimé définitivement avec ' + responses + ' réponse(s) associée(s).'};
  });
}
