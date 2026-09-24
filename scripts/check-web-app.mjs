import { pathToFileURL } from 'node:url';

export async function checkWebApp(deploymentId, request = fetch, expectedVersion = '') {
  if (!/^AKfy[A-Za-z0-9_-]+$/.test(deploymentId || '')) throw new Error('Identifiant public invalide.');
  const base = 'https://script.google.com/macros/s/' + deploymentId + '/exec';
  const pages = [];
  for (const [name, suffix, marker] of [['membre', '', 'memberLoginForm'], ['bureau', '?page=admin', 'accessForm']]) {
    try {
      const response = await request(base + suffix, { redirect: 'follow', signal: AbortSignal.timeout(30000) });
      const body = await response.text();
      const version = (body.match(/Version\s+(\d{4}\.\d{2}\.\d{2}\.\d+)/) || [])[1] || '';
      const accessible = response.ok && body.includes(marker);
      pages.push({ name, status: response.status, accessible, version, ok: accessible && (!expectedVersion || version === expectedVersion) });
    } catch {
      pages.push({ name, status: 'réseau', ok: false });
    }
  }
  return { ok: pages.every(page => page.ok), pages };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await checkWebApp(process.env.CLASP_DEPLOYMENT_ID, fetch, process.env.EXPECTED_APP_VERSION || '');
  for (const page of result.pages) console.log(`${page.name} : HTTP ${page.status}, formulaire ${page.accessible ? 'accessible' : 'non confirmé'}, version ${page.version || 'non identifiée'}${page.accessible && !page.ok ? ' (publication attendue)' : ''}.`);
  if (!result.ok) process.exitCode = 1;
}
