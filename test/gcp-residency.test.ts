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
import {execSync} from 'child_process';
import * as fs from 'fs';

import {beforeEach, describe, it} from 'mocha';

import * as gcpResidency from '../src/gcp-residency';

function getLinuxBiosVendor() {
  if (process.platform !== 'linux') return '';

  try {
    return fs.readFileSync(
      gcpResidency.GCE_LINUX_BIOS_PATHS.BIOS_VENDOR,
      'utf8'
    );
  } catch {
    return '';
  }
}

function getWindowsBIOSManufacturer() {
  if (process.platform !== 'win32') return '';

  const query = 'Get-WMIObject -Query "SELECT Manufacturer FROM Win32_BIOS"';
  return execSync(query, {shell: 'powershell.exe'}).toString();
}

const ENVIRONMENT_BACKUP = {...process.env};
const EXPECT_CLOUD_FUNCTION = !!process.env.K_SERVICE;
const EXPECT_LINUX_GCE = /Google/.test(getLinuxBiosVendor());
const EXPECT_WINDOWS_GCE = /Google/.test(getWindowsBIOSManufacturer());

/** A simple block to help with debugging failed tests. */
const DEBUG_HELP = JSON.stringify({
  processEnv: process.env,
  getLinuxBiosVendor: getLinuxBiosVendor(),
  getWindowsBIOSManufacturer: getWindowsBIOSManufacturer(),
});

describe('gcp-residency', () => {
  beforeEach(() => {
    process.env = {...ENVIRONMENT_BACKUP};
  });

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

    it('should return the expected result', () => {
      assert.equal(
        gcpResidency.isGoogleCloudFunction(),
        EXPECT_CLOUD_FUNCTION,
        `Expecting \`isGoogleCloudFunction()\` to be \`${EXPECT_CLOUD_FUNCTION}\`. Details: ${DEBUG_HELP}`
      );
    });
  });

  describe('isGoogleComputeEngineLinux', () => {
    it('should return the expected result', () => {
      assert.equal(
        gcpResidency.isGoogleComputeEngineLinux(),
        EXPECT_LINUX_GCE,
        `Expecting \`isGoogleComputeEngineLinux()\` to be \`${EXPECT_LINUX_GCE}\`. Details: ${DEBUG_HELP}`
      );
    });
  });

  describe('isGoogleComputeEngineWindows', () => {
    it('should return the expected result', () => {
      assert.equal(
        gcpResidency.isGoogleComputeEngineWindows(),
        EXPECT_WINDOWS_GCE,
        `Expecting \`isGoogleComputeEngineWindows()\` to be \`${EXPECT_WINDOWS_GCE}\`. Details: ${DEBUG_HELP}`
      );
    });
  });

  describe('isGoogleComputeEngine', () => {
    it('should return the expected result', () => {
      const onGCE = EXPECT_WINDOWS_GCE || EXPECT_LINUX_GCE;

      assert.equal(
        gcpResidency.isGoogleComputeEngine(),
        onGCE,
        `Expecting \`isGoogleComputeEngineWindows()\` to be \`${onGCE}\`. Details: ${DEBUG_HELP}`
      );
    });
  });

  describe('detectGCPResidency', () => {
    it('should return the expected result', () => {
      const onGCP =
        EXPECT_CLOUD_FUNCTION || EXPECT_LINUX_GCE || EXPECT_WINDOWS_GCE;

      assert.equal(
        gcpResidency.detectGCPResidency(),
        onGCP,
        `Expecting \`isGoogleComputeEngineWindows()\` to be \`${onGCP}\`. Details: ${DEBUG_HELP}`
      );
    });
  });
});
