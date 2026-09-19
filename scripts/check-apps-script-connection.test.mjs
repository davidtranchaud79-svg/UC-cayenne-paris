import test from 'node:test';
import assert from 'node:assert/strict';
import { readConnectionSecrets, deploymentFromWorkflow, verifyGoogleConnection } from './check-apps-script-connection.mjs';

const marker = 'NEVER_PRINT_THIS_CREDENTIAL';
const env = {
  CLASP_SCRIPT_ID: 'example-script-id',
  CLASPRC_JSON: JSON.stringify({ tokens: { default: {
    type: 'authorized_user', client_id: 'example-client', client_secret: marker, refresh_token: marker
  } } })
};

test('validates the complete clasp credential file and identifies missing secrets', () => {
  assert.equal(readConnectionSecrets(env).scriptId, 'example-script-id');
  assert.throws(() => readConnectionSecrets({ ...env, CLASP_SCRIPT_ID: '' }), /Secret manquant : CLASP_SCRIPT_ID/);
  assert.throws(() => readConnectionSecrets({ ...env, CLASPRC_JSON: '' }), /Secret manquant : CLASPRC_JSON/);
  assert.throws(() => readConnectionSecrets({ ...env, CLASP_SCRIPT_ID: 'https://example.org/project' }), /sans URL/);
  for (const invalid of [marker, '{}', JSON.stringify({ tokens: { default: { refresh_token: marker } } })]) {
    assert.throws(() => readConnectionSecrets({ ...env, CLASPRC_JSON: invalid }), error =>
      error.message.includes('CLASPRC_JSON') && !error.message.includes(marker));
  }
});

test('uses the deployment configured in the publishing workflow', () => {
  assert.equal(deploymentFromWorkflow('    env:\n      CLASP_DEPLOYMENT_ID: AKfy-example\n'), 'AKfy-example');
  assert.throws(() => deploymentFromWorkflow(''), /Impossible de lire/);
});

test('rejects wrong projects and accepts a published version in the intended project', () => {
  const result = { status: 0, stdout: JSON.stringify([{ deploymentId: 'AKfy-example', versionNumber: 10 }]) };
  assert.deepEqual(verifyGoogleConnection(result, 'AKfy-example'), { versionNumber: 10 });
  assert.throws(() => verifyGoogleConnection(result, 'AKfy-another'), /CLASP_SCRIPT_ID cible un projet/);
  assert.throws(() => verifyGoogleConnection({ status: 0, stdout: '[{"deploymentId":"AKfy-example"}]' }, 'AKfy-example'), /version publiée valide/);
});

test('rejects Google errors even with exit code zero and never echoes raw credentials', () => {
  for (const [message, expected] of [
    ['invalid_grant ' + marker, /CLASPRC_JSON : Google a refusé/],
    ['403 PERMISSION_DENIED ' + marker, /ne peut pas lire le projet/],
    ['SERVICE_DISABLED ' + marker, /API Apps Script/],
    [marker, /Google n’a pas confirmé/]
  ]) {
    for (const status of [0, 1]) {
      assert.throws(() => verifyGoogleConnection({ status, stdout: JSON.stringify({ error: message }) }, 'AKfy-example'),
        error => expected.test(error.message) && !error.message.includes(marker));
    }
  }
});
