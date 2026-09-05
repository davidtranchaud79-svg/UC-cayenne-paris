const UC_APP = {
  sheets: {
    parametres: 'PARAMETRES',
    membres: 'MEMBRES',
    calendrier: 'CALENDRIER',
    reponses: 'REPONSES',
    suivi: 'SUIVI_ANNUEL',
    dashboard: 'DASHBOARD',
    modeleCr: 'MODELE_CR_EVENEMENT'
  },
  headers: {
    membres: ['Nom', 'Prenom', 'Statut', 'Cayenne', 'Email', 'Telephone', 'Actif', 'Notes'],
    calendrier: ['ID_Evenement', 'Annee', 'Date', 'Titre', 'Type_Evenement', 'Heure_Debut', 'Heure_Fin', 'Lieu', 'Cayenne', 'Categorie_CR', 'Actif', 'Commentaire'],
    reponses: ['ID_Reponse', 'Horodatage', 'Source', 'Annee', 'ID_Evenement', 'Date_Evenement', 'Titre_Evenement', 'Type_Evenement', 'Nom', 'Prenom', 'Email', 'Telephone', 'Statut', 'Cayenne', 'Reponse', 'Causes', 'Precision', 'Aide_Disponible', 'Heure_Debut_Aide', 'Heure_Fin_Aide', 'Commentaire', 'Cle_Personne', 'Mois', 'Semaine', 'Feuille_CR']
  },
  defaults: {
    activeYear: 2026,
    adminPin: '1234',
    webAppUrl: 'https://script.google.com/macros/s/AKfycbwKD8Z_kgeNQmDqPgpKT4QtHyQ9O0ZhQbaYJla5QsKdt8VkZmW9_QRU1A6WwhXuBI7HIQ/exec',
    statuses: ['Sociétaire', 'Aspirant', 'Compagnon'],
    cayennes: ['Paris', 'Autre'],
    reponses: ['Présent', 'Absent excusé', 'Disponible pour aider'],
    causes: [
      'Familiale',
      'Travail',
      'Engagement compagnonnique ailleurs',
      'Maladie',
      'Arrêt de travail',
      'Vacances',
      'Repos',
      'Trop d’engagements / je fais un break'
    ],
    eventTypes: [
      'Réunion des jeunes',
      'Réunion compagnon',
      'Cours en Cayenne',
      'Fête de juin',
      'Fête de novembre',
      'JEP',
      'Autre'
    ]
  }
};

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Présences UC')
    .addItem('Installer / réparer le classeur', 'setupSystem')
    .addItem('Actualiser le dashboard', 'refreshDashboardSheet')
    .addItem('Générer les feuilles événement', 'generateAllEventSheetsForActiveYear')
    .addItem('Exporter la feuille active en PDF', 'exportActiveSheetPdf')
    .addToUi();
}

function doGet() {
  return HtmlService
    .createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Présences Cayenne de Paris')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function setupSystem() {
  const ss = SpreadsheetApp.getActive();
  ensureSheet_(ss, UC_APP.sheets.parametres);
  ensureSheet_(ss, UC_APP.sheets.membres);
  ensureSheet_(ss, UC_APP.sheets.calendrier);
  ensureSheet_(ss, UC_APP.sheets.reponses);
  ensureSheet_(ss, UC_APP.sheets.suivi);
  ensureSheet_(ss, UC_APP.sheets.dashboard);
  ensureSheet_(ss, UC_APP.sheets.modeleCr);

  setupParametres_(ss.getSheetByName(UC_APP.sheets.parametres));
  setupTable_(ss.getSheetByName(UC_APP.sheets.membres), UC_APP.headers.membres);
  setupTable_(ss.getSheetByName(UC_APP.sheets.calendrier), UC_APP.headers.calendrier);
  setupTable_(ss.getSheetByName(UC_APP.sheets.reponses), UC_APP.headers.reponses);
  seedCalendar_(ss.getSheetByName(UC_APP.sheets.calendrier));
  setupSuiviSheet_(ss.getSheetByName(UC_APP.sheets.suivi));
  refreshDashboardSheet();
  setupModeleCr_(ss.getSheetByName(UC_APP.sheets.modeleCr));
  applyValidations_();
  const eventSheets = generateAllEventSheets(getSettings_().annee_active);

  return {
    ok: true,
    message: 'Classeur prêt. ' + eventSheets.length + ' feuille(s) événement générée(s). Complétez MEMBRES et CALENDRIER, puis déployez le formulaire.'
  };
}

