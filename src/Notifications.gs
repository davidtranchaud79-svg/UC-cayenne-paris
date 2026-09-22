// These editor-only functions end in '_' and cannot be called by google.script.run.
function activerNotifications_() {
  return accessLocked_(function() {
    MailApp.getRemainingDailyQuota();
    const props = PropertiesService.getScriptProperties();
    const triggers = ScriptApp.getProjectTriggers().filter(function(t) { return t.getHandlerFunction() === 'envoyerNotifications_'; });
    if (!triggers.length) ScriptApp.newTrigger('envoyerNotifications_').timeBased().everyHours(1).create();
    triggers.slice(1).forEach(function(t) { ScriptApp.deleteTrigger(t); });
    mailJournal_();
    if (props.getProperty('uc.mail.enabled') !== 'true') props.setProperty('uc.mail.since', String(Date.now()));
    props.setProperty('uc.mail.enabled', 'true');
    return {ok: true, message: 'Mails activés. Confirmations des nouvelles réponses et rappels la veille à partir de 9 h, heure de Paris.'};
  });
}

function desactiverNotifications_() {
  return accessLocked_(function() {
    PropertiesService.getScriptProperties().setProperty('uc.mail.enabled', 'false');
    ScriptApp.getProjectTriggers().filter(function(t) { return t.getHandlerFunction() === 'envoyerNotifications_'; })
      .forEach(function(t) { ScriptApp.deleteTrigger(t); });
    return {ok: true};
  });
}

function envoyerNotifications_() {
  return accessLocked_(function() {
    const props = PropertiesService.getScriptProperties();
    try {
      const result = traiterMails_(null, new Date());
      props.setProperty('uc.mail.lastRun', new Date().toISOString());
      props.deleteProperty('uc.mail.error');
      return result;
    } catch (error) {
      props.setProperty('uc.mail.error', 'Traitement interrompu. Consultez les exécutions Apps Script et JOURNAL_MAILS.');
      throw error;
    }
  });
}

function notificationStatus_() {
  const props = PropertiesService.getScriptProperties();
  const rows = getRowsAsObjects_(UC_APP.sheets.mails);
  return {
    enabled: props.getProperty('uc.mail.enabled') === 'true',
    lastRun: props.getProperty('uc.mail.lastRun') || '',
    error: props.getProperty('uc.mail.error') || '',
    waiting: rows.filter(function(r) { return ['ATTENTE', 'SANS_EMAIL'].includes(r.Etat); }).length,
    review: rows.filter(function(r) { return ['EN_COURS', 'A_VERIFIER'].includes(r.Etat); }).length
  };
}

function mailJournal_() {
  const sheet = ensureSheet_(getSpreadsheet_(), UC_APP.sheets.mails);
  if (!sheet.getLastRow()) {
    sheet.getRange(1, 1, 1, UC_APP.headers.mails.length).setValues([UC_APP.headers.mails]);
    sheet.setFrozenRows(1);
  }
  const table = getTableData_(UC_APP.sheets.mails);
  const entries = {};
  table.rows.forEach(function(row, i) { entries[row.ID_Notification] = {data: row, row: table.rowNumbers[i]}; });
  return {sheet: sheet, entries: entries};
}

function mailLog_(journal, candidate, state, now, detail, recipient) {
  let entry = journal.entries[candidate.id];
  if (!entry) {
    entry = {row: journal.sheet.getLastRow() + 1, data: {Cree_Le: now}};
    journal.entries[candidate.id] = entry;
  }
  entry.data = {
    ID_Notification: candidate.id, Type: candidate.type, ID_Evenement: candidate.event.ID_Evenement,
    ID_Reponse: candidate.response.ID_Reponse, Cle_Personne: candidate.response.Cle_Personne,
    Destinataire: recipient || '', Etat: state, Cree_Le: entry.data.Cree_Le,
    Envoye_Le: state === 'ENVOYE' ? now : '', Detail: detail || ''
  };
  journal.sheet.getRange(entry.row, 1, 1, UC_APP.headers.mails.length).setValues([
    UC_APP.headers.mails.map(function(header) { return sheetLiteral_(entry.data[header]); })
  ]);
}

