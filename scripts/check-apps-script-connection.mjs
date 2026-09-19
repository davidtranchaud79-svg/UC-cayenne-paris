import { spawnSync } from 'node:child_process';
import { appendFileSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export function readConnectionSecrets(env) {
  const scriptId = (env.CLASP_SCRIPT_ID || '').trim();
  if (!scriptId) throw new Error('Secret manquant : CLASP_SCRIPT_ID.');
  if (!/^[A-Za-z0-9_-]+$/.test(scriptId)) {
    throw new Error('CLASP_SCRIPT_ID doit contenir uniquement l’ID du projet Apps Script, sans URL.');
  }
  if (!env.CLASPRC_JSON?.trim()) throw new Error('Secret manquant : CLASPRC_JSON.');
  let credentials;
  try { credentials = JSON.parse(env.CLASPRC_JSON); }
  catch { throw new Error('CLASPRC_JSON doit contenir le fichier JSON complet obtenu après clasp login.'); }
  const token = credentials?.tokens?.default;
  if (token?.type !== 'authorized_user' ||
      ['client_id', 'client_secret', 'refresh_token'].some(key =>
        typeof token[key] !== 'string' || !token[key].trim())) {
    throw new Error('CLASPRC_JSON est incomplet pour clasp 3.4.1 : recopiez le fichier complet après connexion Google.');
  }
  return { scriptId, credentials: { tokens: { default: token } } };
}

export function deploymentFromWorkflow(workflow) {
  const match = workflow.match(/^\s+CLASP_DEPLOYMENT_ID:\s*(AKfy[A-Za-z0-9_-]+)\s*$/m);
  if (!match) throw new Error('Impossible de lire le déploiement actuel dans le workflow de publication.');
  return match[1];
}

export function verifyGoogleConnection(result, deploymentId) {
  // Inspect errors internally, but never echo clasp output or credential values.
  const errorText = String(result.stdout || '') + '\n' + String(result.stderr || '');
  let deployments;
  try { deployments = JSON.parse(result.stdout); } catch { /* handled below */ }
  if (result.error || result.status !== 0 || !Array.isArray(deployments)) {
    if (/invalid_grant|invalid_client|invalid_token|unauthenticated|\b401\b|token.*(?:expired|revoked)/i.test(errorText)) {
      throw new Error('CLASPRC_JSON : Google a refusé la connexion. Refaites clasp login puis remplacez ce secret par le fichier complet.');
    }
    if (/accessNotConfigured|SERVICE_DISABLED|API.*(?:disabled|not enabled|not been used)/i.test(errorText)) {
      throw new Error('Google indique que l’API Apps Script doit être activée pour cette connexion.');
    }
    if (/permission.denied|access.denied|\b403\b|\b404\b|not found/i.test(errorText)) {
      throw new Error('Le compte associé à CLASPRC_JSON ne peut pas lire le projet CLASP_SCRIPT_ID. Vérifiez le compte Google et l’ID du projet.');
    }
    throw new Error('Google n’a pas confirmé l’accès au projet. La connexion, les droits ou le service doivent être vérifiés.');
  }
  const target = deployments.find(item => item.deploymentId === deploymentId);
  if (!target) {
    throw new Error('CLASP_SCRIPT_ID cible un projet qui ne contient pas le déploiement utilisé par l’application.');
  }
  if (!Number.isInteger(target.versionNumber) || target.versionNumber < 1) {
    throw new Error('Le déploiement existe, mais Google ne renvoie pas de version publiée valide.');
  }
  return { versionNumber: target.versionNumber };
}

function main() {
  // This diagnostic writes temporary credentials only on the disposable CI runner.
  if (process.env.GITHUB_ACTIONS !== 'true') {
    throw new Error('Lancez ce contrôle depuis le workflow GitHub « Vérifier les secrets Apps Script ».');
  }
  const deploymentId = deploymentFromWorkflow(readFileSync('.github/workflows/deploy-apps-script.yml', 'utf8'));
  const connection = readConnectionSecrets(process.env);
  const created = [];
  try {
    for (const [filename, value] of [
      ['.clasp.json', { scriptId: connection.scriptId, rootDir: 'src' }],
      [join(homedir(), '.clasprc.json'), connection.credentials]
    ]) {
      // Never overwrite a pre-existing credential file.
      writeFileSync(filename, JSON.stringify(value), { mode: 0o600, flag: 'wx' });
      created.push(filename);
    }
    const result = spawnSync('clasp', ['--json', 'list-deployments'], {
      encoding: 'utf8', timeout: 60_000, maxBuffer: 1024 * 1024
    });
    const verified = verifyGoogleConnection(result, deploymentId);
    const legacy = (process.env.CLASP_DEPLOYMENT_ID || '').trim();
    const legacyStatus = !legacy ? 'Absent, non requis' :
      legacy === deploymentId ? 'Même identifiant, mais secret non utilisé' :
      'Valeur différente du lien actuel ; secret non utilisé';
    console.log('CLASP_SCRIPT_ID : projet Google accessible et déploiement actuel retrouvé.');
    console.log('CLASPRC_JSON : connexion Google acceptée.');
    console.log('Version Google retrouvée : ' + verified.versionNumber + '.');
    console.log('CLASP_DEPLOYMENT_ID : ' + legacyStatus + '.');
    console.log('Aucune source ni aucun déploiement Google n’a été modifié par ce contrôle.');
    if (process.env.GITHUB_STEP_SUMMARY) {
      appendFileSync(process.env.GITHUB_STEP_SUMMARY,
        '## Vérification des secrets\n\n' +
        '| Contrôle | Résultat |\n| --- | --- |\n' +
        '| CLASP_SCRIPT_ID | Projet accessible et déploiement actuel retrouvé |\n' +
        '| CLASPRC_JSON | Connexion Google acceptée |\n' +
        '| Version publiée | ' + verified.versionNumber + ' |\n' +
        '| CLASP_DEPLOYMENT_ID | ' + legacyStatus + ' |\n\n' +
        'Contrôle en lecture seule. Les valeurs des secrets ne sont pas affichées.\n');
    }
  } finally {
    for (const filename of created.reverse()) unlinkSync(filename);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { main(); }
  catch (error) {
    // Node filesystem/process errors may contain paths; do not dump raw exceptions.
    const message = error.code ? 'Impossible de terminer le contrôle sur le runner GitHub.' : error.message;
    console.error('::error::' + message);
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY,
      '## Vérification interrompue\n\n' + message + '\n\nAucune valeur de secret n’est affichée.\n');
    process.exitCode = 1;
  }
}
