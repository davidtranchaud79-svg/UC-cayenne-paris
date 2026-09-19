import assert from 'node:assert/strict';
import test from 'node:test';
import { checkWebApp } from '../scripts/check-web-app.mjs';

test('a successful deployment API call cannot hide a Google access refusal', async () => {
  for (const status of [200, 403]) {
    const result = await checkWebApp('AKfy-test', async () => ({
      ok: status === 200, status, text: async () => '<title>Accès refusé</title>Une autorisation est nécessaire'
    }));
    assert.equal(result.ok, false);
  }
});

test('confirms both separate entry forms and rejects a broken bureau page', async () => {
  for (const bureauAvailable of [true, false]) {
    const visited = [];
    const result = await checkWebApp('AKfy-test', async url => {
      visited.push(url);
      return {ok: true, status: 200, text: async () => url.endsWith('?page=admin')
        ? bureauAvailable ? '<form id="accessForm">' : 'Erreur'
        : '<form id="memberLoginForm">'};
    });
    assert.equal(result.ok, bureauAvailable);
    assert.equal(visited.length, 2);
  }
});
