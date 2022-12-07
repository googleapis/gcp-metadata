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
import * as fs from 'fs';
import * as os from 'os';

import {beforeEach, describe, it} from 'mocha';
import {SinonSandbox, createSandbox} from 'sinon';

import * as gcpResidency from '../src/gcp-residency';

const ENVIRONMENT_BACKUP = {...process.env};

describe('gcp-residency', () => {
  let sandbox: SinonSandbox;

  beforeEach(() => {
    process.env = {...ENVIRONMENT_BACKUP};
    sandbox = createSandbox();
    removeServerlessEnvironmentVariables();
  });

  afterEach(() => {
    sandbox.restore();
  });

  /**
   * A simple utility for stubbing the networkInterface for GCE emulation.
   *
   * @param isGCE determines if the address should begin with `42:01` or not
   */
  function setGCENetworkInterface(isGCE = true) {
    const mac = isGCE ? '42:01:00:00:00:00' : '00:00:00:00:00:00';

    sandbox.stub(os, 'networkInterfaces').returns({
      'test-interface': [{mac} as os.NetworkInterfaceInfo],
    });
  }

  /**
   * A simple utility for stubbing the platform for GCE emulation.
   *
   * @param platform a Node.js platform
   */
  function setGCEPlatform(platform: NodeJS.Platform = 'linux') {
    sandbox.stub(os, 'platform').returns(platform);
  }

  /**
   * A simple utility for stubbing the Linux BIOS files for GCE emulation.
   *
   * @param isGCE options:
   *   - set `true` to simulate the files exist and are GCE
   *   - set `false` for exist, but are not GCE
   *   - set `null` for simulate ENOENT
   */
  function setGCELinuxBios(isGCE: boolean | null) {
    sandbox.stub(fs, 'statSync').callsFake(path => {
      assert.equal(path, gcpResidency.GCE_LINUX_BIOS_PATHS.BIOS_DATE);

      return undefined;
    });

    sandbox.stub(fs, 'readFileSync').callsFake((path, encoding) => {
      assert.equal(path, gcpResidency.GCE_LINUX_BIOS_PATHS.BIOS_VENDOR);
      assert.equal(encoding, 'utf8');

      if (isGCE === true) {
        return 'x Google x';
      } else if (isGCE === false) {
        return 'Sandwich Co.';
      } else {
        throw new Error("File doesn't exist");
      }
    });
  }

  function removeServerlessEnvironmentVariables() {
    delete process.env.CLOUD_RUN_JOB;
    delete process.env.FUNCTION_NAME;
    delete process.env.K_SERVICE;
  }

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

  describe('isGoogleComputeEngine', () => {
    it('should return `true` if on Linux and has the expected BIOS files', () => {
      setGCENetworkInterface(false);
      setGCEPlatform('linux');
      setGCELinuxBios(true);

      assert.equal(gcpResidency.isGoogleComputeEngine(), true);
    });

    it('should return `false` if on Linux and the expected BIOS files are not GCE', () => {
      setGCENetworkInterface(false);
      setGCEPlatform('linux');
      setGCELinuxBios(false);

      assert.equal(gcpResidency.isGoogleComputeEngine(), false);
    });

    it('should return `false` if on Linux and the BIOS files do not exist', () => {
      setGCENetworkInterface(false);
      setGCEPlatform('linux');
      setGCELinuxBios(null);

      assert.equal(gcpResidency.isGoogleComputeEngine(), false);
    });

    it('should return `true` if the host MAC address begins with `42:01`', () => {
      setGCENetworkInterface(true);
      setGCEPlatform('win32');
      setGCELinuxBios(null);

      assert.equal(gcpResidency.isGoogleComputeEngine(), true);
    });

    it('should return `false` if the host MAC address does not begin with `42:01` & is not Linux', () => {
      setGCENetworkInterface(false);
      setGCEPlatform('win32');
      setGCELinuxBios(null);

      assert.equal(gcpResidency.isGoogleComputeEngine(), false);
    });
  });

  describe('detectGCPResidency', () => {
    it('should return `true` if `isGoogleCloudServerless`', () => {
      // `isGoogleCloudServerless` = true
      process.env.K_SERVICE = '1';

      // `isGoogleComputeEngine` = false
      setGCENetworkInterface(false);

      assert(gcpResidency.detectGCPResidency());
    });

    it('should return `true` if `isGoogleComputeEngine`', () => {
      // `isGoogleCloudServerless` = false
      removeServerlessEnvironmentVariables();

      // `isGoogleComputeEngine` = true
      setGCENetworkInterface(true);

      assert(gcpResidency.detectGCPResidency());
    });

    it('should return `false` !`isGoogleCloudServerless` && !`isGoogleComputeEngine`', () => {
      // `isGoogleCloudServerless` = false
      removeServerlessEnvironmentVariables();

      // `isGoogleComputeEngine` = false
      setGCENetworkInterface(false);

      assert.equal(gcpResidency.detectGCPResidency(), false);
    });
  });
});