function getPublicConfig() {
  setupSystemIfMissing_();
  const settings = getSettings_();
  const year = Number(settings.annee_active || UC_APP.defaults.activeYear);
  return {
    activeYear: year,
    statuses: getOptionList_('D', UC_APP.defaults.statuses),
    cayennes: getOptionList_('E', UC_APP.defaults.cayennes),
    responseTypes: getOptionList_('F', UC_APP.defaults.reponses),
    causes: getOptionList_('G', UC_APP.defaults.causes),
    eventTypes: getOptionList_('H', UC_APP.defaults.eventTypes),
    events: getEventsForYear_(year).map(formatEventForClient_)
  };
}

function submitResponses(payload) {
  setupSystemIfMissing_();
  payload = payload || {};

  const nom = clean_(payload.nom);
  const prenom = clean_(payload.prenom);
  const statut = clean_(payload.statut);
  const cayenne = clean_(payload.cayenne);
  const selectedEventIds = Array.isArray(payload.eventIds) ? payload.eventIds : [];
  const responseChoice = clean_(payload.reponse);

  if (!nom || !prenom) throw new Error('Nom et prénom obligatoires.');
  if (!statut) throw new Error('Statut obligatoire.');
  if (!cayenne) throw new Error('Cayenne obligatoire.');
  if (!responseChoice) throw new Error('Type de réponse obligatoire.');
  if (!selectedEventIds.length) throw new Error('Sélectionnez au moins un événement.');

  const ss = SpreadsheetApp.getActive();
  const responseSheet = ss.getSheetByName(UC_APP.sheets.reponses);
  const eventsById = indexBy_(getRowsAsObjects_(UC_APP.sheets.calendrier), 'ID_Evenement');
  const now = new Date();
  const causes = Array.isArray(payload.causes) ? payload.causes.map(clean_).filter(Boolean) : [];
  const source = payload.source || (selectedEventIds.length > 1 ? 'Réponse anticipée' : 'Réponse événement');
  const isAid = responseChoice === 'Disponible pour aider';
  const savedRows = [];

  upsertMember_({
    Nom: nom,
    Prenom: prenom,
    Statut: statut,
    Cayenne: cayenne,
    Email: clean_(payload.email),
    Telephone: clean_(payload.telephone),
    Actif: 'Oui',
    Notes: ''
  });

  selectedEventIds.forEach(function(eventId) {
    const event = eventsById[eventId];
    if (!event) return;
    const eventDate = asDate_(event.Date);
    const finalResponse = isAid ? 'Présent' : responseChoice;
    const clePersonne = personKey_(nom, prenom, payload.email);
    savedRows.push([
      Utilities.getUuid(),
      now,
      source,
      Number(event.Annee),
      event.ID_Evenement,
      eventDate,
      event.Titre,
      event.Type_Evenement,
      nom,
      prenom,
      clean_(payload.email),
      clean_(payload.telephone),
      statut,
      cayenne,
      finalResponse,
      causes.join(' ; '),
      clean_(payload.precision),
      isAid || payload.aideDisponible === true ? 'Oui' : 'Non',
      clean_(payload.heureDebutAide),
      clean_(payload.heureFinAide),
      clean_(payload.commentaire),
      clePersonne,
      eventDate ? Utilities.formatDate(eventDate, Session.getScriptTimeZone(), 'yyyy-MM') : '',
      eventDate ? getWeekNumber_(eventDate) : '',
      ''
    ]);
  });

  if (!savedRows.length) throw new Error('Aucun événement valide trouvé.');
  responseSheet
    .getRange(responseSheet.getLastRow() + 1, 1, savedRows.length, UC_APP.headers.reponses.length)
    .setValues(savedRows);

  refreshDashboardSheet();
  const refreshedEvents = {};
  savedRows.forEach(function(row) {
    refreshedEvents[row[4]] = true;
  });
  Object.keys(refreshedEvents).forEach(function(eventId) {
    generateEventSheet(eventId);
  });

  return {
    ok: true,
    saved: savedRows.length,
    message: savedRows.length + ' réponse(s) enregistrée(s).'
  };
}

function getDashboardData(year, adminPin) {
  assertAdmin_(adminPin);
  setupSystemIfMissing_();
  return computeDashboard_(Number(year || getSettings_().annee_active || UC_APP.defaults.activeYear));
}

