const UC_APP = {
  spreadsheetId: '1_atXm_AKfq2864aCabWhcyFerbix0xFPh2VUUC_pPs4',
  sheets: {
    parametres: 'PARAMETRES',
    membres: 'MEMBRES',
    calendrier: 'CALENDRIER',
    reponses: 'REPONSES',
    suivi: 'SUIVI_ANNUEL',
    dashboard: 'DASHBOARD',
    modeleCr: 'MODELE_CR_EVENEMENT',
    eventBase: 'BASE_EVENEMENTS'
  },
  headers: {
    membres: ['Nom', 'Prenom', 'Statut', 'Cayenne', 'Email', 'Telephone', 'Actif', 'Notes'],
    calendrier: ['ID_Evenement', 'Annee', 'Date', 'Titre', 'Type_Evenement', 'Heure_Debut', 'Heure_Fin', 'Lieu', 'Cayenne', 'Categorie_CR', 'Actif', 'Commentaire', 'Modalites'],
    reponses: ['ID_Reponse', 'Horodatage', 'Source', 'Annee', 'ID_Evenement', 'Date_Evenement', 'Titre_Evenement', 'Type_Evenement', 'Nom', 'Prenom', 'Email', 'Telephone', 'Statut', 'Cayenne', 'Reponse', 'Causes', 'Precision', 'Aide_Disponible', 'Heure_Debut_Aide', 'Heure_Fin_Aide', 'Commentaire', 'Cle_Personne', 'Mois', 'Semaine', 'Feuille_CR', 'Participation', 'Creneaux'],
    eventBase: ['Template_ID', 'Nom_Modele', 'Type_Evenement', 'Titre_Par_Defaut', 'Heure_Debut', 'Heure_Fin', 'Lieu', 'Cayenne', 'Categorie_CR', 'Actif', 'Commentaire', 'Modalites']
  },
  defaults: {
    activeYear: 2026,
    adminPin: '1234',
    webAppUrl: 'https://script.google.com/macros/s/AKfycbyxk7lHX1J7EC_FRRRSCacU4jvBWemPik9fanpQdWzlpIV4ZS1WKq-ZZ70w_mKh7aXCCg/exec',
    adminAppUrl: 'https://script.google.com/macros/s/AKfycbyxk7lHX1J7EC_FRRRSCacU4jvBWemPik9fanpQdWzlpIV4ZS1WKq-ZZ70w_mKh7aXCCg/exec?page=admin',
    statuses: ['Sociétaire', 'Aspirant', 'Compagnon'],
    cayennes: ['Paris', 'Autre'],
    reponses: ['Présent', 'Absent', 'Je ne sais pas encore', 'Absent excusé', 'Disponible pour aider'],
    causes: [
      'Familiale',
      'Travail',
      'Engagement compagnonnique ailleurs',
      'Maladie',
      'Arrêt de travail',
      'Vacances',
      'Repos',
      'Trop d’engagements / je fais un break',
      'Autres'
    ],
    eventTypes: [
      'Réunion des jeunes',
      'Réunion compagnon',
      'Cours en Cayenne',
      'Fête de juin',
      'Fête de novembre',
      'JEP',
      'Autre'
    ],
    eventTemplates: [
      ['TPL-JEUNES-19', 'Réunion des jeunes — 19 h à confirmer', 'Réunion des jeunes', 'Réunion des jeunes', '19:00', '', 'Cayenne de Paris', 'Paris', 'Réunion', 'Oui', 'Horaire probable : 19 h. La date est celle indiquée sur ce rendez-vous.', 'Standard'],
      ['TPL-COMPAGNONS-19', 'Réunion compagnon — 19 h à confirmer', 'Réunion compagnon', 'Réunion compagnon', '19:00', '', 'Cayenne de Paris', 'Paris', 'Réunion', 'Oui', 'Horaire probable : 19 h. La date est celle indiquée sur ce rendez-vous.', 'Standard'],
      ['TPL-FETE-DIMANCHE', 'Fête Paris — dimanche', 'Autre', 'Fête Paris — dimanche', '', '', 'Cayenne de Paris', 'Paris', 'Événement', 'Oui', 'Choisissez repas seulement, repas et aide aux organisateurs, ou aide sans repas. Horaires à confirmer.', 'Repas et aide'],
      ['TPL-RECEPTION-SAMEDI', 'Réception — samedi', 'Autre', 'Réception — samedi', '', '', 'Cayenne de Paris', 'Paris', 'Événement', 'Oui', 'Indiquez votre présence le matin et/ou le soir. Horaires à confirmer.', 'Réception'],
      ['TPL-JEUNES', 'Réunion des jeunes', 'Réunion des jeunes', 'Réunion des jeunes', '19:00', '22:00', 'Cayenne de Paris', 'Paris', 'Réunion', 'Oui', 'Horaire probable : 19 h. Date à préciser par le bureau.'],
      ['TPL-COMPAGNONS', 'Réunion compagnon', 'Réunion compagnon', 'Réunion compagnon', '19:00', '22:00', 'Cayenne de Paris', 'Paris', 'Réunion', 'Oui', 'Horaire probable : 19 h. Date à préciser par le bureau.'],
      ['TPL-COURS', 'Cours en Cayenne', 'Cours en Cayenne', 'Cours en Cayenne', '09:00', '12:00', 'Cayenne de Paris', 'Paris', 'Cours', 'Oui', 'Cours ou atelier à préciser'],
      ['TPL-FETE-JUIN', 'Fête de juin', 'Fête de juin', 'Fête de juin', '08:00', '23:00', 'Cayenne de Paris', 'Paris', 'Événement', 'Oui', 'Fête annuelle de juin'],
      ['TPL-FETE-NOVEMBRE', 'Fête de novembre', 'Fête de novembre', 'Fête de novembre', '08:00', '23:00', 'Cayenne de Paris', 'Paris', 'Événement', 'Oui', 'Fête annuelle de novembre'],
      ['TPL-JEP', 'Journées européennes du patrimoine', 'JEP', 'Journées européennes du patrimoine', '09:00', '18:00', 'Cayenne de Paris', 'Paris', 'Événement', 'Oui', 'JEP'],
      ['TPL-AG', 'Assemblée générale', 'Autre', 'Assemblée générale', '19:30', '22:00', 'Cayenne de Paris', 'Paris', 'Réunion', 'Oui', 'Assemblée générale'],
      ['TPL-TRAVAIL-UC', 'Travail UC', 'Autre', 'Travail UC', '09:00', '17:00', 'Cayenne de Paris', 'Paris', 'Travail', 'Oui', 'Travail compagnonnique à préciser']
    ]
  }
};

// Shared by web requests and spreadsheet menu actions; never depends on an open tab.
let ucSpreadsheet_;
function getSpreadsheet_() {
  if (!ucSpreadsheet_) ucSpreadsheet_ = SpreadsheetApp.openById(UC_APP.spreadsheetId);
  return ucSpreadsheet_;
}

// Run once in the Apps Script editor to grant access and verify the connection.
function verifierConnexionSheet_() {
  const ss = getSpreadsheet_();
  const result = {
    ok: true,
    spreadsheetId: ss.getId(),
    spreadsheetName: ss.getName(),
    events: getRowsAsObjects_(UC_APP.sheets.calendrier).length,
    responses: getRowsAsObjects_(UC_APP.sheets.reponses).length
  };
  console.log(JSON.stringify(result));
  return result;
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Présences UC')
    .addItem('Installer / réparer le classeur', 'setupSystem_')
    .addItem('Actualiser le dashboard', 'refreshDashboardSheet_')
    .addItem('Générer les feuilles événement', 'generateAllEventSheetsForActiveYear_')
    .addItem('Exporter la feuille active en PDF', 'exportActiveSheetPdf_')
    .addToUi();
}

