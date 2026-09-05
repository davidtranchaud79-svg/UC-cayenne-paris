import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const rootDir = "/workspace/scratch/81558b80529b/uc-presences-annuelles";
const outputDir = path.join(rootDir, "outputs");
const previewDir = path.join(outputDir, "previews");
const workbookPath = path.join(outputDir, "Modele_Presences_Engagements_Cayenne.xlsx");

const palette = {
  wine: "#7A1F2B",
  wineDark: "#55131D",
  ink: "#1F2937",
  muted: "#6B7280",
  line: "#D9D9D9",
  soft: "#F2E7E9",
  grey: "#3F3F46",
  green: "#DCFCE7",
  amber: "#FEF3C7",
  red: "#FEE2E2",
  white: "#FFFFFF"
};

const statuses = ["Sociétaire", "Aspirant", "Compagnon"];
const cayennes = ["Paris", "Autre"];
const responseTypes = ["Présent", "Absent excusé", "Disponible pour aider"];
const causes = [
  "Familiale",
  "Travail",
  "Engagement compagnonnique ailleurs",
  "Maladie",
  "Arrêt de travail",
  "Vacances",
  "Repos",
  "Trop d’engagements / je fais un break"
];
const eventTypes = [
  "Réunion des jeunes",
  "Réunion compagnon",
  "Cours en Cayenne",
  "Fête de juin",
  "Fête de novembre",
  "JEP",
  "Autre"
];
const webAppUrl = "https://script.google.com/macros/s/AKfycbwKD8Z_kgeNQmDqPgpKT4QtHyQ9O0ZhQbaYJla5QsKdt8VkZmW9_QRU1A6WwhXuBI7HIQ/exec";

const headers = {
  membres: ["Nom", "Prenom", "Statut", "Cayenne", "Email", "Telephone", "Actif", "Notes"],
  calendrier: ["ID_Evenement", "Annee", "Date", "Titre", "Type_Evenement", "Heure_Debut", "Heure_Fin", "Lieu", "Cayenne", "Categorie_CR", "Actif", "Commentaire"],
  reponses: ["ID_Reponse", "Horodatage", "Source", "Annee", "ID_Evenement", "Date_Evenement", "Titre_Evenement", "Type_Evenement", "Nom", "Prenom", "Email", "Telephone", "Statut", "Cayenne", "Reponse", "Causes", "Precision", "Aide_Disponible", "Heure_Debut_Aide", "Heure_Fin_Aide", "Commentaire", "Cle_Personne", "Mois", "Semaine", "Feuille_CR"]
};

const workbook = Workbook.create();
const sheets = {
  parametres: workbook.worksheets.add("PARAMETRES"),
  membres: workbook.worksheets.add("MEMBRES"),
  calendrier: workbook.worksheets.add("CALENDRIER"),
  reponses: workbook.worksheets.add("REPONSES"),
  suivi: workbook.worksheets.add("SUIVI_ANNUEL"),
  dashboard: workbook.worksheets.add("DASHBOARD"),
  modele: workbook.worksheets.add("MODELE_CR_EVENEMENT"),
  code: workbook.worksheets.add("CODE_GS"),
  html: workbook.worksheets.add("INDEX_HTML"),
  notice: workbook.worksheets.add("NOTICE")
};

for (const sheet of Object.values(sheets)) {
  sheet.showGridLines = false;
}

buildParametres();
buildMembres();
buildCalendrier();
buildReponses();
buildSuivi();
buildDashboard();
buildModeleCr();
await buildCodeSheets();
await buildNotice();

await verifyWorkbook();
await fs.mkdir(outputDir, { recursive: true });
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(workbookPath);
console.log(JSON.stringify({ workbookPath }, null, 2));

function title(sheet, range, value) {
  sheet.getRange(range).merge();
  sheet.getRange(range).values = [[value]];
  sheet.getRange(range).format = {
    fill: palette.wine,
    font: { bold: true, color: palette.white, size: 16 },
    horizontalAlignment: "left",
    verticalAlignment: "middle"
  };
}

function headerRow(range) {
  range.format = {
    fill: palette.grey,
    font: { bold: true, color: palette.white },
    borders: { preset: "outside", style: "thin", color: palette.grey },
    wrapText: true
  };
}