function generateEventSheet(eventId, adminPin) {
  if (typeof adminPin !== 'undefined') assertAdmin_(adminPin);
  setupSystemIfMissing_();

  const events = getRowsAsObjects_(UC_APP.sheets.calendrier);
  const event = events.filter(function(row) { return row.ID_Evenement === eventId; })[0];
  if (!event) throw new Error('Événement introuvable.');

  const ss = SpreadsheetApp.getActive();
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
  sheet.getRange('A4:A8').setFontWeight('bold').setBackground('#F2E7E9');
  sheet.getRange('B4:B8').setNumberFormat('0');

  const headers = ['Nom', 'Prénom', 'Statut', 'Cayenne', 'Réponse', 'Cause', 'Précision', 'Aide', 'Horaire'];
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
        [row.heureDebut, row.heureFin].filter(Boolean).join(' - ')
      ];
    });
    sheet.getRange(11, 1, values.length, headers.length).setValues(values);
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
  if (typeof adminPin !== 'undefined') assertAdmin_(adminPin);
  const targetYear = Number(year || getSettings_().annee_active || UC_APP.defaults.activeYear);
  const events = getEventsForYear_(targetYear);
  return events.map(function(event) {
    return generateEventSheet(event.ID_Evenement);
  });
}

function generateAllEventSheetsForActiveYear() {
  const results = generateAllEventSheets(getSettings_().annee_active);
  SpreadsheetApp.getUi().alert(results.length + ' feuille(s) événement générée(s).');
}

function refreshDashboardSheet() {
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName(UC_APP.sheets.dashboard);
  if (!sheet) return;
  const settings = getSettings_();
  const year = Number(settings.annee_active || UC_APP.defaults.activeYear);
  const data = computeDashboard_(year);

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

  const webAppUrl = settings.web_app_url || UC_APP.defaults.webAppUrl;
  if (webAppUrl) {
    sheet.getRange('A10').setValue('Formulaire public').setFontWeight('bold').setBackground('#F2E7E9');
    sheet.getRange('B10').setRichTextValue(
      SpreadsheetApp.newRichTextValue()
        .setText(webAppUrl)
        .setLinkUrl(webAppUrl)
        .build()
    );
  }

  sheet.getRange('D3:H3').setValues([['Événement', 'Date', 'Présents', 'Excusés', 'Sans réponse']]);
  sheet.getRange('D3:H3').setFontWeight('bold').setFontColor('#FFFFFF').setBackground('#3F3F46');
  const eventRows = data.events.map(function(event) {
    return [event.title, event.date, event.presents, event.excused, event.noResponse];
  });
  if (eventRows.length) sheet.getRange(4, 4, eventRows.length, 5).setValues(eventRows);

  const causeRows = data.causes.map(function(cause) {
    return [cause.cause, cause.count];
  });
  sheet.getRange('A11:B11').setValues([['Causes d’absence', 'Total']]);
  sheet.getRange('A11:B11').setFontWeight('bold').setFontColor('#FFFFFF').setBackground('#3F3F46');
  if (causeRows.length) sheet.getRange(12, 1, causeRows.length, 2).setValues(causeRows);

  const memberRows = data.members.map(function(member) {
    return [member.nom, member.prenom, member.statut, member.cayenne, member.presents, member.excused, member.noResponse, member.aids, member.presenceRate];
  });
  sheet.getRange('A23:I23').setValues([['Nom', 'Prénom', 'Statut', 'Cayenne', 'Présences', 'Excusés', 'Sans réponse', 'Aides', 'Taux']]);
  sheet.getRange('A23:I23').setFontWeight('bold').setFontColor('#FFFFFF').setBackground('#3F3F46');
  if (memberRows.length) {
    sheet.getRange(24, 1, memberRows.length, 9).setValues(memberRows);
    sheet.getRange(24, 9, memberRows.length, 1).setNumberFormat('0%');
  }

  sheet.autoResizeColumns(1, 9);
}

function exportActiveSheetPdf() {
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getActiveSheet();
  const file = exportSheetToPdf_(sheet);
  SpreadsheetApp.getUi().alert('PDF créé : ' + file.getUrl());
}