function doGet(e) {
  const page = String(e && e.parameter && e.parameter.page || 'public').toLowerCase();
  const templateName = page === 'admin' ? 'Admin' : 'Public';
  const template = HtmlService.createTemplateFromFile(templateName);
  const urls = getAppUrls_();
  template.publicUrl = urls.publicUrl;
  template.adminUrl = urls.adminUrl;

  return template
    .evaluate()
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setTitle(page === 'admin' ? 'Dashboard admin - Présences Cayenne de Paris' : 'Présences Cayenne de Paris')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function setupSystem_() {
  const ss = getSpreadsheet_();
  ensureSheet_(ss, UC_APP.sheets.parametres);
  ensureSheet_(ss, UC_APP.sheets.membres);
  ensureSheet_(ss, UC_APP.sheets.calendrier);
  ensureSheet_(ss, UC_APP.sheets.reponses);
  ensureSheet_(ss, UC_APP.sheets.suivi);
  ensureSheet_(ss, UC_APP.sheets.dashboard);
  ensureSheet_(ss, UC_APP.sheets.modeleCr);
  ensureSheet_(ss, UC_APP.sheets.eventBase);

  setupParametres_(ss.getSheetByName(UC_APP.sheets.parametres));
  setupTable_(ss.getSheetByName(UC_APP.sheets.membres), UC_APP.headers.membres);
  setupTable_(ss.getSheetByName(UC_APP.sheets.calendrier), UC_APP.headers.calendrier);
  setupTable_(ss.getSheetByName(UC_APP.sheets.reponses), UC_APP.headers.reponses);
  setupTable_(ss.getSheetByName(UC_APP.sheets.eventBase), UC_APP.headers.eventBase);
  seedEventBase_(ss.getSheetByName(UC_APP.sheets.eventBase));
  seedCalendar_(ss.getSheetByName(UC_APP.sheets.calendrier));
  setupSuiviSheet_(ss.getSheetByName(UC_APP.sheets.suivi));
  refreshDashboardSheet_();
  setupModeleCr_(ss.getSheetByName(UC_APP.sheets.modeleCr));
  applyValidations_();
  const eventSheets = generateAllEventSheets_(getSettings_().annee_active);

  return {
    ok: true,
    message: 'Classeur prêt. ' + eventSheets.length + ' feuille(s) événement générée(s). Complétez MEMBRES et CALENDRIER, puis déployez le formulaire.'
  };
}

function getPublicConfig(token, requestedYear) {
  const member = assertMember_(token);
  setupSystemIfMissing_();
  const settings = getSettings_();
  const urls = getAppUrls_(settings);
  const year = requestedYear == null || requestedYear === '' ? Number(settings.annee_active || UC_APP.defaults.activeYear) : Number(requestedYear);
  if (!Number.isInteger(year) || year < 2020 || year > 2100) throw new Error('Année invalide.');
  return {
    activeYear: year,
    profile: memberProfile_(member),
    responses: memberResponses_(member, year),
    urls: { publicUrl: urls.publicUrl },
    statuses: getOptionList_('D', UC_APP.defaults.statuses),
    cayennes: getOptionList_('E', UC_APP.defaults.cayennes),
    responseTypes: UC_APP.defaults.reponses.filter(function(v) { return v !== 'Disponible pour aider'; }),
    causes: Array.from(new Set(getOptionList_('G', UC_APP.defaults.causes).concat(['Autres']))),
    eventTypes: getOptionList_('H', UC_APP.defaults.eventTypes),
    events: getEventsForYear_(year).map(formatEventForClient_)
  };
}

function getBootstrapConfig() {
  setupSystemIfMissing_();
  const settings = getSettings_();
  return {
    activeYear: Number(settings.annee_active || UC_APP.defaults.activeYear),
    urls: getAppUrls_(settings),
    eventTemplates: getEventTemplates_(),
    eventTypes: getOptionList_('H', UC_APP.defaults.eventTypes),
    cayennes: getOptionList_('E', UC_APP.defaults.cayennes)
  };
}

function getAdminConfig(adminPin) {
  assertAdmin_(adminPin);
  setupSystemIfMissing_();
  const settings = getSettings_();
  return {
    activeYear: Number(settings.annee_active || UC_APP.defaults.activeYear),
    urls: getAppUrls_(settings),
    eventTemplates: getEventTemplates_(),
    eventTypes: getOptionList_('H', UC_APP.defaults.eventTypes),
    cayennes: getOptionList_('E', UC_APP.defaults.cayennes)
  };
}

function createEventFromTemplate(payload, adminPin) {
  assertAdmin_(adminPin);
  setupSystemIfMissing_();
  payload = payload || {};

  const date = parseInputDate_(payload.date);
  if (!date) throw new Error('Date obligatoire pour créer l’événement.');

  const templates = getEventTemplates_();
  const template = templates.filter(function(row) { return row.id === clean_(payload.templateId); })[0] || {};
  const title = clean_(payload.title || template.defaultTitle || template.name);
  if (!title) throw new Error('Titre obligatoire.');

  const event = {
    ID_Evenement: makeEventId_(date, title),
    Annee: date.getFullYear(),
    Date: date,
    Titre: title,
    Type_Evenement: clean_(payload.type || template.type || 'Autre'),
    Heure_Debut: clean_(payload.start || template.start),
    Heure_Fin: clean_(payload.end || template.end),
    Lieu: clean_(payload.place || template.place || 'Cayenne de Paris'),
    Cayenne: clean_(payload.cayenne || template.cayenne || 'Paris'),
    Categorie_CR: clean_(payload.category || template.category || 'Événement'),
    Actif: clean_(payload.active || template.active || 'Oui'),
    Commentaire: clean_(payload.comment || template.comment),
    Modalites: clean_(payload.modalites || template.modalites || 'Standard')
  };

  if (!['Standard', 'Repas et aide', 'Réception'].includes(event.Modalites)) throw new Error('Modalités invalides.');
  const sheet = getSpreadsheet_().getSheetByName(UC_APP.sheets.calendrier);
  sheet.appendRow([
    event.ID_Evenement,
    event.Annee,
    event.Date,
    event.Titre,
    event.Type_Evenement,
    event.Heure_Debut,
    event.Heure_Fin,
    event.Lieu,
    event.Cayenne,
    event.Categorie_CR,
    event.Actif,
    event.Commentaire,
    event.Modalites
  ]);
  sheet.getRange(sheet.getLastRow(), 3).setNumberFormat('yyyy-mm-dd');
  refreshDashboardSheet_();

  return {
    ok: true,
    event: formatEventForClient_(event),
    message: 'Événement créé : ' + event.Titre
  };
}

function submitResponses(payload, token) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    return submitMemberResponses_(payload, assertMember_(token));
  } finally { lock.releaseLock(); }
}

