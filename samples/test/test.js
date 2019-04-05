/**
 * Copyright 2018 Google LLC
 *
 * Distributed under MIT license.
 * See file LICENSE for detail or copy at https://opensource.org/licenses/MIT
 */

const {assert} = require('chai');
const cp = require('child_process');

const execSync = cmd => cp.execSync(cmd, {encoding: 'utf-8'});

describe('gcp-metadata samples', () => {
  it('should run the quickstart', async () => {
    const stdout = execSync('node quickstart');
    assert.match(stdout, /Is available/);
  });
});
