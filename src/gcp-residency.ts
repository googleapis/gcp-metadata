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

import {networkInterfaces} from 'os';

const GCE_MAC_ADDRESS_REGEX = /^42:01/;

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
 * Determines if the process is running on a Google Compute Engine instance.
 *
 * @returns {boolean} `true` if the process is running on GCE, `false` otherwise.
 */
export function isGoogleComputeEngine(): boolean {
  const interfaces = networkInterfaces();

  for (const item of Object.values(interfaces)) {
    if (!item) continue;

    for (const {mac} of item) {
      if (GCE_MAC_ADDRESS_REGEX.test(mac)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Determines if the process is running on Google Cloud Platform.
 *
 * @returns {boolean} `true` if the process is running on GCP, `false` otherwise.
 */
export function detectGCPResidency(): boolean {
  return isGoogleCloudFunction() || isGoogleComputeEngine();
}
