import test from 'ava';
import * as cp from 'child_process';
import * as fs from 'fs';
import {ncp} from 'ncp';
import pify from 'pify';
import * as tmp from 'tmp';

const rename = pify(fs.rename);
const ncpp = pify(ncp);
const keep = true;  //!!process.env.GCPM_KEEP_TEMPDIRS;
const stagingDir = tmp.dirSync({keep, unsafeCleanup: true});
const stagingPath = stagingDir.name;
const pkg = require('../../package.json');

const spawnp = (command: string, args: string[], options: cp.SpawnOptions = {}):
    Promise<void> => {
      return new Promise((resolve, reject) => {
        cp.spawn(command, args, Object.assign(options, {stdio: 'inherit'}))
            .on('close',
                (code, signal) => {
                  if (code === 0) {
                    resolve();
                  } else {
                    reject(
                        new Error(`Spawn failed with an exit code of ${code}`));
                  }
                })
            .on('error', err => {
              reject(err);
            });
      });
    };

/**
 * Create a staging directory with temp fixtures used to test on a fresh
 * application.
 */
test('should be able to use the d.ts', async t => {
  console.log(`${__filename} staging area: ${stagingPath}`);
  await spawnp('npm', ['pack']);
  const tarball = `${pkg.name}-${pkg.version}.tgz`;
  await rename(tarball, `${stagingPath}/${pkg.name}.tgz`);
  await ncpp('test/fixtures/kitchen', `${stagingPath}/`);
  await spawnp('npm', ['install'], {cwd: `${stagingPath}/`});
  t.pass();
});

/**
 * CLEAN UP - remove the staging directory when done.
 */
test.after('cleanup staging', () => {
  if (!keep) {
    stagingDir.removeCallback();
  }
});
