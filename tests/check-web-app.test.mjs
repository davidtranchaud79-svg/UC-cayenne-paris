import assert from 'node:assert/strict';
import test from 'node:test';
import { checkWebApp } from '../scripts/check-web-app.mjs';

test('accessible old pages do not pass a check for the new published version',async()=>{
 for(const version of ['', '2026.09.22.1', '2026.09.23.2']){
   const result=await checkWebApp('AKfy-test',async url=>({ok:true,status:200,text:async()=>'<form id="'+(url.includes('admin')?'accessForm':'memberLoginForm')+'">Version '+version}), '2026.09.23.2');
   assert.equal(result.ok,version==='2026.09.23.2');assert.equal(result.pages[0].accessible,true);assert.equal(result.pages[0].version,version);
 }
});

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
