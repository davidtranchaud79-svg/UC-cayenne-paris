import assert from 'node:assert/strict';
import test from 'node:test';
import { deployExisting, findExistingDeployment, parseClaspResult } from '../scripts/deploy-apps-script.mjs';

const deploymentId = 'AKfy-test-deployment';
const description = 'GitHub test-commit';
const old = { deploymentId, versionNumber: 4, description: 'Previous release' };
const fresh = { deploymentId, versionNumber: 5, description };

test('preflight only reads deployment metadata and rejects a different project', () => {
  const calls = [];
  assert.deepEqual(findExistingDeployment(deploymentId, args => { calls.push(args); return [old]; }), old);
  assert.deepEqual(calls, [['list-deployments']]);
  assert.throws(() => findExistingDeployment(deploymentId, () => []), /ne correspond pas/);
});

test('rejects the observed clasp failure even when its exit code is zero', () => {
  assert.throws(() => parseClaspResult({ status: 0, stdout: 'Invalid deployment ID: example' }), /pas confirmé/);
});

test('rejects a failed command even if it prints JSON', () => {
  assert.throws(() => parseClaspResult({ status: 1, stdout: JSON.stringify(fresh) }), /échoué/);
});

test('does not publish to a project that does not own the public link', async () => {
  const calls = [];
  await assert.rejects(() => deployExisting({ deploymentId, description, run(args) {
    calls.push(args);
    return [{ ...old, deploymentId: 'AKfy-another-app' }];
  } }), /ne correspond pas/);
  assert.deepEqual(calls, [['list-deployments']]);
});

test('rejects a response for another deployment or an unchanged version', async () => {
  for (const bad of [{ ...fresh, deploymentId: 'AKfy-another-app' }, { ...fresh, versionNumber: 4 }, {}]) {
    let call = 0;
    await assert.rejects(() => deployExisting({ deploymentId, description, run: () => call++ ? bad : [old] }), /pas été confirmée/);
  }
});

test('rejects an apparent success when Google keeps listing the old version', async () => {
  const results = [[old], fresh];
  await assert.rejects(() => deployExisting({ deploymentId, description,
    run: () => results.length ? results.shift() : [old], wait: async () => {}
  }), /ne retrouve pas/);
});

test('accepts only a matching new version read back from Google', async () => {
  const results = [[old], fresh, [fresh]];
  const calls = [];
  const result = await deployExisting({ deploymentId, description, run(args) {
    calls.push(args);
    return results.shift();
  } });
  assert.deepEqual(result, fresh);
  assert.deepEqual(calls[1], ['update-deployment', deploymentId, '--description', description]);
  assert.equal(calls.length, 3);
});

test('waits for Google to list the new version after a delayed update', async () => {
  const results = [[old], fresh, [old], [old], [fresh]];
  let waits = 0;
  const result = await deployExisting({ deploymentId, description,
    run: () => results.shift(), wait: async () => { waits++; }
  });
  assert.deepEqual(result, fresh);
  assert.equal(waits, 2);
});