function softLabel(range) {
  range.format = {
    fill: palette.soft,
    font: { bold: true, color: palette.wineDark },
    borders: { preset: "outside", style: "thin", color: palette.line }
  };
}

function columnName(index) {
  let name = "";
  let number = index;
  while (number > 0) {
    const remainder = (number - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    number = Math.floor((number - 1) / 26);
  }
  return name;
}

function setWidths(sheet, widths) {
  widths.forEach((width, index) => {
    const column = columnName(index + 1);
    sheet.getRange(`${column}:${column}`).format.columnWidthPx = width;
  });
}

function buildParametres() {
  const sheet = sheets.parametres;
  title(sheet, "A1:H1", "Paramètres du logiciel de présences");
  sheet.getRange("A3:C3").values = [["Paramètre", "Valeur", "Description"]];
  headerRow(sheet.getRange("A3:C3"));
  sheet.getRange("A4:C9").values = [
    ["annee_active", 2026, "Année suivie par défaut"],
    ["cayenne_principale", "Paris", "Cayenne proposée en premier"],
    ["admin_pin", "1234", "Code d’accès au dashboard admin"],
    ["nom_application", "Présences Cayenne de Paris", "Titre affiché dans le formulaire"],
    ["derniere_generation", "", "Champ réservé au script"],
    ["web_app_url", webAppUrl, "Lien public du formulaire Apps Script déployé"]
  ];
  sheet.getRange("A4:A9").format = { font: { bold: true } };

  writeList(sheet, "D3", "Statuts", statuses);
  writeList(sheet, "E3", "Cayennes", cayennes);
  writeList(sheet, "F3", "Réponses", responseTypes);
  writeList(sheet, "G3", "Causes", causes);
  writeList(sheet, "H3", "Types événements", eventTypes);
  setWidths(sheet, [170, 360, 300, 140, 120, 170, 260, 190]);
  sheet.freezePanes.freezeRows(3);
}

function writeList(sheet, anchor, label, values) {
  const cell = sheet.getRange(anchor);
  cell.values = [[label]];
  headerRow(cell);
  const col = anchor.match(/[A-Z]+/)[0];
  sheet.getRange(`${col}4:${col}${3 + values.length}`).values = values.map((value) => [value]);
}

function buildMembres() {
  const sheet = sheets.membres;
  title(sheet, "A1:H1", "Membres suivis");
  sheet.getRange("A3:H3").values = [headers.membres];
  headerRow(sheet.getRange("A3:H3"));
  sheet.getRange("C4:C203").dataValidation = { rule: { type: "list", values: statuses } };
  sheet.getRange("D4:D203").dataValidation = { rule: { type: "list", values: cayennes } };
  sheet.getRange("G4:G203").dataValidation = { rule: { type: "list", values: ["Oui", "Non"] } };
  sheet.getRange("A3:H203").format.borders = { preset: "outside", style: "thin", color: palette.line };
  setWidths(sheet, [140, 140, 120, 100, 220, 140, 80, 280]);
  sheet.freezePanes.freezeRows(3);
}

function buildCalendrier() {
  const sheet = sheets.calendrier;
  title(sheet, "A1:L1", "Calendrier annuel des réunions, cours et événements");
  sheet.getRange("A3:L3").values = [headers.calendrier];
  headerRow(sheet.getRange("A3:L3"));
  const year = 2026;
  const rows = [
    ["EVT-2026-JEUNES-01", year, new Date(year, 0, 15), "Réunion des jeunes janvier", "Réunion des jeunes", "20:00", "22:00", "Cayenne de Paris", "Paris", "Réunion", "Oui", "Exemple à ajuster"],
    ["EVT-2026-COMPAGNONS-01", year, new Date(year, 1, 12), "Réunion compagnon février", "Réunion compagnon", "20:00", "22:00", "Cayenne de Paris", "Paris", "Réunion", "Oui", "Exemple à ajuster"],
    ["EVT-2026-COURS-01", year, new Date(year, 2, 14), "Cours en Cayenne", "Cours en Cayenne", "09:00", "12:00", "Cayenne de Paris", "Paris", "Cours", "Oui", "Date exemple"],
    ["EVT-2026-FETE-JUIN", year, new Date(year, 5, 20), "Fête de juin", "Fête de juin", "08:00", "23:00", "Cayenne de Paris", "Paris", "Événement", "Oui", "Date à confirmer"],
    ["EVT-2026-JEP", year, new Date(year, 8, 19), "Journées européennes du patrimoine", "JEP", "09:00", "18:00", "Cayenne de Paris", "Paris", "Événement", "Oui", "Date à confirmer"],
    ["EVT-2026-FETE-NOVEMBRE", year, new Date(year, 10, 21), "Fête de novembre", "Fête de novembre", "08:00", "23:00", "Cayenne de Paris", "Paris", "Événement", "Oui", "Date à confirmer"]
  ];
  sheet.getRangeByIndexes(3, 0, rows.length, headers.calendrier.length).values = rows;
  sheet.getRange("C4:C503").format.numberFormat = "yyyy-mm-dd";
  sheet.getRange("E4:E503").dataValidation = { rule: { type: "list", values: eventTypes } };
  sheet.getRange("I4:I503").dataValidation = { rule: { type: "list", values: cayennes } };
  sheet.getRange("K4:K503").dataValidation = { rule: { type: "list", values: ["Oui", "Non"] } };
  sheet.getRange("A3:L503").format.borders = { preset: "outside", style: "thin", color: palette.line };
  setWidths(sheet, [190, 70, 110, 260, 180, 90, 90, 180, 100, 120, 70, 220]);
  sheet.freezePanes.freezeRows(3);
}

function buildReponses() {
  const sheet = sheets.reponses;
  title(sheet, "A1:Y1", "Réponses enregistrées par le formulaire");
  sheet.getRange("A3:Y3").values = [headers.reponses];
  headerRow(sheet.getRange("A3:Y3"));
  sheet.getRange("B4:B2003").format.numberFormat = "yyyy-mm-dd hh:mm";
  sheet.getRange("D4:D2003").format.numberFormat = "0";
  sheet.getRange("F4:F2003").format.numberFormat = "yyyy-mm-dd";
  sheet.getRange("M4:M2003").dataValidation = { rule: { type: "list", values: statuses } };
  sheet.getRange("N4:N2003").dataValidation = { rule: { type: "list", values: cayennes } };
  sheet.getRange("O4:O2003").dataValidation = { rule: { type: "list", values: ["Présent", "Absent excusé"] } };
  sheet.getRange("R4:R2003").dataValidation = { rule: { type: "list", values: ["Oui", "Non"] } };
  sheet.getRange("A3:Y2003").format.borders = { preset: "outside", style: "thin", color: palette.line };
  setWidths(sheet, [190, 150, 150, 70, 190, 115, 240, 170, 130, 130, 220, 140, 120, 100, 125, 220, 260, 120, 120, 120, 260, 180, 90, 80, 160]);
  sheet.freezePanes.freezeRows(3);
}

function buildSuivi() {
  const sheet = sheets.suivi;
  title(sheet, "A1:K1", "Suivi annuel par personne");
  sheet.getRange("A3:K3").values = [["Nom", "Prénom", "Statut", "Cayenne", "Clé personne", "Présences", "Absences excusées", "Sans réponse", "Aides proposées", "Taux présence", "Dernière réponse"]];
  headerRow(sheet.getRange("A3:K3"));

  const formulas = [];
  for (let row = 4; row <= 203; row += 1) {
    const memberRow = row;
    formulas.push([
      `=IF('MEMBRES'!A${memberRow}="","",'MEMBRES'!A${memberRow})`,
      `=IF('MEMBRES'!B${memberRow}="","",'MEMBRES'!B${memberRow})`,
      `=IF('MEMBRES'!C${memberRow}="","",'MEMBRES'!C${memberRow})`,
      `=IF('MEMBRES'!D${memberRow}="","",'MEMBRES'!D${memberRow})`,
      `=IF(A${row}="","",UPPER(TRIM(A${row}&" "&B${row})))`,
      `=IF(E${row}="","",COUNTIFS('REPONSES'!$V$4:$V$2003,E${row},'REPONSES'!$D$4:$D$2003,'PARAMETRES'!$B$4,'REPONSES'!$O$4:$O$2003,"Présent"))`,
      `=IF(E${row}="","",COUNTIFS('REPONSES'!$V$4:$V$2003,E${row},'REPONSES'!$D$4:$D$2003,'PARAMETRES'!$B$4,'REPONSES'!$O$4:$O$2003,"Absent excusé"))`,
      `=IF(E${row}="","",MAX(0,COUNTIFS('CALENDRIER'!$B$4:$B$503,'PARAMETRES'!$B$4,'CALENDRIER'!$K$4:$K$503,"Oui")-F${row}-G${row}))`,
      `=IF(E${row}="","",COUNTIFS('REPONSES'!$V$4:$V$2003,E${row},'REPONSES'!$D$4:$D$2003,'PARAMETRES'!$B$4,'REPONSES'!$R$4:$R$2003,"Oui"))`,
      `=IF(E${row}="","",IFERROR(F${row}/(F${row}+G${row}+H${row}),0))`,
      `=IF(E${row}="","",IFERROR(MAXIFS('REPONSES'!$B$4:$B$2003,'REPONSES'!$V$4:$V$2003,E${row},'REPONSES'!$D$4:$D$2003,'PARAMETRES'!$B$4),""))`
    ]);
  }
  sheet.getRangeByIndexes(3, 0, formulas.length, formulas[0].length).formulas = formulas;
  sheet.getRange("F4:I203").format.numberFormat = "0";
  sheet.getRange("J4:J203").format.numberFormat = "0%";
  sheet.getRange("K4:K203").format.numberFormat = "yyyy-mm-dd hh:mm";
  sheet.getRange("A3:K203").format.borders = { preset: "outside", style: "thin", color: palette.line };
  setWidths(sheet, [140, 140, 120, 100, 190, 90, 125, 115, 115, 90, 150]);
  sheet.freezePanes.freezeRows(3);
}

function buildDashboard() {
  const sheet = sheets.dashboard;
  title(sheet, "A1:H1", "Dashboard annuel des présences");
  sheet.getRange("A3:B9").values = [
    ["Année active", ""],
    ["Événements actifs", ""],
    ["Membres actifs", ""],
    ["Présents", ""],
    ["Absents excusés", ""],
    ["Sans réponse estimé", ""],
    ["Aides proposées", ""]
  ];
  softLabel(sheet.getRange("A3:A9"));
  sheet.getRange("B3:B9").formulas = [
    [`='PARAMETRES'!$B$4`],
    [`=COUNTIFS('CALENDRIER'!$B$4:$B$503,$B$3,'CALENDRIER'!$K$4:$K$503,"Oui")`],
    [`=COUNTIF('MEMBRES'!$G$4:$G$203,"Oui")`],
    [`=COUNTIFS('REPONSES'!$D$4:$D$2003,$B$3,'REPONSES'!$O$4:$O$2003,"Présent")`],
    [`=COUNTIFS('REPONSES'!$D$4:$D$2003,$B$3,'REPONSES'!$O$4:$O$2003,"Absent excusé")`],
    [`=MAX(0,B4*B5-B6-B7)`],
    [`=COUNTIFS('REPONSES'!$D$4:$D$2003,$B$3,'REPONSES'!$R$4:$R$2003,"Oui")`]
  ];
  sheet.getRange("B3:B9").format = { font: { bold: true, size: 12 } };
  sheet.getRange("B3:B9").format.numberFormat = "0";

  sheet.getRange("A11:B11").values = [["Formulaire public", webAppUrl]];
  softLabel(sheet.getRange("A11:A11"));

  sheet.getRange("D3:H3").values = [["Type", "Événements", "Présents", "Excusés", "Aides"]];
  headerRow(sheet.getRange("D3:H3"));
  const typeRows = eventTypes.map((type, index) => {
    const row = 4 + index;
    return [
      type,
      `=COUNTIFS('CALENDRIER'!$B$4:$B$503,$B$3,'CALENDRIER'!$E$4:$E$503,D${row},'CALENDRIER'!$K$4:$K$503,"Oui")`,
      `=COUNTIFS('REPONSES'!$D$4:$D$2003,$B$3,'REPONSES'!$H$4:$H$2003,D${row},'REPONSES'!$O$4:$O$2003,"Présent")`,
      `=COUNTIFS('REPONSES'!$D$4:$D$2003,$B$3,'REPONSES'!$H$4:$H$2003,D${row},'REPONSES'!$O$4:$O$2003,"Absent excusé")`,
      `=COUNTIFS('REPONSES'!$D$4:$D$2003,$B$3,'REPONSES'!$H$4:$H$2003,D${row},'REPONSES'!$R$4:$R$2003,"Oui")`
    ];
  });
  sheet.getRangeByIndexes(3, 3, typeRows.length, 1).values = typeRows.map((row) => [row[0]]);
  sheet.getRangeByIndexes(3, 4, typeRows.length, 4).formulas = typeRows.map((row) => row.slice(1));
  sheet.getRange("E4:H10").format.numberFormat = "0";

  sheet.getRange("A12:B12").values = [["Causes d’absence", "Total"]];
  headerRow(sheet.getRange("A12:B12"));
  sheet.getRangeByIndexes(12, 0, causes.length, 1).values = causes.map((cause) => [cause]);
  sheet.getRangeByIndexes(12, 1, causes.length, 1).formulas = causes.map((cause, idx) => {
    const row = 13 + idx;
    return [`=COUNTIFS('REPONSES'!$D$4:$D$2003,$B$3,'REPONSES'!$O$4:$O$2003,"Absent excusé",'REPONSES'!$P$4:$P$2003,"*"&A${row}&"*")`];
  });

  sheet.getRange("A23:I23").values = [["Nom", "Prénom", "Statut", "Cayenne", "Présences", "Excusés", "Sans réponse", "Aides", "Taux"]];
  headerRow(sheet.getRange("A23:I23"));
  const formulas = [];
  for (let row = 24; row <= 73; row += 1) {
    const sourceRow = row - 20;
    formulas.push([
      `=IF('SUIVI_ANNUEL'!A${sourceRow}="","",'SUIVI_ANNUEL'!A${sourceRow})`,
      `=IF('SUIVI_ANNUEL'!B${sourceRow}="","",'SUIVI_ANNUEL'!B${sourceRow})`,
      `=IF('SUIVI_ANNUEL'!C${sourceRow}="","",'SUIVI_ANNUEL'!C${sourceRow})`,
      `=IF('SUIVI_ANNUEL'!D${sourceRow}="","",'SUIVI_ANNUEL'!D${sourceRow})`,
      `=IF(A${row}="","",'SUIVI_ANNUEL'!F${sourceRow})`,
      `=IF(A${row}="","",'SUIVI_ANNUEL'!G${sourceRow})`,
      `=IF(A${row}="","",'SUIVI_ANNUEL'!H${sourceRow})`,
      `=IF(A${row}="","",'SUIVI_ANNUEL'!I${sourceRow})`,
      `=IF(A${row}="","",'SUIVI_ANNUEL'!J${sourceRow})`
    ]);
  }
  sheet.getRangeByIndexes(23, 0, formulas.length, formulas[0].length).formulas = formulas;
  sheet.getRange("E24:H73").format.numberFormat = "0";
  sheet.getRange("I24:I73").format.numberFormat = "0%";
  sheet.getRange("A3:H20").format.borders = { preset: "outside", style: "thin", color: palette.line };
  sheet.getRange("A23:I73").format.borders = { preset: "outside", style: "thin", color: palette.line };

  try {
    const chart = sheet.charts.add("bar", sheet.getRange("D3:H10"));
    chart.title = "Présences et aides par type d’événement";
    chart.hasLegend = true;
    chart.xAxis = { axisType: "textAxis" };
    chart.yAxis = { numberFormatCode: "0" };
    chart.setPosition("J3", "Q20");
  } catch (error) {
    console.warn("Chart creation skipped:", error.message);
  }

  setWidths(sheet, [220, 80, 90, 240, 100, 100, 115, 100, 55, 90, 90, 90, 90, 90, 90, 90, 90]);
  sheet.freezePanes.freezeRows(3);
}

function buildModeleCr() {
  const sheet = sheets.modele;
  title(sheet, "A1:I1", "Modèle de compte rendu événement");
  sheet.getRange("A3:I3").merge();
  sheet.getRange("A3:I3").values = [["Le script génère une feuille CR_ par événement depuis les réponses. Cette page donne le format attendu pour le compte rendu."]];
  sheet.getRange("A5:B9").values = [
    ["Présents", ""],
    ["Absents excusés", ""],
    ["Sans réponse", ""],
    ["Disponibles pour aider", ""],
    ["Total suivi", ""]
  ];
  softLabel(sheet.getRange("A5:A9"));
  sheet.getRange("A11:I11").values = [["Nom", "Prénom", "Statut", "Cayenne", "Réponse", "Cause", "Précision", "Aide", "Horaire"]];
  headerRow(sheet.getRange("A11:I11"));
  sheet.getRange("A12:I14").values = [
    ["Dupont", "Jean", "Compagnon", "Paris", "Présent", "", "", "Oui", "14:00 - 18:00"],
    ["Martin", "Paul", "Aspirant", "Paris", "Absent excusé", "Travail", "Service du soir", "Non", ""],
    ["Durand", "Claire", "Sociétaire", "Autre", "Sans réponse", "", "", "Non", ""]
  ];
  sheet.getRange("E12:E14").format = { fill: palette.soft, font: { bold: true } };
  sheet.getRange("A11:I14").format.borders = { preset: "outside", style: "thin", color: palette.line };
  setWidths(sheet, [130, 130, 120, 100, 140, 170, 260, 80, 130]);
}

async function buildCodeSheets() {
  const code = await fs.readFile(path.join(rootDir, "src", "Code.gs"), "utf8");
  const html = await fs.readFile(path.join(rootDir, "src", "Index.html"), "utf8");
  writeCodeSheet(sheets.code, "Code.gs", code);
  writeCodeSheet(sheets.html, "Index.html", html);
}

function writeCodeSheet(sheet, filename, content) {
  title(sheet, "A1:C1", `${filename} - à copier dans Apps Script`);
  sheet.getRange("A3:C3").values = [["Ligne", "Contenu", "Note"]];
  headerRow(sheet.getRange("A3:C3"));
  const rows = content.split(/\r?\n/).map((line, index) => [index + 1, line, ""]);
  sheet.getRangeByIndexes(3, 0, rows.length, 3).values = rows;
  sheet.getRange("A4:A2000").format.numberFormat = "0";
  sheet.getRange("B4:B2000").format = { font: { name: "Consolas", size: 9 }, wrapText: false };
  setWidths(sheet, [60, 900, 120]);
  sheet.freezePanes.freezeRows(3);
}

async function buildNotice() {
  const readme = await fs.readFile(path.join(rootDir, "README.md"), "utf8");
  title(sheets.notice, "A1:C1", "Notice de mise en place");
  sheets.notice.getRange("A3:C3").values = [["Étape", "Texte", "Validation"]];
  headerRow(sheets.notice.getRange("A3:C3"));
  const lines = readme
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line, index) => [index + 1, line.replace(/^#+\s*/, ""), ""]);
  sheets.notice.getRangeByIndexes(3, 0, lines.length, 3).values = lines;
  sheets.notice.getRange("B4:B200").format.wrapText = true;
  setWidths(sheets.notice, [60, 900, 120]);
}

async function verifyWorkbook() {
  await fs.mkdir(previewDir, { recursive: true });
  const overview = await workbook.inspect({
    kind: "workbook,sheet,table",
    maxChars: 6000,
    tableMaxRows: 5,
    tableMaxCols: 8
  });
  console.log(overview.ndjson);

  const errors = await workbook.inspect({
    kind: "match",
    searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
    options: { useRegex: true, maxResults: 300 },
    summary: "final formula error scan"
  });
  console.log(errors.ndjson);

  const renderRanges = {
    PARAMETRES: "A1:H20",
    MEMBRES: "A1:H30",
    CALENDRIER: "A1:L30",
    REPONSES: "A1:Y20",
    SUIVI_ANNUEL: "A1:K40",
    DASHBOARD: "A1:Q40",
    MODELE_CR_EVENEMENT: "A1:I25",
    CODE_GS: "A1:C80",
    INDEX_HTML: "A1:C80",
    NOTICE: "A1:C80"
  };

  for (const sheetName of Object.keys(renderRanges)) {
    const preview = await workbook.render({
      sheetName,
      range: renderRanges[sheetName],
      scale: 1,
      format: "png"
    });
    await fs.writeFile(
      path.join(previewDir, `${sheetName}.png`),
      new Uint8Array(await preview.arrayBuffer())
    );
  }
}
