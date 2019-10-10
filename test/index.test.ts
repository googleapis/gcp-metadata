/**
 * Copyright 2018 Google LLC
 *
 * Distributed under MIT license.
 * See file LICENSE for detail or copy at https://opensource.org/licenses/MIT
 */

import * as assert from 'assert';
import * as nock from 'nock';
import * as gcp from '../src';

const assertRejects = require('assert-rejects');

// the metadata IP entry:
const HOST = gcp.HOST_ADDRESS;
// the metadata DNS entry:
const SECONDARY_HOST = gcp.SECONDARY_HOST_ADDRESS;
const PATH = gcp.BASE_PATH;
const TYPE = 'instance';
const PROPERTY = 'property';

// NOTE: nodejs switches all incoming header names to lower case.
const HEADERS = {
  [gcp.HEADER_NAME.toLowerCase()]: gcp.HEADER_VALUE,
};

nock.disableNetConnect();

afterEach(() => {
  nock.cleanAll();
});

it('should create the correct accessors', async () => {
  assert(typeof gcp.instance, 'function');
  assert(typeof gcp.project, 'function');
});

it('should access all the metadata properly', async () => {
  const scope = nock(HOST)
    .get(`${PATH}/${TYPE}`, undefined, HEADERS)
    .reply(200, {}, HEADERS);
  await gcp.instance();
  scope.done();
});

it('should access a specific metadata property', async () => {
  const scope = nock(HOST)
    .get(`${PATH}/${TYPE}/${PROPERTY}`)
    .reply(200, {}, HEADERS);
  await gcp.instance(PROPERTY);
  scope.done();
});

it('should set custom headers when supplied', async () => {
  const headers = {human: 'phone', monkey: 'banana'};
  const scope = nock(HOST, {reqheaders: headers})
    .get(`${PATH}/${TYPE}/${PROPERTY}`)
    .reply(200, {}, HEADERS);
  await gcp.instance({property: PROPERTY, headers});
  scope.done();
});

it('should return large numbers as BigNumber values', async () => {
  const BIG_NUMBER_STRING = `3279739563200103600`;
  const scope = nock(HOST)
    .get(`${PATH}/${TYPE}/${PROPERTY}`)
    .reply(200, BIG_NUMBER_STRING, HEADERS);
  const property = await gcp.instance(PROPERTY);
  // property should be a BigNumber.
  assert.strictEqual(property.valueOf(), BIG_NUMBER_STRING);
  scope.done();
});

it('should return small numbers normally', async () => {
  const NUMBER = 32797;
  const scope = nock(HOST)
    .get(`${PATH}/${TYPE}/${PROPERTY}`)
    .reply(200, `${NUMBER}`, HEADERS);
  const property = await gcp.instance(PROPERTY);
  assert.strictEqual(typeof property, 'number');
  assert.strictEqual(property, NUMBER);
  scope.done();
});

it('should deal with nested large numbers', async () => {
  const BIG_NUMBER_STRING = `3279739563200103600`;
  const RESPONSE = `{ "v1": true, "v2": ${BIG_NUMBER_STRING} }`;
  const scope = nock(HOST)
    .get(`${PATH}/${TYPE}/${PROPERTY}`)
    .reply(200, RESPONSE, HEADERS);
  const response = await gcp.instance(PROPERTY);
  assert.strictEqual(response.v2.valueOf(), BIG_NUMBER_STRING);
  scope.done();
});

it('should accept an object with property and query fields', async () => {
  const QUERY = {key: 'value'};
  const scope = nock(HOST)
    .get(`${PATH}/project/${PROPERTY}`)
    .query(QUERY)
    .reply(200, {}, HEADERS);
  await gcp.project({property: PROPERTY, params: QUERY});
  scope.done();
});

it('should return the request error', async () => {
  const scope = nock(HOST)
    .get(`${PATH}/${TYPE}`)
    .times(4)
    .reply(500, undefined, HEADERS);
  await assertRejects(gcp.instance(), /Unsuccessful response status code/);
  scope.done();
});

it('should return error when res is empty', async () => {
  const scope = nock(HOST)
    .get(`${PATH}/${TYPE}`)
    .reply(200, undefined, HEADERS);
  await assertRejects(gcp.instance());
  scope.done();
});

it('should return error when flavor header is incorrect', async () => {
  const scope = nock(HOST)
    .get(`${PATH}/${TYPE}`)
    .reply(200, {}, {[gcp.HEADER_NAME.toLowerCase()]: 'Hazelnut'});
  await assertRejects(
    gcp.instance(),
    /Invalid response from metadata service: incorrect Metadata-Flavor header./
  );
  scope.done();
});

it('should return error if statusCode is not 200', async () => {
  const scope = nock(HOST)
    .get(`${PATH}/${TYPE}`)
    .reply(418, {}, HEADERS);
  await assertRejects(gcp.instance(), /Unsuccessful response status code/);
  scope.done();
});

it('should retry if the initial request fails', async () => {
  const scope = nock(HOST)
    .get(`${PATH}/${TYPE}`)
    .times(2)
    .reply(500)
    .get(`${PATH}/${TYPE}`)
    .reply(200, {}, HEADERS);
  await gcp.instance();
  scope.done();
});

it('should throw if request options are passed', async () => {
  await assertRejects(
    // tslint:disable-next-line no-any
    gcp.instance({qs: {one: 'two'}} as any),
    /\'qs\' is not a valid configuration option. Please use \'params\' instead\./
  );
});

