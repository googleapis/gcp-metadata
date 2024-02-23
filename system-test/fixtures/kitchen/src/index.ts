/**
 * Copyright 2018 Google LLC
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

/* eslint-disable */

import * as gcp from 'gcp-metadata';
// uncomment the line below during development
//import * as gcp from '../../../../build/src/index';

const header = gcp.HEADER_NAME;
const headers = gcp.HEADERS;

async function main() {
  const v = await gcp.instance('/somepath');
}

gcp.project('something').then(console.log);

main().catch(console.error);
