/**
 * Copyright 2018 Google LLC
 *
 * Distributed under MIT license.
 * See file LICENSE for detail or copy at https://opensource.org/licenses/MIT
 */

const gcpMetadata = require('gcp-metadata');

async function main() {
  const isAvailable = await gcpMetadata.isAvailable();
  console.log(`isAvailable: ${isAvailable}`);
  await gcpMetadata.instance(`service-accounts/default/token`);
  const svc = await gcpMetadata.instance({
    property: 'service-accounts/',
    params: {recursive: 'true'},
  });
  console.log('serviceAccounts:');
  console.log(
    JSON.stringify(svc)
      .split('\n')
      .join()
  );
}

main().catch(e => {
  console.error(e);
  throw e;
});
