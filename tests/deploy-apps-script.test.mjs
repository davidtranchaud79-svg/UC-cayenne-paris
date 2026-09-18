import assert from 'node:assert/strict';
import test from 'node:test';
import { deployExisting, parseClaspResult } from '../scripts/deploy-apps-script.mjs';

const deploymentId = 'AKfy-test-deployment';
const description = 'GitHub test-commit';
const old = { deploymentId, versionNumber: 4, description: 'Previous release' };
const fresh = { deploymentId, versionNumber: 5, description };

test('rejects the observed clasp failure even when its exit code is zero', () => {
  assert.throws(() => parseClaspResult({ status: 0, stdout: 'Invalid deployment ID: example' }), /pas confirmé/);
});

test('rejects a failed command even if it prints JSON', () => {
  assert.throws(() => parseClaspResult({ status: 1, stdout: JSON.stringify(fresh) }), /échoué/);
});

test('does not publish to a project that does not own the public link', () => {
  const calls = [];
  assert.throws(() => deployExisting({ deploymentId, description, run(args) {
    calls.push(args);
    return [{ ...old, deploymentId: 'AKfy-another-app' }];
  } }), /ne correspond pas/);
  assert.deepEqual(calls, [['list-deployments']]);
});

test('rejects a response for another deployment or an unchanged version', () => {
  for (const bad of [{ ...fresh, deploymentId: 'AKfy-another-app' }, { ...fresh, versionNumber: 4 }, {}]) {
    let call = 0;
    assert.throws(() => deployExisting({ deploymentId, description, run: () => call++ ? bad : [old] }), /pas été confirmée/);
  }
});

test('rejects an apparent success when Google still lists the old version', () => {
  const results = [[old], fresh, [old]];
  assert.throws(() => deployExisting({ deploymentId, description, run: () => results.shift() }), /ne retrouve pas/);
});

test('accepts only a matching new version read back from Google', () => {
  const results = [[old], fresh, [fresh]];
  const calls = [];
  const result = deployExisting({ deploymentId, description, run(args) {
    calls.push(args);
    return results.shift();
  } });
  assert.deepEqual(result, fresh);
  assert.deepEqual(calls[1], ['update-deployment', deploymentId, '--description', description]);
  assert.equal(calls.length, 3);
});
