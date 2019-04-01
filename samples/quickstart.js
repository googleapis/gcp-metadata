/**
 * Copyright 2018 Google LLC
 *
 * Distributed under MIT license.
 * See file LICENSE for detail or copy at https://opensource.org/licenses/MIT
 */

'use strict';

function main() {
  // [START gcpmetadata_quickstart]
  const gcpMetadata = require('gcp-metadata');

  async function quickstart() {
    // check to see if this code can access a metadata server
    const isAvailable = await gcpMetadata.isAvailable();
    console.log(`Is available: ${isAvailable}`);

    // Instance and Project level metadata will only be available if
    // running inside of a Google Cloud compute environment such as
    // Cloud Functions, App Engine, Kubernetes Engine, or Compute Engine.
    if (isAvailable) {
      // grab all top level metadata from the service
      const instanceMetadata = await gcpMetadata.instance();
      console.log('Instance metadata:');
      console.log(instanceMetadata);

      // get all project level metadata
      const projectMetadata = await gcpMetadata.project();
      console.log('Project metadata:');
      console.log(projectMetadata);
    }
  }

  quickstart();
  // [END gcpmetadata_quickstart]
}

main();
