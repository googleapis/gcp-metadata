/**
 * Copyright 2018 Google LLC
 *
 * Distributed under MIT license.
 * See file LICENSE for detail or copy at https://opensource.org/licenses/MIT
 */

const {assert} = require('chai');
const {execSync} = require('child_process');

describe('gcp-metadata samples', () => {
  it('should run the quickstart', async () => {
    const {stdout} = await execa('node', ['quickstart']);
    assert.match(stdout, /Is available/);
  });
});
