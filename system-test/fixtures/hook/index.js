/**
 * Copyright 2018 Google LLC
 *
 * Distributed under MIT license.
 * See file LICENSE for detail or copy at https://opensource.org/licenses/MIT
 */

const gcpMetadata = require('gcp-metadata');

exports.getMetadata = async (req, res) => {
  const isAvailable = await gcpMetadata.isAvailable();
  const instance = await gcpMetadata.instance();
  res.status(200).send({isAvailable, instance});
};