function mailParisDate_(date) { return Utilities.formatDate(date, 'Europe/Paris', 'yyyy-MM-dd'); }

function mailTomorrow_(now) {
  // Advance the Paris calendar date, not 24 local hours across a DST change.
  const date = new Date(mailParisDate_(now) + 'T12:00:00Z');
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

function mailAddressValid_(address) {
  return /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(address);
}

function mailCandidates_(responses, events, members, since, now, onlyIds) {
  const latest = {};
  responses.forEach(function(r) {
    const key = r.ID_Evenement + '|' + r.Cle_Personne;
    if (!latest[key] || asDate_(r.Horodatage) >= asDate_(latest[key].Horodatage)) latest[key] = r;
  });
  const ids = onlyIds ? new Set(onlyIds) : null;
  const byEvent = indexBy_(events, 'ID_Evenement'), byMember = {};
  members.filter(function(m) { return m.Nom && m.Prenom && isActive_(m.Actif); }).forEach(function(m) {
    const key = memberKey_(m);
    // Duplicate identities must be corrected by the bureau before sending.
    byMember[key] = Object.prototype.hasOwnProperty.call(byMember, key) ? null : m;
  });
  const reminders = [], confirmations = [];
  const hour = Number(Utilities.formatDate(now, 'Europe/Paris', 'HH'));
  Object.keys(latest).forEach(function(key) {
    const response = latest[key], event = byEvent[response.ID_Evenement], member = byMember[response.Cle_Personne];
    if (!event || !isActive_(event.Actif) || !member) return;
    const common = {event: event, response: response, member: member};
    const timestamp = asDate_(response.Horodatage);
    if (timestamp && timestamp.getTime() >= since && (!ids || ids.has(response.ID_Reponse))) {
      confirmations.push(Object.assign({id: 'CONF:' + response.ID_Reponse, type: 'CONFIRMATION'}, common));
    }
    if (!ids && hour >= 9 && hour < 21 && formatDate_(event.Date) === mailTomorrow_(now) &&
        ['Présent', 'Disponible pour aider', 'Je ne sais pas encore'].includes(response.Reponse)) {
      reminders.push(Object.assign({id: 'RAPPEL:' + event.ID_Evenement + ':' + formatDate_(event.Date) + ':' + accessHash_(response.Cle_Personne), type: 'RAPPEL'}, common));
    }
  });
  return reminders.concat(confirmations);
}

function mailContent_(candidate) {
  const event = candidate.event, response = candidate.response;
  const reminder = candidate.type === 'RAPPEL';
  const title = clean_(event.Titre).replace(/[\r\n]+/g, ' ');
  const isoDate = formatDate_(event.Date);
  const date = isoDate.split('-').reverse().join('/');
  const time = [formatEventTime_(event.Heure_Debut), formatEventTime_(event.Heure_Fin)].filter(Boolean).join(' – ');
  const lines = [
    'Bonjour ' + clean_(candidate.member.Prenom) + ',', '',
    reminder ? 'Votre rendez-vous à la Cayenne a lieu demain.' : 'Votre réponse a bien été enregistrée pour cet événement.', '',
    'Événement : ' + title, 'Date : ' + date,
    'Horaires : ' + (time || 'À confirmer'), 'Lieu : ' + (clean_(event.Lieu) || 'À confirmer'),
    'Votre réponse : ' + response.Reponse
  ];
  if (response.Participation) lines.push('Participation : ' + response.Participation);
  if (response.Creneaux) lines.push('Créneaux : ' + response.Creneaux);
  if (response.Aide_Disponible === 'Oui') {
    lines.push('Aide proposée : oui');
    const helpTime = [response.Heure_Debut_Aide, response.Heure_Fin_Aide].filter(Boolean).join(' – ');
    if (helpTime) lines.push('Horaires d’aide : ' + helpTime);
  }
  if (!reminder) lines.push('Enregistrement : ' + Utilities.formatDate(asDate_(response.Horodatage), 'Europe/Paris', 'dd/MM/yyyy HH:mm') + ' (heure de Paris)', 'Référence : ' + response.ID_Reponse);
  if (reminder && response.Reponse === 'Je ne sais pas encore') lines.push('', 'Merci de confirmer votre présence ou votre absence.');
  lines.push('', 'Vous pouvez modifier votre réponse dans votre espace avec votre code personnel :',
    UC_APP.defaults.webAppUrl, '', 'Cayenne de Paris — Union Compagnonnique');
  return {subject: (reminder ? 'Rappel pour demain' : 'Confirmation de votre réponse') + ' — ' + title + ' — ' + date, body: lines.join('\n')};
}

// Caller holds the shared script lock. A durable claim precedes each send;
// an ambiguous MailApp failure is reviewed manually rather than resent blindly.
function traiterMails_(onlyIds, now) {
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty('uc.mail.enabled') !== 'true') return {enabled: false, sent: 0, pending: 0};
  const since = Number(props.getProperty('uc.mail.since'));
  if (!since) throw new Error('Activation des mails incomplète.');
  const candidates = mailCandidates_(getRowsAsObjects_(UC_APP.sheets.reponses), getRowsAsObjects_(UC_APP.sheets.calendrier),
    getRowsAsObjects_(UC_APP.sheets.membres), since, now, onlyIds);
  const journal = mailJournal_();
  if (!onlyIds) {
    const currentIds = new Set(candidates.map(function(c) { return c.id; }));
    Object.keys(journal.entries).forEach(function(id) {
      const entry = journal.entries[id], data = entry.data;
      if (['ATTENTE', 'SANS_EMAIL'].includes(data.Etat) && !currentIds.has(id)) {
        // Pending confirmations superseded by a newer answer are no longer sent.
        // Reminder candidates exist only during the sending window; retain them
        // before 9 am, expire them after the event date or an answer change.
        if (data.Type === 'RAPPEL' && Number(Utilities.formatDate(now, 'Europe/Paris', 'HH')) < 9) return;
        data.Etat = 'ANNULE'; data.Detail = 'Réponse remplacée, événement indisponible ou délai de rappel dépassé.';
        journal.sheet.getRange(entry.row, 1, 1, UC_APP.headers.mails.length).setValues([UC_APP.headers.mails.map(function(h) { return sheetLiteral_(data[h]); })]);
      }
    });
  }
  let quota = MailApp.getRemainingDailyQuota(), sent = 0, pending = 0;
  const started = Date.now(), limit = onlyIds ? 10 : 50;
  candidates.forEach(function(candidate) {
    const previous = journal.entries[candidate.id];
    if (previous && previous.data.Etat === 'ENVOYE') return;
    if (previous && ['EN_COURS', 'A_VERIFIER'].includes(previous.data.Etat)) { pending++; return; }
    const address = clean_(candidate.member.Email);
    if (!mailAddressValid_(address)) {
      mailLog_(journal, candidate, 'SANS_EMAIL', now, 'Adresse absente ou invalide dans MEMBRES.', address); pending++; return;
    }
    if (quota < 1 || sent >= limit || Date.now() - started > 90000) {
      mailLog_(journal, candidate, 'ATTENTE', now, 'En attente du quota Google ou du prochain passage.', address); pending++; return;
    }
    const content = mailContent_(candidate);
    mailLog_(journal, candidate, 'EN_COURS', now, 'Envoi demandé à Google.', address);
    SpreadsheetApp.flush();
    try {
      MailApp.sendEmail({to: address, subject: content.subject, body: content.body, name: 'Cayenne de Paris'});
      mailLog_(journal, candidate, 'ENVOYE', now, 'Message remis au service Google. La réception finale dépend de la messagerie.', address);
      SpreadsheetApp.flush(); sent++; quota--;
    } catch (error) {
      mailLog_(journal, candidate, 'A_VERIFIER', now, 'Résultat incertain : vérifier les envois Google avant toute relance. ' + clean_(error.message).slice(0, 250), address);
      SpreadsheetApp.flush(); pending++;
    }
  });
  return {enabled: true, sent: sent, pending: pending};
}
