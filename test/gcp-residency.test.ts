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

import * as gcpResidency from '../src/gcp-residency';

describe('gcp-residency', () => {
  const ENVIRONMENT_BACKUP = {...process.env};

  beforeEach(() => {
    process.env = {...ENVIRONMENT_BACKUP};
  });

  describe('isGoogleCloudFunction', () => {
    // .
  });

  describe('isGoogleComputeEngineLinux', () => {
    // .
  });

  describe('isGoogleComputeEngineWindows', () => {
    // .
  });

  describe('isGoogleComputeEngine', () => {
    // .
  });

  describe('detectGCPResidency', () => {
    it('should run', () => {
      assert.equal(typeof gcpResidency.detectGCPResidency(), 'boolean');
    });
  });
});