function setupSystemIfMissing_() {
  const ss = SpreadsheetApp.getActive();
  if (!ss.getSheetByName(UC_APP.sheets.reponses)) setupSystem();
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
  sheet.clear();
  sheet.setHiddenGridlines(true);
  sheet.getRange('A1:C1').setValues([['Paramètre', 'Valeur', 'Description']]);
  sheet.getRange('A1:C1').setFontWeight('bold').setFontColor('#FFFFFF').setBackground('#7A1F2B');
  sheet.getRange('A2:C7').setValues([
    ['annee_active', UC_APP.defaults.activeYear, 'Année suivie par défaut'],
    ['cayenne_principale', 'Paris', 'Cayenne proposée en premier'],
    ['admin_pin', UC_APP.defaults.adminPin, 'Code d’accès au dashboard admin'],
    ['nom_application', 'Présences Cayenne de Paris', 'Titre affiché dans le formulaire'],
    ['derniere_generation', '', 'Renseigné automatiquement si besoin'],
    ['web_app_url', UC_APP.defaults.webAppUrl, 'Lien public du formulaire Apps Script déployé']
  ]);

  writeVerticalList_(sheet, 'D', 'Statuts', UC_APP.defaults.statuses);
  writeVerticalList_(sheet, 'E', 'Cayennes', UC_APP.defaults.cayennes);
  writeVerticalList_(sheet, 'F', 'Réponses', UC_APP.defaults.reponses);
  writeVerticalList_(sheet, 'G', 'Causes', UC_APP.defaults.causes);
  writeVerticalList_(sheet, 'H', 'Types événements', UC_APP.defaults.eventTypes);
  sheet.autoResizeColumns(1, 8);
}

function setupSuiviSheet_(sheet) {
  sheet.clear();
  sheet.setHiddenGridlines(true);
  sheet.getRange('A1:K1').merge().setValue('Suivi annuel par personne');
  sheet.getRange('A1').setFontSize(16).setFontWeight('bold').setFontColor('#FFFFFF').setBackground('#7A1F2B');
  sheet.getRange('A3:K3').setValues([['Nom', 'Prénom', 'Statut', 'Cayenne', 'Clé personne', 'Présences', 'Absences excusées', 'Sans réponse', 'Aides proposées', 'Taux présence', 'Dernière réponse']]);
  sheet.getRange('A3:K3').setFontWeight('bold').setFontColor('#FFFFFF').setBackground('#3F3F46');

  const formulas = [];
  for (let row = 4; row <= 203; row++) {
    const memberRow = row - 2;
    formulas.push([
      `=IF('MEMBRES'!A${memberRow}="";"";'MEMBRES'!A${memberRow})`,
      `=IF('MEMBRES'!B${memberRow}="";"";'MEMBRES'!B${memberRow})`,
      `=IF('MEMBRES'!C${memberRow}="";"";'MEMBRES'!C${memberRow})`,
      `=IF('MEMBRES'!D${memberRow}="";"";'MEMBRES'!D${memberRow})`,
      `=IF(A${row}="";"";UPPER(TRIM(A${row}&" "&B${row})))`,
      `=IF(E${row}="";"";COUNTIFS('REPONSES'!$V$2:$V$2000;E${row};'REPONSES'!$D$2:$D$2000;'PARAMETRES'!$B$2;'REPONSES'!$O$2:$O$2000;"Présent"))`,
      `=IF(E${row}="";"";COUNTIFS('REPONSES'!$V$2:$V$2000;E${row};'REPONSES'!$D$2:$D$2000;'PARAMETRES'!$B$2;'REPONSES'!$O$2:$O$2000;"Absent excusé"))`,
      `=IF(E${row}="";"";MAX(0;COUNTIFS('CALENDRIER'!$B$2:$B$500;'PARAMETRES'!$B$2;'CALENDRIER'!$K$2:$K$500;"Oui")-F${row}-G${row}))`,
      `=IF(E${row}="";"";COUNTIFS('REPONSES'!$V$2:$V$2000;E${row};'REPONSES'!$D$2:$D$2000;'PARAMETRES'!$B$2;'REPONSES'!$R$2:$R$2000;"Oui"))`,
      `=IF(E${row}="";"";IFERROR(F${row}/(F${row}+G${row}+H${row});0))`,
      `=IF(E${row}="";"";IFERROR(MAXIFS('REPONSES'!$B$2:$B$2000;'REPONSES'!$V$2:$V$2000;E${row};'REPONSES'!$D$2:$D$2000;'PARAMETRES'!$B$2);""))`
    ]);
  }
  sheet.getRange(4, 1, formulas.length, formulas[0].length).setFormulas(formulas);
  sheet.getRange('F4:I203').setNumberFormat('0');
  sheet.getRange('J4:J203').setNumberFormat('0%');
  sheet.getRange('K4:K203').setNumberFormat('yyyy-mm-dd hh:mm');
  sheet.autoResizeColumns(1, 11);
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
    ['EVT-2026-JEUNES-01', year, new Date(year, 0, 15), 'Réunion des jeunes janvier', 'Réunion des jeunes', '20:00', '22:00', 'Cayenne de Paris', 'Paris', 'Réunion', 'Oui', 'Exemple à ajuster'],
    ['EVT-2026-COMPAGNONS-01', year, new Date(year, 1, 12), 'Réunion compagnon février', 'Réunion compagnon', '20:00', '22:00', 'Cayenne de Paris', 'Paris', 'Réunion', 'Oui', 'Exemple à ajuster'],
    ['EVT-2026-COURS-01', year, new Date(year, 2, 14), 'Cours en Cayenne', 'Cours en Cayenne', '09:00', '12:00', 'Cayenne de Paris', 'Paris', 'Cours', 'Oui', 'Date exemple'],
    ['EVT-2026-FETE-JUIN', year, new Date(year, 5, 20), 'Fête de juin', 'Fête de juin', '08:00', '23:00', 'Cayenne de Paris', 'Paris', 'Événement', 'Oui', 'Date à confirmer'],
    ['EVT-2026-JEP', year, new Date(year, 8, 19), 'Journées européennes du patrimoine', 'JEP', '09:00', '18:00', 'Cayenne de Paris', 'Paris', 'Événement', 'Oui', 'Date à confirmer'],
    ['EVT-2026-FETE-NOVEMBRE', year, new Date(year, 10, 21), 'Fête de novembre', 'Fête de novembre', '08:00', '23:00', 'Cayenne de Paris', 'Paris', 'Événement', 'Oui', 'Date à confirmer']
  ];
  sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  sheet.getRange(2, 3, rows.length, 1).setNumberFormat('yyyy-mm-dd');
}

