import { readFileSync } from 'node:fs';
import { readConnectionSecrets, deploymentFromWorkflow } from './check-apps-script-connection.mjs';

// Read-only diagnosis. Never log credentials, user identities or source contents.
async function main() {
  if (process.env.GITHUB_ACTIONS !== 'true') throw new Error('Exécutez ce diagnostic depuis GitHub Actions.');
  const { scriptId, credentials } = readConnectionSecrets(process.env);
  const deploymentId = deploymentFromWorkflow(readFileSync('.github/workflows/deploy-apps-script.yml', 'utf8'));
  const auth = credentials.tokens.default;
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', signal: AbortSignal.timeout(30000),
    body: new URLSearchParams({ grant_type: 'refresh_token', client_id: auth.client_id,
      client_secret: auth.client_secret, refresh_token: auth.refresh_token })
  });
  if (!response.ok) throw new Error('Connexion Google refusée (HTTP ' + response.status + ').');
  const { access_token: accessToken } = await response.json();
  if (!accessToken) throw new Error('Google ne renvoie pas de session valide.');
  const get = async path => {
    const result = await fetch('https://script.googleapis.com/v1/projects/' + encodeURIComponent(scriptId) + path, {
      headers: { Authorization: 'Bearer ' + accessToken }, signal: AbortSignal.timeout(30000)
    });
    if (!result.ok) throw new Error('Lecture Google refusée (HTTP ' + result.status + ').');
    return result.json();
  };
  const deployment = await get('/deployments/' + encodeURIComponent(deploymentId));
  console.log('Déploiement actuel : ' + JSON.stringify({
    version: deployment.deploymentConfig?.versionNumber,
    manifest: deployment.deploymentConfig?.manifestFileName,
    entryPoints: (deployment.entryPoints || []).map(item => ({type: item.entryPointType, webApp: item.webApp?.entryPointConfig}))
  }));
  for (const version of [...new Set([17, deployment.deploymentConfig?.versionNumber])]) {
    const content = await get('/content?versionNumber=' + version);
    const manifestFile = content.files?.find(file => file.name === 'appsscript');
    const manifest = JSON.parse(manifestFile?.source || '{}');
    console.log('Version ' + version + ' : ' + JSON.stringify({
      webapp: manifest.webapp, oauthScopes: manifest.oauthScopes,
      files: (content.files || []).map(file => file.name).sort()
    }));
  }
  console.log('Diagnostic en lecture seule terminé.');
}

main().catch(error => {
  console.error('::error::' + (error.code ? 'Diagnostic réseau interrompu.' : error.message));
  process.exitCode = 1;
});
