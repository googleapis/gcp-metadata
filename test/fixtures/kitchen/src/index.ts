/**
 * Copyright 2018 Google LLC
 *
 * Distributed under MIT license.
 * See file LICENSE for detail or copy at https://opensource.org/licenses/MIT
 */

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