function applyValidations_() {
  const ss = SpreadsheetApp.getActive();
  const membres = ss.getSheetByName(UC_APP.sheets.membres);
  const calendrier = ss.getSheetByName(UC_APP.sheets.calendrier);
  const reponses = ss.getSheetByName(UC_APP.sheets.reponses);
  const statuses = getOptionList_('D', UC_APP.defaults.statuses);
  const cayennes = getOptionList_('E', UC_APP.defaults.cayennes);
  const responseTypes = ['Présent', 'Absent excusé'];
  const eventTypes = getOptionList_('H', UC_APP.defaults.eventTypes);

  setListValidation_(membres.getRange('C2:C500'), statuses);
  setListValidation_(membres.getRange('D2:D500'), cayennes);
  setListValidation_(membres.getRange('G2:G500'), ['Oui', 'Non']);
  setListValidation_(calendrier.getRange('E2:E500'), eventTypes);
  setListValidation_(calendrier.getRange('I2:I500'), cayennes);
  setListValidation_(calendrier.getRange('K2:K500'), ['Oui', 'Non']);
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
  const sheet = SpreadsheetApp.getActive().getSheetByName(UC_APP.sheets.parametres);
  if (!sheet) return fallback;
  const values = sheet.getRange(columnLetter + '2:' + columnLetter + '100').getValues()
    .map(function(row) { return clean_(row[0]); })
    .filter(Boolean);
  return values.length ? values : fallback;
}

function getSettings_() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(UC_APP.sheets.parametres);
  if (!sheet) return {};
  const values = sheet.getRange('A2:B50').getValues();
  return values.reduce(function(settings, row) {
    const key = clean_(row[0]);
    if (key) settings[key] = row[1];
    return settings;
  }, {});
}

function assertAdmin_(pin) {
  const expected = String(getSettings_().admin_pin || UC_APP.defaults.adminPin).trim();
  if (String(pin || '').trim() !== expected) throw new Error('Code admin incorrect.');
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
    start: event.Heure_Debut,
    end: event.Heure_Fin,
    place: event.Lieu,
    cayenne: event.Cayenne
  };
}