it('should throw if invalid options are passed', async () => {
  await assertRejects(
    // tslint:disable-next-line no-any
    gcp.instance({fake: 'news'} as any),
    /\'fake\' is not a valid/
  );
});

it('should retry on DNS errors', async () => {
  const scope = nock(HOST)
    .get(`${PATH}/${TYPE}`)
    .replyWithError({code: 'ETIMEDOUT'})
    .get(`${PATH}/${TYPE}`)
    .reply(200, {}, HEADERS);
  const data = await gcp.instance();
  scope.done();
  assert(data);
});

async function secondaryHostRequest(
  delay: number,
  responseType = 'success'
): Promise<void> {
  let secondary: nock.Scope;
  if (responseType === 'success') {
    secondary = nock(SECONDARY_HOST)
      .get(`${PATH}/${TYPE}`)
      .delayConnection(delay)
      .reply(200, {}, HEADERS);
  } else {
    secondary = nock(SECONDARY_HOST)
      .get(`${PATH}/${TYPE}`)
      .delayConnection(delay)
      .replyWithError({code: responseType});
  }
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        secondary.done();
        return resolve();
      } catch (err) {
        return reject(err);
      }
    }, delay + 50);
  });
}

it('should report isGCE if primary server returns 500 followed by 200', async () => {
  const secondary = secondaryHostRequest(500);
  const primary = nock(HOST)
    .get(`${PATH}/${TYPE}`)
    .twice()
    .reply(500)
    .get(`${PATH}/${TYPE}`)
    .reply(200, {}, HEADERS);
  const isGCE = await gcp.isAvailable();
  await secondary;
  primary.done();
  assert.strictEqual(isGCE, true);
});

it('should fail fast on isAvailable if ENOTFOUND is returned', async () => {
  const secondary = secondaryHostRequest(500);
  const primary = nock(HOST)
    .get(`${PATH}/${TYPE}`)
    .replyWithError({code: 'ENOTFOUND'});
  const isGCE = await gcp.isAvailable();
  await secondary;
  primary.done();
  assert.strictEqual(false, isGCE);
});

it('should log error if DEBUG_AUTH is set', async () => {
  process.env.DEBUG_AUTH = 'true';

  const info = console.info;
  let err: Error | null = null;
  console.info = (_err: Error) => {
    err = _err;
  };

  const secondary = secondaryHostRequest(500);
  const primary = nock(HOST)
    .get(`${PATH}/${TYPE}`)
    .replyWithError({code: 'ENOTFOUND'});
  const isGCE = await gcp.isAvailable();
  await secondary;
  primary.done();
  console.info = info;
  delete process.env.DEBUG_AUTH;
  assert.strictEqual(/failed, reason/.test(err!.message), true);
});

it('should fail fast on isAvailable if ENETUNREACH is returned', async () => {
  const secondary = secondaryHostRequest(500);
  const primary = nock(HOST)
    .get(`${PATH}/${TYPE}`)
    .replyWithError({code: 'ENETUNREACH'});
  const isGCE = await gcp.isAvailable();
  await secondary;
  primary.done();
  assert.strictEqual(false, isGCE);
});

it('should fail fast on isAvailable if ENOENT is returned', async () => {
  const secondary = secondaryHostRequest(500);
  const primary = nock(HOST)
    .get(`${PATH}/${TYPE}`)
    .replyWithError({code: 'ENOENT'});
  const isGCE = await gcp.isAvailable();
  await secondary;
  primary.done();
  assert.strictEqual(false, isGCE);
});

it('should fail on isAvailable if request times out', async () => {
  const secondary = secondaryHostRequest(5000);
  const primary = nock(HOST)
    .get(`${PATH}/${TYPE}`)
    .delayConnection(3500)
    // this should never get called, as the 3000 timeout will trigger.
    .reply(200, {}, HEADERS);
  const isGCE = await gcp.isAvailable();
  // secondary is allowed to simply timeout in the aether, to avoid
  // having a test that waits 5000 ms.
  primary.done();
  assert.strictEqual(false, isGCE);
});

it('should report isGCE if secondary responds before primary', async () => {
  const secondary = secondaryHostRequest(10);
  const primary = nock(HOST)
    .get(`${PATH}/${TYPE}`)
    .delayConnection(3500)
    // this should never get called, as the 3000 timeout will trigger.
    .reply(200, {}, HEADERS);
  const isGCE = await gcp.isAvailable();
  await secondary;
  primary.done();
  assert.strictEqual(isGCE, true);
});

it('should fail fast on isAvailable if ENOENT is returned by secondary', async () => {
  const secondary = secondaryHostRequest(10, 'ENOENT');
  const primary = nock(HOST)
    .get(`${PATH}/${TYPE}`)
    .delayConnection(250)
    .replyWithError({code: 'ENOENT'});
  const isGCE = await gcp.isAvailable();
  await secondary;
  primary.done();
  assert.strictEqual(false, isGCE);
});

it('should throw on unexpected errors', async () => {
  const primary = nock(HOST)
    .get(`${PATH}/${TYPE}`)
    .replyWithError({code: '🤡'});
  const secondary = nock(SECONDARY_HOST)
    .get(`${PATH}/${TYPE}`)
    .replyWithError({code: '🤡'});
  await assertRejects(gcp.isAvailable());
  primary.done();
  secondary.done();
});
