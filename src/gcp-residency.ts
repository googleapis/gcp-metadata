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

import {execSync} from 'child_process';
import {readFileSync} from 'fs';

/**
 * Known paths unique to Google Compute Engine Linux instances
 */
export const GCE_LINUX_BIOS_PATHS = {
  BIOS_DATE: '/sys/class/dmi/id/bios_date',
  BIOS_VENDOR: '/sys/class/dmi/id/bios_vendor',
};

/**
 * Determines if the process is running on a Cloud Functions instance.
 *
 * Uses the {@link https://cloud.google.com/functions/docs/env-var Cloud Functions environment variables}.
 *
 * @returns {boolean} `true` if the process is running on Cloud Functions, `false` otherwise.
 */
export function isGoogleCloudFunction(): boolean {
  /**
   * `K_SERVICE` and `FUNCTION_NAME` are variables unique to Cloud Functions environments:
   * - `FUNCTION_NAME` in {@link https://cloud.google.com/functions/docs/env-var Python 3.7 and Go 1.11}.
   * - `K_SERVICE` in {@link https://cloud.google.com/functions/docs/env-var Newer runtimes}.
   */
  const isGFEnvironment = process.env.K_SERVICE || process.env.FUNCTION_NAME;

  return !!isGFEnvironment;
}

/**
 * Determines if the process is running on a Linux Google Compute Engine instance.
 *
 * @returns {boolean} `true` if the process is running on Linux Google Compute Engine, `false` otherwise.
 */
export function isGoogleComputeEngineLinux(): boolean {
  if (process.platform !== 'linux') return false;

  try {
    // ensure this file exist
    readFileSync(GCE_LINUX_BIOS_PATHS.BIOS_DATE, 'utf8');

    // ensure this file exist and matches
    const biosVendor = readFileSync(GCE_LINUX_BIOS_PATHS.BIOS_VENDOR, 'utf8');

    return /Google/.test(biosVendor);
  } catch {
    return false;
  }
}

/**
 * Determines if the process is running on a Windows Google Compute Engine instance.
 *
 * @returns {boolean} `true` if the process is running on Windows GCE, `false` otherwise.
 */
export function isGoogleComputeEngineWindows(): boolean {
  if (process.platform !== 'win32') return false;

  try {
    // Retrieve BIOS DMI information using WMI under Microsoft PowerShell
    const q =
      'Get-WMIObject -Query "SELECT ReleaseDate, Manufacturer FROM Win32_BIOS"';
    const results = execSync(q, {shell: 'powershell.exe'}).toString();

    // TEMP: debug for Windows
    console.dir({results});

    return /Manufacturer\s*:\s*Google/.test(results);
  } catch (e) {
    // TEMP: debug for Windows
    console.dir({e});

    return false;
  }
}

/**
 * Determines if the process is running on a Google Compute Engine instance.
 *
 * @returns {boolean} `true` if the process is running on GCE, `false` otherwise.
 */
export function isGoogleComputeEngine(): boolean {
  return isGoogleComputeEngineLinux() || isGoogleComputeEngineWindows();
}

/**
 * Determines if the process is running on Google Cloud Platform.
 *
 * @returns {boolean} `true` if the process is running on GCP, `false` otherwise.
 */
export function detectGCPResidency(): boolean {
  return isGoogleCloudFunction() || isGoogleComputeEngine();
}
