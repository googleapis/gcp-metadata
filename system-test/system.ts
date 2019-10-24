/**
 * Copyright 2018 Google LLC
 *
 * Distributed under MIT license.
 * See file LICENSE for detail or copy at https://opensource.org/licenses/MIT
 */

import * as assert from 'assert';
import * as fs from 'fs';
import * as gcbuild from 'gcbuild';
import * as gcx from 'gcx';
import {cloudfunctions_v1, google} from 'googleapis';
import * as path from 'path';
import {promisify} from 'util';
import * as uuid from 'uuid';
import {execSync} from 'child_process';
import {request, GaxiosError, Gaxios} from 'gaxios';

const copy = promisify(fs.copyFile);
const pkg = require('../../package.json');

let gcf: cloudfunctions_v1.Cloudfunctions;
const shortPrefix = 'gcloud-tests';
const fullPrefix = `${shortPrefix}-${uuid.v4().split('-')[0]}`;

describe('gcp metadata', () => {
  before(async () => {
    // pack up the gcp-metadata module and copy to the target dir
    await packModule();
  });

  describe('cloud functions', () => {
    before(async () => {
      // Clean up any old cloud functions just hanging out
      gcf = await getGCFClient();
      await pruneFunctions(false);

      // deploy the function to GCF
      await deployApp();
    });

    it('should access the metadata service on GCF', async () => {
      const projectId = await google.auth.getProjectId();
      const url = `https://us-central1-${projectId}.cloudfunctions.net/${fullPrefix}`;
      try {
        const res = await request({url});
        // tslint:disable-next-line no-any
        const metadata = res.data as any;
        console.log(metadata);
        assert.strictEqual(metadata.isAvailable, true);
      } catch (e) {
        console.error((e as GaxiosError).response!.data);
        assert.fail('Request to the deployed cloud function failed.');
      }
    });

    after(() => pruneFunctions(true));
  });

  describe('cloud build', () => {
    it('should access the metadata service on GCB', async () => {
      try {
        const result = await gcbuild.build({
          sourcePath: path.join(
            __dirname,
            '../../system-test/fixtures/cloudbuild'
          ),
        });
        console.log(result.log);
        assert.ok(/isAvailable: true/.test(result.log));
        assert.ok(
          result.log.includes('"default":{"aliases":["default"],"email"')
        );
      } catch (e) {
        console.error(e.log);
        throw e;
      }
    });
  });
});

/**
 * Create a new GCF client using googleapis, and ensure it's
 * properly authenticated.
 */
async function getGCFClient() {
  const auth = new google.auth.GoogleAuth({
    scopes: 'https://www.googleapis.com/auth/cloud-platform',
  });
  const client = await auth.getClient();
  return google.cloudfunctions({
    version: 'v1',
    auth: client,
  });
}

/**
 * Delete all cloud functions created in the project by this
 * test suite. It can delete ones created in this session, and
 * also delete any of them created > 7 days ago by tests.
 * @param sessionOnly Only prune functions created in this session.
 */
async function pruneFunctions(sessionOnly: boolean) {
  console.log('Pruning leaked functions...');
  const projectId = await google.auth.getProjectId();
  const res = await gcf.projects.locations.functions.list({
    parent: `projects/${projectId}/locations/-`,
  });
  const fns = res.data.functions || [];
  await Promise.all(
    fns
      .filter(fn => {
        if (sessionOnly) {
          return fn.name!.includes(fullPrefix);
        }
        const updateDate = new Date(fn.updateTime!).getTime();
        const currentDate = Date.now();
        const minutesSinceUpdate = (currentDate - updateDate) / 1000 / 60;
        return minutesSinceUpdate > 60 && fn.name!.includes(shortPrefix);
      })
      .map(async fn => {
        await gcf.projects.locations.functions
          .delete({name: fn.name as string})
          .catch(e => {
            console.error(`There was a problem deleting function ${fn.name}.`);
            console.error(e);
          });
      })
  );
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
    targetDir,
  });
}

/**
 * Runs `npm pack` on the root directory, and copies the resulting
 * `gcp-metadata.tgz` over to the target directories in fixtures.
 */
async function packModule() {
  execSync('npm pack', {stdio: 'inherit'});
  const from = `${pkg.name}-${pkg.version}.tgz`;
  const targets = ['hook', 'cloudbuild'];
  await Promise.all(
    targets.map(target => {
      const to = `system-test/fixtures/${target}/${pkg.name}.tgz`;
      return copy(from, to);
    })
  );
}
