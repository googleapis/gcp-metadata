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

  describe('isGoogleCloudFunction', () => {
    it('should return `true` if `K_SERVICE` env is set', () => {
      process.env.K_SERVICE = '1';
      delete process.env.FUNCTION_NAME;

      assert(gcpResidency.isGoogleCloudFunction());
    });

    it('should return `true` if `FUNCTION_NAME` env is set', () => {
      process.env.FUNCTION_NAME = '1';
      delete process.env.K_SERVICE;

      assert(gcpResidency.isGoogleCloudFunction());
    });

    it('should return `false` if neither `K_SERVICE` nor `FUNCTION_NAME` are set', () => {
      delete process.env.FUNCTION_NAME;
      delete process.env.K_SERVICE;

      assert.equal(gcpResidency.isGoogleCloudFunction(), false);
    });
  });

  describe('isGoogleComputeEngine', () => {
    it('should return `true` if the host MAC address begins with `42:01`', () => {
      setGCENetworkInterface(true);

      assert.equal(gcpResidency.isGoogleComputeEngine(), true);
    });

    it('should return `false` if the host MAC address does not begin with `42:01`', () => {
      setGCENetworkInterface(false);

      assert.equal(gcpResidency.isGoogleComputeEngine(), false);
    });
  });

  describe('detectGCPResidency', () => {
    it('should return `true` if `isGoogleCloudFunction`', () => {
      // `isGoogleCloudFunction` = true
      process.env.K_SERVICE = '1';

      // `isGoogleComputeEngine` = false
      setGCENetworkInterface(false);

      assert(gcpResidency.detectGCPResidency());
    });

    it('should return `true` if `isGoogleComputeEngine`', () => {
      // `isGoogleCloudFunction` = false
      delete process.env.FUNCTION_NAME;
      delete process.env.K_SERVICE;

      // `isGoogleComputeEngine` = true
      setGCENetworkInterface(true);

      assert(gcpResidency.detectGCPResidency());
    });

    it('should return `false` !`isGoogleCloudFunction` && !`isGoogleComputeEngine`', () => {
      // `isGoogleCloudFunction` = false
      delete process.env.FUNCTION_NAME;
      delete process.env.K_SERVICE;

      // `isGoogleComputeEngine` = false
      setGCENetworkInterface(false);

      assert.equal(gcpResidency.detectGCPResidency(), false);
    });
  });
});
