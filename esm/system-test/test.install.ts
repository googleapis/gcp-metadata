// Copyright 2019 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import assert from 'assert';
import execa from 'execa';
import fs from 'fs';
import mv from 'mv';
import ncp from 'ncp';
import path from 'path';
import tmp from 'tmp';
import {promisify} from 'util';
import {describe, it, before, after} from 'mocha';
import {packNTest} from 'pack-n-play';

import {createServer, Server} from 'node:http';

// @ts-ignore
import pkg from '../../package.json' with { type: 'json' };


/**
 * Optionally keep the staging directory between tests.
 */
const KEEP_STAGING_DIRECTORY = false;

const mvp = promisify(mv) as {} as (...args: string[]) => Promise<void>;
const ncpp = promisify(ncp);


describe('📦 pack and install', () => {
  let stagingDir: tmp.DirResult;
  let stagingPath: string;

  before(() => {
    stagingDir = tmp.dirSync({
      keep: KEEP_STAGING_DIRECTORY,
      unsafeCleanup: true,
    });
    stagingPath = stagingDir.name;
  });

  after('cleanup staging', () => {
    if (!KEEP_STAGING_DIRECTORY) {
      stagingDir.removeCallback();
    }
  });

  describe('pack-n-play', () => {
    let server: Server;
    let url: string;

    before(async () => {
      server = createServer((req, res) => {
        res.writeHead(200, {'content-type': 'text/plain'});
        res.end(`Hello, ${req.headers['user-agent'] || 'World'}`);
      });

      await new Promise<void>((resolve, reject) => {
        server.on('error', reject);
        server.listen(0, resolve);
      });

      const address = server.address()!;

      if (typeof address === 'string') {
        url = address;
      } else {
        const base = new URL('http://localhost');
        base.host = address.address;
        base.port = address.port.toString();

        url = base.toString();
      }
    });

    after(() => {
      server.close();
    });

    it('supports ESM', async () => {
      await packNTest({
        sample: {
          description: 'import as ESM',
          esm: `
          import {Gaxios} from 'gaxios';

          const gaxios = new Gaxios();
          await gaxios.request({url: '${url}'});
          `,
        },
      });
    });

    it('supports CJS', async () => {
      await packNTest({
        sample: {
          description: 'require as CJS',
          cjs: `
          const {Gaxios} = require('gaxios');

          const gaxios = new Gaxios();
          gaxios.request({url: '${url}'}).then(console.log);
          `,
        },
      });
    });
  });

  describe('webpack', () => {
    /**
     * Create a staging directory with temp fixtures used to test on a fresh
     * application.
     */
    before('pack and install', async () => {
      await execa('npm', ['pack']);
      const tarball = `${pkg.name}-${pkg.version}.tgz`;
      await mvp(tarball, `${stagingPath}/gaxios.tgz`);
      await ncpp('esm/system-test/fixtures/sample', `${stagingPath}/`);
      await execa('npm', ['install'], {
        cwd: `${stagingPath}/`,
        stdio: 'inherit',
      });
    });

    it('should be able to webpack the library', async () => {
      // we expect npm install is executed in the before hook
      await execa('npx', ['webpack'], {
        cwd: `${stagingPath}/`,
        stdio: 'inherit',
      });
      const bundle = path.join(stagingPath, 'dist', 'bundle.min.js');
      const stat = fs.statSync(bundle);
      assert(stat.size < 256 * 1024);
    }).timeout(20000);
  });
});