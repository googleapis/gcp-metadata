/**
 * Copyright 2018 Google LLC
 *
 * Distributed under MIT license.
 * See file LICENSE for detail or copy at https://opensource.org/licenses/MIT
 */

import * as assert from 'assert';
import * as fs from 'fs';
import * as gcx from 'gcx';
import {cloudfunctions_v1, google} from 'googleapis';
import fetch from 'node-fetch';
import * as path from 'path';
import {promisify} from 'util';
import * as uuid from 'uuid';
import * as execa from 'execa';

const mv = promisify(fs.rename);
const pkg = require('../../package.json');
const projectId = process.env.GCLOUD_PROJECT;

if (!projectId) {
  throw new Error('Please set the `GCLOUD_PROJECT` environment variable.');
}

let gcf: cloudfunctions_v1.Cloudfunctions;
const shortPrefix = 'gcloud-tests';
const fullPrefix = `${shortPrefix}-${uuid.v4().split('-')[0]}`;

describe('gcp metadata', () => {
  before(async () => {
    // Clean up any old cloud functions just hanging out
    gcf = await getGCFClient();
    await pruneFunctions(false);

    // pack up the gcp-metadata module and copy to the target dir
    await packModule();

    // deploy the function to GCF
    await deployApp();
  });

  it('should access the metadata service on GCF', async () => {
    const url =
        `https://us-central1-${projectId}.cloudfunctions.net/${fullPrefix}`;
    const res = await fetch(url);
    if (res.status === 200) {
      const metadata = await res.json();
      console.log(metadata);
      assert.strictEqual(metadata.isAvailable, true);
    } else {
      const text = await res.text();
      console.error(text);
      assert.fail('Request to the deployed cloud function failed.');
    }
  });

  after(() => pruneFunctions(true));
});

/**
 * Create a new GCF client using googleapis, and ensure it's
 * properly authenticated.
 */
async function getGCFClient() {
  const auth = await google.auth.getClient(
      {scopes: 'https://www.googleapis.com/auth/cloud-platform'});
  return google.cloudfunctions({version: 'v1', auth});
}

/**
 * Delete all cloud functions created in the project by this
 * test suite. It can delete ones created in this session, and
 * also delete any of them created > 7 days ago by tests.
 * @param sessionOnly Only prune functions created in this session.
 */
async function pruneFunctions(sessionOnly: boolean) {
  console.log('Pruning leaked functions...');
  const res = await gcf.projects.locations.functions.list(
      {parent: `projects/${projectId}/locations/-`});
  const fns = res.data.functions || [];
  await Promise.all(
      fns.filter(fn => {
           if (sessionOnly) {
             return fn.name!.includes(fullPrefix);
           }
           const updateDate = (new Date(fn.updateTime!)).getTime();
           const currentDate = Date.now();
           const minutesSinceUpdate = (currentDate - updateDate) / 1000 / 60;
           return (minutesSinceUpdate > 60 && fn.name!.includes(shortPrefix));
         })
          .map(async fn => {
            await gcf.projects.locations.functions.delete({name: fn.name})
                .catch(e => {
                  console.error(
                      `There was a problem deleting function ${fn.name}.`);
                  console.error(e);
                });
          }));
}

/**
 * Deploy the hook app to GCF.
 */
async function deployApp() {
  const targetDir = path.join(__dirname, '../../system-test/fixtures/hook');
  await gcx.deploy({
    name: fullPrefix,
    entryPoint: 'getMetadata',
    triggerHTTP: true,
    runtime: 'nodejs8',
    region: 'us-central1',
    targetDir
  });
}

/**
 * Runs `npm pack` on the root directory, and copies the resulting
 * `gcp-metadata.tgz` over to the hook directory in fixtures.
 */
async function packModule() {
  await execa('npm', ['pack'], {stdio: 'inherit'});
  const from = `${pkg.name}-${pkg.version}.tgz`;
  const to = `system-test/fixtures/hook/${pkg.name}.tgz`;
  await mv(from, to);
}