function computeDashboard_(year) {
  const events = getEventsForYear_(year);
  const members = getRowsAsObjects_(UC_APP.sheets.membres).filter(function(member) {
    return member.Nom && member.Prenom && isActive_(member.Actif);
  });
  const responses = getRowsAsObjects_(UC_APP.sheets.reponses).filter(function(row) {
    return Number(row.Annee) === Number(year);
  });

  const latestByEventPerson = {};
  responses.forEach(function(row) {
    const key = row.ID_Evenement + '|' + row.Cle_Personne;
    const current = latestByEventPerson[key];
    if (!current || asDate_(row.Horodatage) > asDate_(current.Horodatage)) latestByEventPerson[key] = row;
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
    const excused = eventResponses.filter(function(row) { return row.Reponse === 'Absent excusé'; }).length;
    const aids = eventResponses.filter(function(row) { return row.Aide_Disponible === 'Oui'; }).length;
    return {
      id: event.ID_Evenement,
      title: event.Titre,
      type: event.Type_Evenement,
      date: formatDate_(event.Date),
      presents: presents,
      excused: excused,
      aids: aids,
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
    const excused = memberResponses.filter(function(row) { return row.Reponse === 'Absent excusé'; }).length;
    const aids = memberResponses.filter(function(row) { return row.Aide_Disponible === 'Oui'; }).length;
    const noResponse = Math.max(0, events.length - Object.keys(answered).length);
    const denominator = presents + excused + noResponse;
    return {
      key: key,
      nom: member.Nom,
      prenom: member.Prenom,
      statut: member.Statut,
      cayenne: member.Cayenne,
      presents: presents,
      excused: excused,
      noResponse: noResponse,
      aids: aids,
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
  return {
    year: year,
    kpis: {
      events: events.length,
      members: members.length,
      responses: latestResponses.length,
      presents: latestResponses.filter(function(row) { return row.Reponse === 'Présent'; }).length,
      excused: latestResponses.filter(function(row) { return row.Reponse === 'Absent excusé'; }).length,
      aids: latestResponses.filter(function(row) { return row.Aide_Disponible === 'Oui'; }).length,
      noResponse: totalNoResponse
    },
    events: eventStats,
    members: memberStats,
    causes: Object.keys(causeMap).sort().map(function(cause) {
      return { cause: cause, count: causeMap[cause] };
    })
  };
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
    if (!current || asDate_(row.Horodatage) > asDate_(current.Horodatage)) latestByPerson[key] = row;
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
      heureFin: response ? response.Heure_Fin_Aide : ''
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
      heureFin: response.Heure_Fin_Aide
    });
  });

  const order = { 'Présent': 1, 'Absent excusé': 2, 'Sans réponse': 3 };
  return rows.sort(function(a, b) {
    return (order[a.reponse] || 9) - (order[b.reponse] || 9) || String(a.nom).localeCompare(String(b.nom));
  });
}

function getRowsAsObjects_(sheetName) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const values = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn()).getValues();
  const headers = values.shift().map(clean_);
  return values
    .filter(function(row) { return row.some(function(cell) { return cell !== '' && cell !== null; }); })
    .map(function(row) {
      return headers.reduce(function(obj, header, index) {
        obj[header] = row[index];
        return obj;
      }, {});
    });
}

function upsertMember_(member) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(UC_APP.sheets.membres);
  const members = getRowsAsObjects_(UC_APP.sheets.membres);
  const key = personKey_(member.Nom, member.Prenom, member.Email);
  const index = members.findIndex(function(row) {
    return personKey_(row.Nom, row.Prenom, row.Email) === key;
  });
  const values = [[member.Nom, member.Prenom, member.Statut, member.Cayenne, member.Email, member.Telephone, 'Oui', member.Notes || '']];
  if (index >= 0) {
    sheet.getRange(index + 2, 1, 1, values[0].length).setValues(values);
  } else {
    sheet.getRange(sheet.getLastRow() + 1, 1, 1, values[0].length).setValues(values);
  }
}

function markResponseReportSheet_(eventId, sheetName) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(UC_APP.sheets.reponses);
  if (!sheet || sheet.getLastRow() < 2) return;
  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, UC_APP.headers.reponses.length).getValues();
  let changed = false;
  values.forEach(function(row) {
    if (row[4] === eventId) {
      row[24] = sheetName;
      changed = true;
    }
  });
  if (changed) sheet.getRange(2, 1, values.length, UC_APP.headers.reponses.length).setValues(values);
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
  const ss = SpreadsheetApp.getActive();
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
