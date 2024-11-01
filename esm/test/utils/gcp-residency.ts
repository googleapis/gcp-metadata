/**
 * Copyright 2023 Google LLC
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

import { strict as assert } from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as gcpResidency from '../../src/gcp-residency.js';
import esmock from 'esmock';

export class GCPResidencyUtil {
  stubs: any;
  constructor() {
    this.stubs = {};
  }

  /**
   * A simple utility for stubbing the networkInterface for GCE emulation.
   *
   * @param isGCE determines if the address should begin with `42:01` or not
   */
  async setGCENetworkInterface(isGCE = true) {
    const mac = isGCE ? '42:01:00:00:00:00' : '00:00:00:00:00:00';

    return await esmock('../../src/gcp-residency.js', {
      os: {networkInterfaces: () => ({
        'test-interface': [{ mac }],
      })},
    });
  }

  /**
   * A simple utility for stubbing the platform for GCE emulation.
   *
   * @param platform a Node.js platform
   */
  async setGCEPlatform(platform = 'linux') {
    return await esmock('../../src/gcp-residency.js', {os: {
      platform: () => platform,
    }});
  }

  /**
   * A simple utility for stubbing the Linux BIOS files for GCE emulation.
   *
   * @param isGCE options:
   *   - set `true` to simulate the files exist and are GCE
   *   - set `false` for exist, but are not GCE
   *   - set `null` for simulate ENOENT
   */
  async setGCELinuxBios(isGCE: boolean | null) {
    this.stubs.fsReadFileSync = await esmock('../../src/gcp-residency.js', {fs: {
      readFileSync: (path: unknown, encoding: unknown) => {
        assert.equal(path, gcpResidency.GCE_LINUX_BIOS_PATHS.BIOS_VENDOR);
        assert.equal(encoding, 'utf8');

        if (isGCE === true) {
          return 'x Google x';
        } else if (isGCE === false) {
          return 'Sandwich Co.';
        } else {
          throw new Error("File doesn't exist");
        }
      },
    }});

    this.stubs.fsStatSync = await esmock('../../src/gcp-residency.js', {fs: {
      statSync: (path: unknown) => {
        assert.equal(path, gcpResidency.GCE_LINUX_BIOS_PATHS.BIOS_DATE);
        return undefined;
      },
    }});
  }

  /**
   * Removes serverless-related environment variables from the
   * environment (such as Cloud Run and Cloud Functions).
   */
  async removeServerlessEnvironmentVariables() {
    const customEnv = { ...process.env };

    delete customEnv.CLOUD_RUN_JOB;
    delete customEnv.FUNCTION_NAME;
    delete customEnv.K_SERVICE;

    // console.log(customEnv)
    // this.stubs.processEnv = await esmock('../../src/gcp-residency.js', {process: {
    //   env: customEnv,
    // }});
  }

  /**
   * Sets the environment as non-GCP by stubbing and setting/removing the
   * environment variables.
   */
  async setNonGCP() {
    console.log('in set non gcp?')
    await this.removeServerlessEnvironmentVariables();
    await this.setGCENetworkInterface(false);
    await this.setGCELinuxBios(false);
  }
}