function submitMemberResponses_(payload, member) {
  setupSystemIfMissing_();
  payload = Object.assign({}, payload || {}, memberProfile_(member));
  if (!payload.nom || !payload.prenom || !getOptionList_('D', UC_APP.defaults.statuses).includes(payload.statut) || !getOptionList_('E', UC_APP.defaults.cayennes).includes(payload.cayenne)) throw new Error('Votre profil doit être corrigé par le bureau : statut ou Cayenne invalide.');
  if (!/^[a-zA-Z0-9-]{16,80}$/.test(payload.requestId || '')) throw new Error('Actualisez la page avant de réessayer.');
  const batch = Array.isArray(payload.answers);
  const answers = batch ? payload.answers : Array.from(new Set(payload.eventIds || [])).map(function(id) { return Object.assign({}, payload, {eventId:id}); });
  if (!answers.length || answers.length > 200) throw new Error('Répondez à au moins un événement (200 maximum par envoi).');
  const eventsById = indexBy_(getRowsAsObjects_(UC_APP.sheets.calendrier), 'ID_Evenement');
  const seen = new Set();
  const causesAllowed = getOptionList_('G', UC_APP.defaults.causes).concat(['Autres']);
  // Validate the entire batch before writing a single response.
  const normalized = answers.map(function(answer) {
    const a = Object.assign({}, answer);
    a.eventId = clean_(a.eventId);
    const event = eventsById[a.eventId];
    if (!event || !isActive_(event.Actif)) throw new Error('Un événement sélectionné n’est plus disponible. Actualisez le calendrier.');
    if (seen.has(a.eventId)) throw new Error('Un événement apparaît deux fois dans votre envoi.');
    seen.add(a.eventId);
    a.reponse = clean_(a.reponse);
    if (!UC_APP.defaults.reponses.includes(a.reponse)) throw new Error('Réponse invalide.');
    const legacyAid = a.reponse === 'Disponible pour aider';
    if (legacyAid) a.reponse = 'Présent';
    a.causes = Array.isArray(a.causes) ? a.causes.map(clean_).filter(Boolean) : [];
    if (a.causes.some(function(c) { return !causesAllowed.includes(c); })) throw new Error('Motif d’absence invalide.');
    ['precision','commentaire'].forEach(function(key) { a[key] = clean_(a[key]); if (a[key].length > 2000) throw new Error('Limitez vos précisions à 2 000 caractères.'); });
    if (a.reponse !== 'Absent excusé') { a.causes = []; a.precision = ''; }
    else {
      if (batch && !a.causes.length) throw new Error('Choisissez un motif pour votre excuse.');
      if ((a.causes.includes('Autres') || a.causes.includes('Engagement compagnonnique ailleurs')) && !a.precision) throw new Error('Précisez le motif de votre excuse.');
    }
    a.participation = clean_(a.participation);
    a.creneaux = Array.isArray(a.creneaux) ? Array.from(new Set(a.creneaux.map(clean_))) : [];
    const mode = clean_(event.Modalites || 'Standard');
    if (a.reponse !== 'Présent') { a.participation = ''; a.creneaux = []; }
    else if (mode === 'Repas et aide') {
      if (!['Repas seulement', 'Repas et aide', 'Aide seulement (sans repas)'].includes(a.participation)) throw new Error('Choisissez votre participation au repas et à l’aide.');
      a.creneaux = [];
    } else if (mode === 'Réception') {
      if (!a.creneaux.length || a.creneaux.some(function(v) { return !['Matin', 'Soir'].includes(v); })) throw new Error('Choisissez le matin et/ou le soir pour la réception.');
      a.participation = '';
    } else { a.participation = ''; a.creneaux = []; }
    a.aide = a.reponse === 'Présent' && (mode === 'Repas et aide' ? a.participation !== 'Repas seulement' : legacyAid || a.aideDisponible === true);
    ['heureDebutAide', 'heureFinAide'].forEach(function(key) {
      a[key] = a.aide ? clean_(a[key]) : '';
      if (a[key] && !/^([01]\d|2[0-3]):[0-5]\d$/.test(a[key])) throw new Error('Horaire d’aide invalide.');
    });
    return a;
  });
  const sheet = getSpreadsheet_().getSheetByName(UC_APP.sheets.reponses);
  const existingIds = new Set(getRowsAsObjects_(UC_APP.sheets.reponses).map(function(r) { return r.ID_Reponse; }));
  const now = new Date(), key = personKey_(payload.nom, payload.prenom, payload.email);
  const savedRows = [];
  normalized.forEach(function(a) {
    const event = eventsById[a.eventId], date = asDate_(event.Date);
    const responseId = payload.requestId + ':' + accessHash_(key) + ':' + a.eventId;
    if (existingIds.has(responseId)) return;
    savedRows.push([responseId, now, 'Réponse événement', Number(event.Annee), event.ID_Evenement, date, event.Titre, event.Type_Evenement,
      payload.nom, payload.prenom, clean_(payload.email), clean_(payload.telephone), payload.statut, payload.cayenne,
      a.reponse, a.causes.join(' ; '), a.precision, a.aide ? 'Oui' : 'Non', a.heureDebutAide, a.heureFinAide, a.commentaire, key,
      date ? Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM') : '', date ? getWeekNumber_(date) : '', '', a.participation, a.creneaux.join(' ; ')]);
  });
  if (savedRows.length) sheet.getRange(sheet.getLastRow() + 1, 1, savedRows.length, UC_APP.headers.reponses.length).setValues(savedRows.map(function(row) { return row.map(sheetLiteral_); }));
  let warning = '';
  try {
    refreshDashboardSheet_();
    savedRows.forEach(function(row) { generateEventSheet_(row[4]); });
  } catch (error) { warning = 'Réponses enregistrées. Le bureau devra actualiser les feuilles de suivi.'; }
  return {ok:true, saved:answers.length, warning:warning, message:answers.length + ' réponse(s) enregistrée(s). Vous pouvez les modifier à tout moment.'};
}

function getDashboardData(year, adminPin) {
  assertAdmin_(adminPin);
  setupSystemIfMissing_();
  return computeDashboard_(Number(year || getSettings_().annee_active || UC_APP.defaults.activeYear));
}

function generateEventSheet(eventId, adminPin) {
  assertAdmin_(adminPin);
  return generateEventSheet_(eventId);
}

function generateEventSheet_(eventId) {
  setupSystemIfMissing_();

  const events = getRowsAsObjects_(UC_APP.sheets.calendrier);
  const event = events.filter(function(row) { return row.ID_Evenement === eventId; })[0];
  if (!event) throw new Error('Événement introuvable.');

  const ss = getSpreadsheet_();
  const sheetName = makeCrSheetName_(event);
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);
  sheet.clear();
  sheet.setHiddenGridlines(true);

  const rows = buildEventRows_(event.ID_Evenement);
  const presentCount = rows.filter(function(row) { return row.reponse === 'Présent'; }).length;
  const excusedCount = rows.filter(function(row) { return row.reponse === 'Absent excusé'; }).length;
  const noResponseCount = rows.filter(function(row) { return row.reponse === 'Sans réponse'; }).length;
  const aidCount = rows.filter(function(row) { return row.aide === 'Oui'; }).length;

  sheet.getRange('A1:I1').merge().setValue('Compte rendu présences - ' + event.Titre);
  sheet.getRange('A2:I2').merge().setValue(formatDate_(event.Date) + ' | ' + event.Type_Evenement + ' | ' + (event.Lieu || 'Lieu à préciser'));
  sheet.getRange('A1:I2').setFontWeight('bold').setFontColor('#FFFFFF').setBackground('#7A1F2B');
  sheet.getRange('A1').setFontSize(16);

  sheet.getRange('A4:B8').setValues([
    ['Présents', presentCount],
    ['Absents excusés', excusedCount],
    ['Sans réponse', noResponseCount],
    ['Disponibles pour aider', aidCount],
    ['Total suivi', rows.length]
  ]);
  sheet.getRange('D4:E6').setValues([['Absents', rows.filter(function(r) { return r.reponse === 'Absent'; }).length], ['Indécis', rows.filter(function(r) { return r.reponse === 'Je ne sais pas encore'; }).length], ['Repas confirmés', rows.filter(function(r) { return r.reponse === 'Présent' && ['Repas seulement', 'Repas et aide'].includes(r.participation); }).length]]);
  sheet.getRange('A4:A8').setFontWeight('bold').setBackground('#F2E7E9');
  sheet.getRange('B4:B8').setNumberFormat('0');

  const headers = ['Nom', 'Prénom', 'Statut', 'Cayenne', 'Réponse', 'Cause', 'Précision', 'Aide', 'Horaire', 'Participation repas / aide', 'Créneaux', 'Commentaire'];
  sheet.getRange(10, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(10, 1, 1, headers.length).setFontWeight('bold').setFontColor('#FFFFFF').setBackground('#3F3F46');

  if (rows.length) {
    const values = rows.map(function(row) {
      return [
        row.nom,
        row.prenom,
        row.statut,
        row.cayenne,
        row.reponse,
        row.causes,
        row.precision,
        row.aide,
        [row.heureDebut, row.heureFin].filter(Boolean).join(' - '),
        row.participation, row.creneaux, row.commentaire
      ];
    });
    sheet.getRange(11, 1, values.length, headers.length).setValues(values.map(function(row) { return row.map(sheetLiteral_); }));
  }

  sheet.autoResizeColumns(1, headers.length);
  sheet.setFrozenRows(10);
  colorResponseColumn_(sheet, 11, Math.max(rows.length, 1));
  markResponseReportSheet_(event.ID_Evenement, sheetName);

  return {
    ok: true,
    sheetName: sheetName,
    sheetUrl: ss.getUrl() + '#gid=' + sheet.getSheetId(),
    counts: {
      presents: presentCount,
      excuses: excusedCount,
      sansReponse: noResponseCount,
      aides: aidCount
    }
  };
}

function generateAllEventSheets(year, adminPin) {
  assertAdmin_(adminPin);
  return generateAllEventSheets_(year);
}

function generateAllEventSheets_(year) {
  const targetYear = Number(year || getSettings_().annee_active || UC_APP.defaults.activeYear);
  const events = getEventsForYear_(targetYear);
  return events.map(function(event) {
    return generateEventSheet_(event.ID_Evenement);
  });
}

function generateAllEventSheetsForActiveYear_() {
  const results = generateAllEventSheets_(getSettings_().annee_active);
  SpreadsheetApp.getUi().alert(results.length + ' feuille(s) événement générée(s).');
}

function refreshDashboardSheet_() {
  const ss = getSpreadsheet_();
  const sheet = ss.getSheetByName(UC_APP.sheets.dashboard);
  if (!sheet) return;
  if (sheet.getMaxColumns() < 22) sheet.insertColumnsAfter(sheet.getMaxColumns(), 22 - sheet.getMaxColumns());
  const settings = getSettings_();
  const year = Number(settings.annee_active || UC_APP.defaults.activeYear);
  const data = computeDashboard_(year);
  setupSuiviSheet_(ss.getSheetByName(UC_APP.sheets.suivi), data);

  sheet.clear();
  sheet.setHiddenGridlines(true);
  sheet.getRange('A1:H1').merge().setValue('Dashboard annuel des présences - ' + year);
  sheet.getRange('A1').setFontSize(16).setFontWeight('bold').setFontColor('#FFFFFF').setBackground('#7A1F2B');

  sheet.getRange('A3:B8').setValues([
    ['Événements actifs', data.kpis.events],
    ['Membres actifs', data.kpis.members],
    ['Présents', data.kpis.presents],
    ['Absents excusés', data.kpis.excused],
    ['Sans réponse', data.kpis.noResponse],
    ['Aides proposées', data.kpis.aids]
  ]);
  sheet.getRange('A3:A8').setFontWeight('bold').setBackground('#F2E7E9');
  sheet.getRange('B3:B8').setFontWeight('bold').setNumberFormat('0');

  const urls = getAppUrls_(settings);
  if (urls.publicUrl || urls.adminUrl) {
    sheet.getRange('A10:B11').clearContent();
    sheet.getRange('A10:A11')
      .setValues([['Formulaire public'], ['Dashboard admin']])
      .setFontWeight('bold')
      .setBackground('#F2E7E9');
    setLinkedText_(sheet.getRange('B10'), 'Ouvrir le formulaire public', urls.publicUrl);
    setLinkedText_(sheet.getRange('B11'), 'Ouvrir le dashboard admin', urls.adminUrl);
  }

  sheet.getRange('D3:J3').setValues([['Événement', 'Date', 'Présents', 'Excusés', 'Sans réponse', 'Absents', 'Indécis']]);
  sheet.getRange('D3:J3').setFontWeight('bold').setFontColor('#FFFFFF').setBackground('#3F3F46');
  const eventRows = data.events.map(function(event) {
    return [event.title, event.date, event.presents, event.excused, event.noResponse, event.absent, event.undecided];
  });
  if (eventRows.length) sheet.getRange(4, 4, eventRows.length, 7).setValues(eventRows);

  sheet.getRange('U3:V4').setValues([['Absents sans excuse', data.kpis.absent], ['Indécis', data.kpis.undecided]]);
  const causeRows = data.causes.map(function(cause) {
    return [cause.cause, cause.count];
  });
  sheet.getRange('A13:B13').setValues([['Causes d’absence', 'Total']]);
  sheet.getRange('A13:B13').setFontWeight('bold').setFontColor('#FFFFFF').setBackground('#3F3F46');
  if (causeRows.length) sheet.getRange(14, 1, causeRows.length, 2).setValues(causeRows);

  const memberRows = data.members.map(function(member) {
    return [member.nom, member.prenom, member.statut, member.cayenne, member.presents, member.excused, member.noResponse, member.aids, member.presenceRate, member.absent, member.undecided];
  });
  sheet.getRange('A23:K23').setValues([['Nom', 'Prénom', 'Statut', 'Cayenne', 'Présences', 'Excusés', 'Sans réponse', 'Aides', 'Taux', 'Absents', 'Indécis']]);
  sheet.getRange('A23:K23').setFontWeight('bold').setFontColor('#FFFFFF').setBackground('#3F3F46');
  if (memberRows.length) {
    sheet.getRange(24, 1, memberRows.length, 11).setValues(memberRows);
    sheet.getRange(24, 9, memberRows.length, 1).setNumberFormat('0%');
  }

  sheet.getRange('K3:S3').setValues([['Mois', 'Événements', 'Réponses', 'Présences', 'Excusés', 'Aides', 'Sans réponse', 'Absents', 'Indécis']]);
  sheet.getRange('K3:S3').setFontWeight('bold').setFontColor('#FFFFFF').setBackground('#3F3F46');
  const monthlyRows = data.monthly.map(function(month) {
    return [month.label, month.events, month.responses, month.presents, month.excused, month.aids, month.noResponse, month.absent, month.undecided];
  });
  if (monthlyRows.length) sheet.getRange(4, 11, monthlyRows.length, 9).setValues(monthlyRows);

  sheet.autoResizeColumns(1, 22);
}

function exportActiveSheetPdf_() {
  const ss = getSpreadsheet_();
  const sheet = ss.getActiveSheet();
  const file = exportSheetToPdf_(sheet);
  SpreadsheetApp.getUi().alert('PDF créé : ' + file.getUrl());
}

function setupSystemIfMissing_() {
  const ss = getSpreadsheet_();
  if (!ss.getSheetByName(UC_APP.sheets.reponses) || !ss.getSheetByName(UC_APP.sheets.eventBase)) setupSystem_();
  ensureParticipationSchema_();
}

function ensureSheet_(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function setupTable_(sheet, headers) {
  if (sheet.getLastRow() === 0 || sheet.getRange(1, 1).getValue() === '') {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else {
    const current = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
    const shouldRewrite = headers.some(function(header, index) { return current[index] !== header; });
    if (shouldRewrite) sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setFontColor('#FFFFFF').setBackground('#7A1F2B');
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);
}

function setupParametres_(sheet) {
  const existingSettings = getSettingsFromSheet_(sheet);
  const publicUrl = clean_(existingSettings.web_app_url || UC_APP.defaults.webAppUrl);
  const adminUrl = clean_(existingSettings.admin_app_url || makeAdminUrl_(publicUrl));

  sheet.clear();
  sheet.setHiddenGridlines(true);
  sheet.getRange('A1:C1').setValues([['Paramètre', 'Valeur', 'Description']]);
  sheet.getRange('A1:C1').setFontWeight('bold').setFontColor('#FFFFFF').setBackground('#7A1F2B');
  sheet.getRange('A2:C8').setValues([
    ['annee_active', existingSettings.annee_active || UC_APP.defaults.activeYear, 'Année suivie par défaut'],
    ['cayenne_principale', existingSettings.cayenne_principale || 'Paris', 'Cayenne proposée en premier'],
    ['admin_pin', existingSettings.admin_pin || UC_APP.defaults.adminPin, 'Code d’accès au dashboard admin'],
    ['nom_application', existingSettings.nom_application || 'Présences Cayenne de Paris', 'Titre affiché dans le formulaire'],
    ['derniere_generation', '', 'Renseigné automatiquement si besoin'],
    ['web_app_url', publicUrl, 'Lien public du formulaire Apps Script déployé'],
    ['admin_app_url', adminUrl, 'Lien séparé du dashboard admin']
  ]);

  writeVerticalList_(sheet, 'D', 'Statuts', UC_APP.defaults.statuses);
  writeVerticalList_(sheet, 'E', 'Cayennes', UC_APP.defaults.cayennes);
  writeVerticalList_(sheet, 'F', 'Réponses', UC_APP.defaults.reponses);
  writeVerticalList_(sheet, 'G', 'Causes', UC_APP.defaults.causes);
  writeVerticalList_(sheet, 'H', 'Types événements', UC_APP.defaults.eventTypes);
  sheet.autoResizeColumns(1, 8);
}

function setupSuiviSheet_(sheet, data) {
  if (!sheet) return;
  data = data || computeDashboard_(Number(getSettings_().annee_active || UC_APP.defaults.activeYear));
  sheet.clear();
  sheet.setHiddenGridlines(true);
  sheet.getRange('A1:M1').merge().setValue('Suivi annuel par personne — ' + data.year);
  const headers = ['Nom', 'Prénom', 'Statut', 'Cayenne', 'Clé personne', 'Présences', 'Excusés', 'Absents', 'Indécis', 'Sans réponse', 'Aides', 'Taux présence', 'Dernière réponse'];
  sheet.getRange(3, 1, 1, headers.length).setValues([headers]).setFontWeight('bold').setFontColor('#FFFFFF').setBackground('#7A1F2B');
  const rows = data.members.map(function(m) { return [m.nom, m.prenom, m.statut, m.cayenne, m.key, m.presents, m.excused, m.absent, m.undecided, m.noResponse, m.aids, m.presenceRate, m.lastResponse]; });
  if (rows.length) {
    sheet.getRange(4, 1, rows.length, headers.length).setValues(rows.map(function(row) { return row.map(sheetLiteral_); }));
    sheet.getRange(4, 12, rows.length, 1).setNumberFormat('0%');
  }
  sheet.setFrozenRows(3);
  sheet.autoResizeColumns(1, headers.length);
}

function setupModeleCr_(sheet) {
  sheet.clear();
  sheet.setHiddenGridlines(true);
  sheet.getRange('A1:I1').merge().setValue('Modèle de feuille événement');
  sheet.getRange('A1').setFontSize(16).setFontWeight('bold').setFontColor('#FFFFFF').setBackground('#7A1F2B');
  sheet.getRange('A3:I3').merge().setValue('Le menu Présences UC génère automatiquement une feuille CR_ par événement. Cette feuille sert seulement de modèle visuel.');
  sheet.getRange('A5:B9').setValues([
    ['Présents', ''],
    ['Absents excusés', ''],
    ['Sans réponse', ''],
    ['Disponibles pour aider', ''],
    ['Total suivi', '']
  ]);
  sheet.getRange('A11:I11').setValues([['Nom', 'Prénom', 'Statut', 'Cayenne', 'Réponse', 'Cause', 'Précision', 'Aide', 'Horaire']]);
  sheet.getRange('A11:I11').setFontWeight('bold').setFontColor('#FFFFFF').setBackground('#3F3F46');
  sheet.autoResizeColumns(1, 9);
}

function seedCalendar_(sheet) {
  if (sheet.getLastRow() > 1) return;
  const year = UC_APP.defaults.activeYear;
  const rows = [
    ['EVT-2026-JEUNES-01', year, new Date(year, 0, 15), 'Réunion des jeunes janvier', 'Réunion des jeunes', '19:00', '22:00', 'Cayenne de Paris', 'Paris', 'Réunion', 'Oui', 'Exemple à ajuster'],
    ['EVT-2026-COMPAGNONS-01', year, new Date(year, 1, 12), 'Réunion compagnon février', 'Réunion compagnon', '19:00', '22:00', 'Cayenne de Paris', 'Paris', 'Réunion', 'Oui', 'Exemple à ajuster'],
    ['EVT-2026-COURS-01', year, new Date(year, 2, 14), 'Cours en Cayenne', 'Cours en Cayenne', '09:00', '12:00', 'Cayenne de Paris', 'Paris', 'Cours', 'Oui', 'Date exemple'],
    ['EVT-2026-FETE-JUIN', year, new Date(year, 5, 20), 'Fête de juin', 'Fête de juin', '08:00', '23:00', 'Cayenne de Paris', 'Paris', 'Événement', 'Oui', 'Date à confirmer'],
    ['EVT-2026-JEP', year, new Date(year, 8, 19), 'Journées européennes du patrimoine', 'JEP', '09:00', '18:00', 'Cayenne de Paris', 'Paris', 'Événement', 'Oui', 'Date à confirmer'],
    ['EVT-2026-FETE-NOVEMBRE', year, new Date(year, 10, 21), 'Fête de novembre', 'Fête de novembre', '08:00', '23:00', 'Cayenne de Paris', 'Paris', 'Événement', 'Oui', 'Date à confirmer']
  ];
  sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  sheet.getRange(2, 3, rows.length, 1).setNumberFormat('yyyy-mm-dd');
}

function seedEventBase_(sheet) {
  const existing = getRowsAsObjects_(UC_APP.sheets.eventBase)
    .map(function(row) { return clean_(row.Template_ID); })
    .filter(Boolean);
  const existingMap = {};
  existing.forEach(function(id) { existingMap[id] = true; });
  const missing = UC_APP.defaults.eventTemplates.filter(function(row) {
    return !existingMap[row[0]];
  });
  if (!missing.length) return;
  sheet.getRange(sheet.getLastRow() + 1, 1, missing.length, UC_APP.headers.eventBase.length).setValues(missing.map(function(row) { return row.length === 12 ? row : row.concat(['Standard']); }));
  sheet.autoResizeColumns(1, UC_APP.headers.eventBase.length);
}

function applyValidations_() {
  const ss = getSpreadsheet_();
  const membres = ss.getSheetByName(UC_APP.sheets.membres);
  const calendrier = ss.getSheetByName(UC_APP.sheets.calendrier);
  const reponses = ss.getSheetByName(UC_APP.sheets.reponses);
  const statuses = getOptionList_('D', UC_APP.defaults.statuses);
  const cayennes = getOptionList_('E', UC_APP.defaults.cayennes);
  const responseTypes = ['Présent', 'Absent', 'Je ne sais pas encore', 'Absent excusé'];
  const eventTypes = getOptionList_('H', UC_APP.defaults.eventTypes);

  setListValidation_(membres.getRange('C2:C500'), statuses);
  setListValidation_(membres.getRange('D2:D500'), cayennes);
  setListValidation_(membres.getRange('G2:G500'), ['Oui', 'Non']);
  setListValidation_(calendrier.getRange('E2:E500'), eventTypes);
  setListValidation_(calendrier.getRange('I2:I500'), cayennes);
  setListValidation_(calendrier.getRange('K2:K500'), ['Oui', 'Non']);
  const eventBase = ss.getSheetByName(UC_APP.sheets.eventBase);
  if (eventBase) {
    setListValidation_(eventBase.getRange('C2:C200'), eventTypes);
    setListValidation_(eventBase.getRange('H2:H200'), cayennes);
    setListValidation_(eventBase.getRange('J2:J200'), ['Oui', 'Non']);
  }
  setListValidation_(reponses.getRange('M2:M2000'), statuses);
  setListValidation_(reponses.getRange('N2:N2000'), cayennes);
  setListValidation_(reponses.getRange('O2:O2000'), responseTypes);
  setListValidation_(reponses.getRange('R2:R2000'), ['Oui', 'Non']);
}

function setListValidation_(range, values) {
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(values, true)
    .setAllowInvalid(false)
    .build();
  range.setDataValidation(rule);
}

function writeVerticalList_(sheet, columnLetter, title, values) {
  sheet.getRange(columnLetter + '1').setValue(title).setFontWeight('bold').setFontColor('#FFFFFF').setBackground('#3F3F46');
  sheet.getRange(columnLetter + '2:' + columnLetter + (values.length + 1)).setValues(values.map(function(value) { return [value]; }));
}

function getOptionList_(columnLetter, fallback) {
  const sheet = getSpreadsheet_().getSheetByName(UC_APP.sheets.parametres);
  if (!sheet) return fallback;
  const values = sheet.getRange(columnLetter + '2:' + columnLetter + '100').getValues()
    .map(function(row) { return clean_(row[0]); })
    .filter(Boolean);
  return values.length ? values : fallback;
}

function getSettings_() {
  const sheet = getSpreadsheet_().getSheetByName(UC_APP.sheets.parametres);
  return getSettingsFromSheet_(sheet);
}

function getSettingsFromSheet_(sheet) {
  if (!sheet || sheet.getLastRow() < 2) return {};
  const lastRow = Math.min(sheet.getLastRow(), 50);
  const values = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
  return values.reduce(function(settings, row) {
    const key = clean_(row[0]);
    if (key) settings[key] = row[1];
    return settings;
  }, {});
}

function getAppUrls_(settings) {
  // Use the deployed service URL so a newly published app does not send its
  // visitors back to an older deployment. The fallback also supports editor
  // actions and previews without exposing a /dev link to members.
  let publicUrl = UC_APP.defaults.webAppUrl;
  try {
    const serviceUrl = clean_(ScriptApp.getService().getUrl());
    if (/^https:\/\/script\.google\.com\/macros\/s\/AKfy[A-Za-z0-9_-]+\/exec$/.test(serviceUrl)) {
      publicUrl = serviceUrl;
    }
  } catch (error) {
    // The configured public URL remains available outside a web app context.
  }
  const adminUrl = makeAdminUrl_(publicUrl);
  return {
    publicUrl: publicUrl,
    adminUrl: adminUrl
  };
}

function makeAdminUrl_(publicUrl) {
  const url = clean_(publicUrl || UC_APP.defaults.webAppUrl);
  if (!url) return '';
  if (url.indexOf('page=admin') !== -1) return url;
  return url + (url.indexOf('?') === -1 ? '?' : '&') + 'page=admin';
}

function setLinkedText_(range, text, url) {
  const label = clean_(text);
  if (!label) {
    range.clearContent();
    return;
  }
  range.setRichTextValue(
    SpreadsheetApp.newRichTextValue()
      .setText(label)
      .setLinkUrl(clean_(url || label))
      .build()
  );
}

function assertAdmin_(pin) {
  const session = accessSession_(pin, 'bureau');
  if (session.version !== accessHash_(clean_(getSettings_().admin_pin))) throw new Error('SESSION_EXPIRED: Reconnectez-vous avec le code du bureau.');
}

function getEventsForYear_(year) {
  return getRowsAsObjects_(UC_APP.sheets.calendrier)
    .filter(function(row) {
      return Number(row.Annee) === Number(year) && isActive_(row.Actif);
    })
    .sort(function(a, b) { return asDate_(a.Date) - asDate_(b.Date); });
}

function formatEventForClient_(event) {
  return {
    id: event.ID_Evenement,
    year: Number(event.Annee),
    date: formatDate_(event.Date),
    title: event.Titre,
    type: event.Type_Evenement,
    start: formatEventTime_(event.Heure_Debut),
    end: formatEventTime_(event.Heure_Fin),
    place: event.Lieu,
    cayenne: event.Cayenne,
    comment: clean_(event.Commentaire),
    modalites: clean_(event.Modalites || 'Standard')
  };
}

function getEventTemplates_() {
  const rows = getRowsAsObjects_(UC_APP.sheets.eventBase);
  const source = rows.concat(UC_APP.defaults.eventTemplates.filter(function(row) { return !rows.some(function(r) { return r.Template_ID === row[0]; }); }).map(function(row) {
    return {
      Template_ID: row[0],
      Nom_Modele: row[1],
      Type_Evenement: row[2],
      Titre_Par_Defaut: row[3],
      Heure_Debut: row[4],
      Heure_Fin: row[5],
      Lieu: row[6],
      Cayenne: row[7],
      Categorie_CR: row[8],
      Actif: row[9],
      Commentaire: row[10],
      Modalites: row[11] || 'Standard'
    };
  }));

  return source
    .filter(function(row) { return clean_(row.Template_ID) && isActive_(row.Actif); })
    .map(function(row) {
      return {
        id: clean_(row.Template_ID),
        name: clean_(row.Nom_Modele),
        type: clean_(row.Type_Evenement),
        defaultTitle: clean_(row.Titre_Par_Defaut),
        start: formatEventTime_(row.Heure_Debut),
        end: formatEventTime_(row.Heure_Fin),
        place: clean_(row.Lieu),
        cayenne: clean_(row.Cayenne),
        category: clean_(row.Categorie_CR),
        active: clean_(row.Actif || 'Oui'),
        comment: clean_(row.Commentaire),
        modalites: clean_(row.Modalites || 'Standard')
      };
    });
}

function makeEventId_(date, title) {
  const base = 'EVT-' +
    Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyyMMdd') +
    '-' +
    slug_(title).substring(0, 40);
  const existing = {};
  getRowsAsObjects_(UC_APP.sheets.calendrier).forEach(function(row) {
    existing[clean_(row.ID_Evenement)] = true;
  });
  if (!existing[base]) return base;
  let suffix = 2;
  while (existing[base + '-' + suffix]) suffix++;
  return base + '-' + suffix;
}

function computeDashboard_(year) {
  const events = getEventsForYear_(year);
  const members = getRowsAsObjects_(UC_APP.sheets.membres).filter(function(member) {
    return member.Nom && member.Prenom && isActive_(member.Actif);
  });
  const responses = getRowsAsObjects_(UC_APP.sheets.reponses).filter(function(row) {
    return Number(row.Annee) === Number(year) && events.some(function(e) { return e.ID_Evenement === row.ID_Evenement; });
  });

  const latestByEventPerson = {};
  responses.forEach(function(row) {
    const key = row.ID_Evenement + '|' + row.Cle_Personne;
    const current = latestByEventPerson[key];
    if (!current || asDate_(row.Horodatage) >= asDate_(current.Horodatage)) latestByEventPerson[key] = row;
  });
  const latestResponses = Object.keys(latestByEventPerson).map(function(key) { return latestByEventPerson[key]; });

  const membersByKey = {};
  members.forEach(function(member) {
    const key = personKey_(member.Nom, member.Prenom, member.Email);
    membersByKey[key] = member;
  });

  const eventStats = events.map(function(event) {
    const eventResponses = latestResponses.filter(function(row) { return row.ID_Evenement === event.ID_Evenement; });
    const responders = {};
    eventResponses.forEach(function(row) { responders[row.Cle_Personne] = true; });
    const presents = eventResponses.filter(function(row) { return row.Reponse === 'Présent'; }).length;
    const absent = eventResponses.filter(function(row) { return row.Reponse === 'Absent'; }).length;
    const undecided = eventResponses.filter(function(row) { return row.Reponse === 'Je ne sais pas encore'; }).length;
    const excused = eventResponses.filter(function(row) { return row.Reponse === 'Absent excusé'; }).length;
    const aids = eventResponses.filter(function(row) { return row.Aide_Disponible === 'Oui'; }).length;
    return {
      id: event.ID_Evenement,
      title: event.Titre,
      type: event.Type_Evenement,
      date: formatDate_(event.Date),
      presents: presents,
      excused: excused,
      absent: absent,
      undecided: undecided,
      aids: aids,
      modalites: clean_(event.Modalites || 'Standard'),
      meals: eventResponses.filter(function(r) { return r.Reponse === 'Présent' && ['Repas seulement', 'Repas et aide'].includes(r.Participation); }).length,
      morning: eventResponses.filter(function(r) { return r.Reponse === 'Présent' && clean_(r.Creneaux).split(' ; ').includes('Matin'); }).length,
      evening: eventResponses.filter(function(r) { return r.Reponse === 'Présent' && clean_(r.Creneaux).split(' ; ').includes('Soir'); }).length,
      comment: clean_(event.Commentaire),
      start: formatEventTime_(event.Heure_Debut),
      end: formatEventTime_(event.Heure_Fin),
      noResponse: Math.max(0, members.length - Object.keys(responders).length),
      sheetName: makeCrSheetName_(event)
    };
  });

  const memberStats = members.map(function(member) {
    const key = personKey_(member.Nom, member.Prenom, member.Email);
    const memberResponses = latestResponses.filter(function(row) { return row.Cle_Personne === key; });
    const answered = {};
    memberResponses.forEach(function(row) { answered[row.ID_Evenement] = true; });
    const presents = memberResponses.filter(function(row) { return row.Reponse === 'Présent'; }).length;
    const absent = memberResponses.filter(function(row) { return row.Reponse === 'Absent'; }).length;
    const undecided = memberResponses.filter(function(row) { return row.Reponse === 'Je ne sais pas encore'; }).length;
    const excused = memberResponses.filter(function(row) { return row.Reponse === 'Absent excusé'; }).length;
    const aids = memberResponses.filter(function(row) { return row.Aide_Disponible === 'Oui'; }).length;
    const noResponse = Math.max(0, events.length - Object.keys(answered).length);
    const denominator = presents + excused + absent + undecided + noResponse;
    return {
      key: key,
      nom: member.Nom,
      prenom: member.Prenom,
      statut: member.Statut,
      cayenne: member.Cayenne,
      presents: presents,
      excused: excused,
      absent: absent,
      undecided: undecided,
      noResponse: noResponse,
      aids: aids,
      lastResponse: memberResponses.length ? formatDate_(new Date(Math.max.apply(null, memberResponses.map(function(r) { return asDate_(r.Horodatage).getTime(); })))) : '',
      presenceRate: denominator ? presents / denominator : 0
    };
  });

  const causeMap = {};
  latestResponses.forEach(function(row) {
    if (row.Reponse !== 'Absent excusé') return;
    String(row.Causes || '').split(';').map(clean_).filter(Boolean).forEach(function(cause) {
      causeMap[cause] = (causeMap[cause] || 0) + 1;
    });
  });

  const totalNoResponse = eventStats.reduce(function(sum, event) { return sum + event.noResponse; }, 0);
  const monthlyStats = buildMonthlyStats_(year, events, latestResponses, eventStats);
  return {
    year: year,
    kpis: {
      events: events.length,
      members: members.length,
      responses: latestResponses.length,
      presents: latestResponses.filter(function(row) { return row.Reponse === 'Présent'; }).length,
      absent: latestResponses.filter(function(row) { return row.Reponse === 'Absent'; }).length,
      undecided: latestResponses.filter(function(row) { return row.Reponse === 'Je ne sais pas encore'; }).length,
      excused: latestResponses.filter(function(row) { return row.Reponse === 'Absent excusé'; }).length,
      aids: latestResponses.filter(function(row) { return row.Aide_Disponible === 'Oui'; }).length,
      noResponse: totalNoResponse
    },
    events: eventStats,
    members: memberStats,
    monthly: monthlyStats,
    causes: Object.keys(causeMap).sort().map(function(cause) {
      return { cause: cause, count: causeMap[cause] };
    })
  };
}

function buildMonthlyStats_(year, events, latestResponses, eventStats) {
  const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  const stats = monthNames.map(function(label, index) {
    return {
      month: index + 1,
      label: label,
      events: 0,
      responses: 0,
      presents: 0,
      excused: 0,
      absent: 0,
      undecided: 0,
      aids: 0,
      noResponse: 0
    };
  });
  const eventMonthById = {};
  events.forEach(function(event) {
    const date = asDate_(event.Date);
    if (!date || date.getFullYear() !== Number(year)) return;
    const month = date.getMonth();
    eventMonthById[event.ID_Evenement] = month;
    stats[month].events++;
  });
  latestResponses.forEach(function(row) {
    const month = eventMonthById[row.ID_Evenement];
    if (typeof month !== 'number') return;
    stats[month].responses++;
    if (row.Reponse === 'Présent') stats[month].presents++;
    if (row.Reponse === 'Absent') stats[month].absent++;
    if (row.Reponse === 'Je ne sais pas encore') stats[month].undecided++;
    if (row.Reponse === 'Absent excusé') stats[month].excused++;
    if (row.Aide_Disponible === 'Oui') stats[month].aids++;
  });
  eventStats.forEach(function(event) {
    const month = eventMonthById[event.id];
    if (typeof month === 'number') stats[month].noResponse += Number(event.noResponse) || 0;
  });
  return stats.filter(function(month) {
    return month.events || month.responses || month.noResponse;
  });
}

function buildEventRows_(eventId) {
  const members = getRowsAsObjects_(UC_APP.sheets.membres).filter(function(member) {
    return member.Nom && member.Prenom && isActive_(member.Actif);
  });
  const responses = getRowsAsObjects_(UC_APP.sheets.reponses)
    .filter(function(row) { return row.ID_Evenement === eventId; });
  const latestByPerson = {};
  responses.forEach(function(row) {
    const key = row.Cle_Personne || personKey_(row.Nom, row.Prenom, row.Email);
    const current = latestByPerson[key];
    if (!current || asDate_(row.Horodatage) >= asDate_(current.Horodatage)) latestByPerson[key] = row;
  });

  const rows = members.map(function(member) {
    const key = personKey_(member.Nom, member.Prenom, member.Email);
    const response = latestByPerson[key];
    return {
      nom: member.Nom,
      prenom: member.Prenom,
      statut: member.Statut,
      cayenne: member.Cayenne,
      key: key,
      reponse: response ? response.Reponse : 'Sans réponse',
      causes: response ? response.Causes : '',
      precision: response ? response.Precision : '',
      aide: response ? response.Aide_Disponible : 'Non',
      heureDebut: response ? response.Heure_Debut_Aide : '',
      heureFin: response ? response.Heure_Fin_Aide : '',
      participation: response ? response.Participation || '' : '',
      creneaux: response ? response.Creneaux || '' : '',
      commentaire: response ? response.Commentaire || '' : ''
    };
  });

  Object.keys(latestByPerson).forEach(function(key) {
    const alreadyListed = rows.some(function(row) {
      return row.key === key || personKey_(row.nom, row.prenom, '') === key;
    });
    if (alreadyListed) return;
    const response = latestByPerson[key];
    rows.push({
      nom: response.Nom,
      prenom: response.Prenom,
      statut: response.Statut,
      cayenne: response.Cayenne,
      reponse: response.Reponse,
      causes: response.Causes,
      precision: response.Precision,
      aide: response.Aide_Disponible,
      heureDebut: response.Heure_Debut_Aide,
      heureFin: response.Heure_Fin_Aide,
      participation: response.Participation || '',
      creneaux: response.Creneaux || '',
      commentaire: response.Commentaire || ''
    });
  });

  const order = { 'Présent': 1, 'Je ne sais pas encore': 2, 'Absent excusé': 3, 'Absent': 4, 'Sans réponse': 5 };
  return rows.sort(function(a, b) {
    return (order[a.reponse] || 9) - (order[b.reponse] || 9) || String(a.nom).localeCompare(String(b.nom));
  });
}

function getTableData_(sheetName) {
  const sheet = getSpreadsheet_().getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() === 0) return { rows: [], rowNumbers: [] };
  const values = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn()).getValues();
  const tableKey = Object.keys(UC_APP.headers).find(function(key) {
    return UC_APP.sheets[key] === sheetName;
  });
  const expected = tableKey ? UC_APP.headers[tableKey] : null;
  const headerIndex = values.slice(0, 10).findIndex(function(row) {
    if (expected) return expected.slice(0, ({reponses:25, calendrier:12, eventBase:11})[tableKey] || expected.length).every(function(header, index) { return clean_(row[index]) === header; });
    return row.filter(function(cell) { return clean_(cell); }).length > 1;
  });
  if (headerIndex < 0) throw new Error('Colonnes introuvables dans l’onglet ' + sheetName + '.');
  const headers = values[headerIndex].map(clean_);
  const result = { rows: [], rowNumbers: [], headerRow: headerIndex + 1 };
  values.slice(headerIndex + 1).forEach(function(row, index) {
    if (!row.some(function(cell) { return cell !== '' && cell !== null; })) return;
    // A prior installation may have also written a header above the original table.
    if (headers.every(function(header, column) { return !header || clean_(row[column]) === header; })) return;
    result.rows.push(headers.reduce(function(obj, header, column) {
      if (header) obj[header] = row[column];
      return obj;
    }, {}));
    result.rowNumbers.push(headerIndex + index + 2);
  });
  return result;
}

function getRowsAsObjects_(sheetName) {
  return getTableData_(sheetName).rows;
}

function upsertMember_(member) {
  const sheet = getSpreadsheet_().getSheetByName(UC_APP.sheets.membres);
  const table = getTableData_(UC_APP.sheets.membres);
  const members = table.rows;
  const key = personKey_(member.Nom, member.Prenom, member.Email);
  const index = members.findIndex(function(row) {
    return personKey_(row.Nom, row.Prenom, row.Email) === key;
  });
  const values = [[member.Nom, member.Prenom, member.Statut, member.Cayenne, member.Email, member.Telephone, 'Oui', member.Notes || '']];
  if (index >= 0) {
    sheet.getRange(table.rowNumbers[index], 1, 1, values[0].length).setValues(values);
  } else {
    sheet.getRange(sheet.getLastRow() + 1, 1, 1, values[0].length).setValues(values);
  }
}

function markResponseReportSheet_(eventId, sheetName) {
  const sheet = getSpreadsheet_().getSheetByName(UC_APP.sheets.reponses);
  if (!sheet || sheet.getLastRow() < 2) return;
  const table = getTableData_(UC_APP.sheets.reponses);
  table.rows.forEach(function(row, index) {
    if (row.ID_Evenement === eventId && row.Feuille_CR !== sheetName) {
      sheet.getRange(table.rowNumbers[index], 25).setValue(sheetName);
    }
  });
}

function colorResponseColumn_(sheet, startRow, rowCount) {
  const range = sheet.getRange(startRow, 5, rowCount, 1);
  const rules = [
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('Présent').setBackground('#DCFCE7').setRanges([range]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('Absent excusé').setBackground('#FEF3C7').setRanges([range]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('Sans réponse').setBackground('#FEE2E2').setRanges([range]).build()
  ];
  sheet.setConditionalFormatRules(rules);
}

function exportSheetToPdf_(sheet) {
  const ss = getSpreadsheet_();
  const url = ss.getUrl().replace(/edit.*$/, '') +
    'export?format=pdf&portrait=false&size=A4&fitw=true&sheetnames=false&printtitle=false&pagenumbers=true&gridlines=false&fzr=true&gid=' +
    sheet.getSheetId();
  const token = ScriptApp.getOAuthToken();
  const response = UrlFetchApp.fetch(url, {
    headers: { Authorization: 'Bearer ' + token }
  });
  const blob = response.getBlob().setName(sheet.getName() + '.pdf');
  return DriveApp.createFile(blob);
}

function makeCrSheetName_(event) {
  const date = asDate_(event.Date);
  const datePart = date ? Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy_MM_dd') : String(event.Annee || 'ANNEE');
  return ('CR_' + datePart + '_' + slug_(event.Type_Evenement || event.Titre)).substring(0, 95);
}

function indexBy_(rows, key) {
  return rows.reduce(function(map, row) {
    map[row[key]] = row;
    return map;
  }, {});
}

function clean_(value) {
  return String(value === null || typeof value === 'undefined' ? '' : value).trim();
}

function sheetLiteral_(value) {
  return typeof value === 'string' && value.charAt(0) === '=' ? "'" + value : value;
}

function isActive_(value) {
  const normalized = clean_(value).toLowerCase();
  return !(value === false || normalized === 'false' || normalized === 'non' || normalized === '0');
}

function personKey_(nom, prenom, email) {
  const mail = clean_(email).toLowerCase();
  if (mail) return mail;
  return (clean_(nom) + ' ' + clean_(prenom))
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

function slug_(value) {
  return clean_(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
}

function asDate_(value) {
  if (value instanceof Date && !isNaN(value)) return value;
  if (!value) return null;
  const date = new Date(value);
  return isNaN(date) ? null : date;
}

function parseInputDate_(value) {
  const text = clean_(value);
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return asDate_(value);
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function formatDate_(value) {
  const date = asDate_(value);
  if (!date) return '';
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function getWeekNumber_(date) {
  const copy = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = copy.getUTCDay() || 7;
  copy.setUTCDate(copy.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(copy.getUTCFullYear(), 0, 1));
  return Math.ceil((((copy - yearStart) / 86400000) + 1) / 7);
}

// Extend only optional columns and the response validation, never rewrite historical rows.
function ensureParticipationSchema_() {
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty('uc.participation.schema') === '2') return;
  const ss = getSpreadsheet_();
  ['reponses', 'calendrier', 'eventBase'].forEach(function(key) {
    const sheet = ss.getSheetByName(UC_APP.sheets[key]);
    const table = getTableData_(UC_APP.sheets[key]);
    const start = ({reponses:25, calendrier:12, eventBase:11})[key];
    const extra = UC_APP.headers[key].slice(start);
    if (sheet.getMaxColumns() < start + extra.length) sheet.insertColumnsAfter(sheet.getMaxColumns(), start + extra.length - sheet.getMaxColumns());
    const range = sheet.getRange(table.headerRow, start + 1, 1, extra.length);
    const current = range.getValues()[0];
    if (current.some(function(v, i) { return clean_(v) && clean_(v) !== extra[i]; })) throw new Error('Colonnes supplémentaires occupées dans ' + UC_APP.sheets[key] + '. Contactez le bureau.');
    range.setValues([extra]);
    if (key === 'reponses') setListValidation_(sheet.getRange(table.headerRow + 1, 15, sheet.getMaxRows() - table.headerRow, 1), ['Présent', 'Absent', 'Je ne sais pas encore', 'Absent excusé']);
  });
  props.setProperty('uc.participation.schema', '2');
}

function formatEventTime_(value) { return value instanceof Date ? Utilities.formatDate(value, Session.getScriptTimeZone(), 'HH:mm') : clean_(value); }
