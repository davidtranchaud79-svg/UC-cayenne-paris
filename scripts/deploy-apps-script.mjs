import { spawnSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// clasp 3.4.1 can print an API error while returning exit code 0.
// Require structured confirmation, then read the deployment back from Google.
export function parseClaspResult(result) {
  if (result.error || result.status !== 0) {
    throw new Error('La commande clasp a échoué. Vérifiez la connexion Google et les droits sur le projet.');
  }
  try {
    return JSON.parse(result.stdout);
  } catch {
    throw new Error('Google n’a pas confirmé la publication : clasp n’a pas renvoyé de résultat JSON valide.');
  }
}

function runClasp(args) {
  return parseClaspResult(spawnSync('clasp', ['--json', ...args], {
    encoding: 'utf8',
    timeout: 120_000,
    maxBuffer: 1024 * 1024
  }));
}

export function findExistingDeployment(deploymentId, run = runClasp) {
  if (!/^AKfy[A-Za-z0-9_-]+$/.test(deploymentId || '')) {
    throw new Error('Identifiant du déploiement invalide dans le workflow.');
  }
  const previous = run(['list-deployments']);
  if (!Array.isArray(previous)) throw new Error('La liste des déploiements est invalide.');
  const target = previous.find(item => item.deploymentId === deploymentId);
  if (!target) {
    throw new Error('Le lien public ne correspond pas au projet configuré. Vérifiez CLASP_SCRIPT_ID dans les secrets GitHub.');
  }
  return target;
}

export async function deployExisting({
  deploymentId,
  description,
  run = runClasp,
  wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))
}) {
  const target = findExistingDeployment(deploymentId, run);

  const published = run(['update-deployment', deploymentId, '--description', description]);
  if (published?.deploymentId !== deploymentId ||
      !Number.isInteger(published.versionNumber) || published.versionNumber < 1 ||
      published.description !== description ||
      (Number.isInteger(target.versionNumber) && published.versionNumber <= target.versionNumber)) {
    throw new Error('La nouvelle version du déploiement attendu n’a pas été confirmée.');
  }

  // The list endpoint can briefly return the previous version after an update.
  let verified;
  for (let attempt = 0; attempt < 6; attempt++) {
    if (attempt) await wait(3000);
    const current = run(['list-deployments']);
    verified = Array.isArray(current) && current.find(item => item.deploymentId === deploymentId);
    if (verified && verified.versionNumber === published.versionNumber && verified.description === description) {
      return verified;
    }
  }
  throw new Error('La vérification Google ne retrouve pas la version publiée ' +
    `(attendue : ${published.versionNumber}, observée : ${verified?.versionNumber ?? 'absente'}, ` +
    `référence GitHub conforme : ${verified?.description === description ? 'oui' : 'non'}).`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (process.argv.includes('--check-only')) {
      findExistingDeployment(process.env.CLASP_DEPLOYMENT_ID);
      console.log('Déploiement retrouvé dans le projet Google avant le transfert des sources.');
    } else {
      const deployment = await deployExisting({
        deploymentId: process.env.CLASP_DEPLOYMENT_ID,
        description: `GitHub ${process.env.GITHUB_SHA}`
      });
      const url = `https://script.google.com/macros/s/${deployment.deploymentId}/exec`;
      console.log(`Publication vérifiée auprès de Google : version ${deployment.versionNumber}.`);
      if (process.env.GITHUB_STEP_SUMMARY) {
        appendFileSync(process.env.GITHUB_STEP_SUMMARY,
          `## Application publiée\n\nVersion Google : **${deployment.versionNumber}**\n\n` +
          `[Formulaire public](${url}) · [Administration](${url}?page=admin)\n`);
      }
    }
  } catch (error) {
    console.error(`::error::${error.message}`);
    process.exitCode = 1;
  }
}
