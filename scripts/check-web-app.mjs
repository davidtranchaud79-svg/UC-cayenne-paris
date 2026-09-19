import { pathToFileURL } from 'node:url';

export async function checkWebApp(deploymentId, request = fetch) {
  if (!/^AKfy[A-Za-z0-9_-]+$/.test(deploymentId || '')) throw new Error('Identifiant public invalide.');
  const base = 'https://script.google.com/macros/s/' + deploymentId + '/exec';
  const pages = [];
  for (const [name, suffix, marker] of [['membre', '', 'memberLoginForm'], ['bureau', '?page=admin', 'accessForm']]) {
    try {
      const response = await request(base + suffix, { redirect: 'follow', signal: AbortSignal.timeout(30000) });
      const body = await response.text();
      pages.push({ name, status: response.status, ok: response.ok && body.includes(marker) });
    } catch {
      pages.push({ name, status: 'réseau', ok: false });
    }
  }
  return { ok: pages.every(page => page.ok), pages };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await checkWebApp(process.env.CLASP_DEPLOYMENT_ID);
  for (const page of result.pages) console.log(`${page.name} : HTTP ${page.status}, formulaire ${page.ok ? 'accessible' : 'non confirmé'}.`);
  if (!result.ok) process.exitCode = 1;
}
