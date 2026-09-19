import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { deploymentFromWorkflow } from './check-apps-script-connection.mjs';
import { findExistingDeployment, parseClaspResult } from './deploy-apps-script.mjs';
import { checkWebApp } from './check-web-app.mjs';

// Restore an explicitly chosen snapshot on the same deployment; never touch Sheet data.
try {
  if (process.env.GITHUB_ACTIONS !== 'true') throw new Error('Utilisez le workflow de restauration GitHub.');
  const deploymentId = deploymentFromWorkflow(readFileSync('.github/workflows/deploy-apps-script.yml', 'utf8'));
  const version = Number(process.env.RESTORE_VERSION);
  const expected = Number(process.env.EXPECTED_VERSION);
  if (![version, expected].every(value => Number.isInteger(value) && value > 0)) throw new Error('Versions de restauration invalides.');
  const run = args => parseClaspResult(spawnSync('clasp', ['--json', ...args], {
    encoding: 'utf8', timeout: 120000, maxBuffer: 1024 * 1024
  }));
  const current = findExistingDeployment(deploymentId, run);
  const before = await checkWebApp(deploymentId);
  console.log('Accès avant restauration : ' + JSON.stringify(before.pages));
  if (before.ok) {
    console.log('Les deux espaces sont accessibles : aucune restauration nécessaire.');
  } else {
    if (current.versionNumber !== expected) throw new Error('Le déploiement a changé depuis le diagnostic ; restauration annulée.');
    const restored = run(['update-deployment', deploymentId, '--versionNumber', String(version), '--description', 'Restauration de la version ' + version]);
    if (restored.deploymentId !== deploymentId || restored.versionNumber !== version) throw new Error('Restauration non confirmée par Google.');
    console.log('Version restaurée : ' + version + '.');
    let result;
    for (let attempt = 0; attempt < 4; attempt++) {
      if (attempt) await new Promise(resolve => setTimeout(resolve, 5000));
      result = await checkWebApp(deploymentId);
      if (result.ok) break;
    }
    console.log('Accès après restauration : ' + JSON.stringify(result.pages));
    if (!result.ok) throw new Error('Version restaurée, mais Google refuse encore l’accès public. Une vérification du déploiement par son propriétaire est nécessaire.');
  }
} catch (error) {
  console.error('::error::' + (error.code ? 'Restauration interrompue.' : error.message));
  process.exitCode = 1;
}
