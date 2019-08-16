/**
 * Copyright 2018 Google LLC
 *
 * Distributed under MIT license.
 * See file LICENSE for detail or copy at https://opensource.org/licenses/MIT
 */

import {ncp} from 'ncp';
import * as tmp from 'tmp';
import {promisify} from 'util';
import {execSync} from 'child_process';

describe('installation', () => {
  const ncpp = promisify(ncp);
  const keep = !!process.env.GCPM_KEEP_TEMPDIRS;
  const stagingDir = tmp.dirSync({keep, unsafeCleanup: true});
  const stagingPath = stagingDir.name;
  const pkg = require('../../package.json');

  /**
   * Create a staging directory with temp fixtures used to test on a fresh
   * application.
   */
  it('should be able to use the d.ts', async () => {
    console.log(`${__filename} staging area: ${stagingPath}`);
    execSync('npm pack', {stdio: 'inherit'});
    const tarball = `${pkg.name}-${pkg.version}.tgz`;
    await ncpp(tarball, `${stagingPath}/${pkg.name}.tgz`);
    await ncpp('system-test/fixtures/kitchen', `${stagingPath}/`);
    execSync('npm install', {cwd: `${stagingPath}/`, stdio: 'inherit'});
  });

  /**
   * CLEAN UP - remove the staging directory when done.
   */
  after('cleanup staging', () => {
    if (!keep) {
      stagingDir.removeCallback();
    }
  });
});
