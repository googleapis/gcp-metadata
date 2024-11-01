/**
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {strict as assert} from 'assert';

import {beforeEach, describe, it} from 'mocha';

import * as gcpResidency from '../src/gcp-residency.js';
import esmock from 'esmock';

  /**
   * Sets the environment as non-GCP by stubbing and setting/removing the
   * environment variables.
   */
  async function setNonGCP() {
    const customEnv = { ...process.env };

    delete customEnv.CLOUD_RUN_JOB;
    delete customEnv.FUNCTION_NAME;
    delete customEnv.K_SERVICE;

    process.env = customEnv;
  }

describe('gcp-residency', () => {

  beforeEach(() => {

    // Default to non-GCP
    setNonGCP();
  });

  afterEach(() => {
    setNonGCP();
  })

  describe('isGoogleCloudServerless', () => {
    it('should return `true` if `CLOUD_RUN_JOB` env is set', () => {
      process.env.CLOUD_RUN_JOB = '1';

      assert(gcpResidency.isGoogleCloudServerless());
    });

    it('should return `true` if `FUNCTION_NAME` env is set', () => {
      process.env.FUNCTION_NAME = '1';

      assert(gcpResidency.isGoogleCloudServerless());
    });

    it('should return `true` if `K_SERVICE` env is set', () => {
      process.env.K_SERVICE = '1';

      assert(gcpResidency.isGoogleCloudServerless());
    });

    it('should return `false` if none of the envs are set', () => {
      assert.equal(gcpResidency.isGoogleCloudServerless(), false);
    });
  });

  describe('isGoogleComputeEngine', async () => {
    it('should return `true` if on Linux and has the expected BIOS files', async () => {
      const {isGoogleComputeEngine} = await esmock('../src/gcp-residency.js', {
        os: {networkInterfaces: () => {
          return {'test-interface': [{ mac: '00:00:00:00:00:00' }]}
        }, platform: () => {return 'linux'}},
        fs: {readFileSync: () => {return 'x Google x'}, statSync: () => {return undefined}}
      });


      assert.equal(isGoogleComputeEngine(), true);
    });

    it('should return `false` if on Linux and the expected BIOS files are not GCE', async () => {
          const {isGoogleComputeEngine} = await esmock('../src/gcp-residency.js', {
            os: {networkInterfaces: () => {
              return {'test-interface': [{ mac: '00:00:00:00:00:00' }]}
            }, platform: () => {return 'linux'}},
            fs: {readFileSync: () => {return 'Sandwich Co.'}, statSync: () => {return undefined}}
          });

      assert.equal(isGoogleComputeEngine(), false);
    });

    it('should return `false` if on Linux and the BIOS files do not exist', async() => {
    const {isGoogleComputeEngine} = await esmock('../src/gcp-residency.js', {
      os: {networkInterfaces: () => {
        return {'test-interface': [{ mac: '00:00:00:00:00:00' }]}
      }, platform: () => {return 'linux'}},
      fs: {readFileSync: () => {throw new Error("File doesn't exist");}, statSync: () => {return undefined}}
    });
      assert.equal(isGoogleComputeEngine(), false);
    });

    it('should return `true` if the host MAC address begins with `42:01`', async () => {
      const {isGoogleComputeEngine} = await esmock('../src/gcp-residency.js', {
        os: {networkInterfaces: () => {
          return {'test-interface': [{ mac: '42:01:00:00:00:00' }]}
        }, platform: () => {return 'win32'}},
        fs: {readFileSync: () => {throw new Error("File doesn't exist")}, statSync: () => {return undefined}}
      });
      assert.equal(isGoogleComputeEngine(), true);
    });

    it('should return `false` if the host MAC address does not begin with `42:01` & is not Linux', async () => {
    const {isGoogleComputeEngine} = await esmock('../src/gcp-residency.js', {
      os: {networkInterfaces: () => {
        return {'test-interface': [{ mac: '00:00:00:00:00:00' }]}
      }, platform: () => {return 'win32'}},
      fs: {readFileSync: () => {throw new Error("File doesn't exist")}, statSync: () => {return undefined}}
    });
      assert.equal(isGoogleComputeEngine(), false);
    });
  });

  describe('detectGCPResidency', () => {
    it('should return `true` if `isGoogleCloudServerless`', async() => {
      // `isGoogleCloudServerless` = true
      process.env.K_SERVICE = '1';

      // `isGoogleComputeEngine` = false
      const {detectGCPResidency} = await esmock('../src/gcp-residency.js', {
        os: {networkInterfaces: () => {
          return {'test-interface': [{ mac: '00:00:00:00:00:00' }]}
        }},
      });

      assert(detectGCPResidency());
    });

    it('should return `true` if `isGoogleComputeEngine`', async () => {
      const {detectGCPResidency} = await esmock('../src/gcp-residency.js', {
        os: {networkInterfaces: () => {
          return {'test-interface': [{ mac: '42:01:00:00:00:00' }]}
        }},
      });
      assert(detectGCPResidency());
    });

    it('should return `false` !`isGoogleCloudServerless` && !`isGoogleComputeEngine`', async () => {
      const {detectGCPResidency} = await esmock('../src/gcp-residency.js', {
        os: {networkInterfaces: () => {
          return {'test-interface': [{ mac: '00:00:00:00:00:00' }]}
        }},
        fs: {statSync: () => {return undefined}}
      });

      assert.equal(detectGCPResidency(), false);
    });
  });
});
