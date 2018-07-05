import assert from 'assert';
import extend from 'extend';
import nock from 'nock';

import * as gcp from '../src';

assert.rejects = require('assert-rejects');

const HOST = gcp.HOST_ADDRESS;
const PATH = gcp.BASE_PATH;
const BASE_URL = gcp.BASE_URL;
const HEADER_NAME = gcp.HEADER_NAME;
const TYPE = 'instance';
const PROPERTY = 'property';

// NOTE: nodejs switches all incoming header names to lower case.
const HEADERS = {
  [gcp.HEADER_NAME.toLowerCase()]: gcp.HEADER_VALUE
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
  const scope = nock(HOST).get(`${PATH}/${TYPE}`).reply(200, {}, HEADERS);
  const res = await gcp.instance();
  scope.done();
  assert(res.config.url, `${BASE_URL}/${TYPE}`);
  assert(res.config.headers[HEADER_NAME], gcp.HEADER_VALUE);
  assert(res.headers[HEADER_NAME.toLowerCase()], gcp.HEADER_VALUE);
});

it('should access a specific metadata property', async () => {
  const scope =
      nock(HOST).get(`${PATH}/${TYPE}/${PROPERTY}`).reply(200, {}, HEADERS);
  const res = await gcp.instance(PROPERTY);
  scope.done();
  assert(res.config.url, `${BASE_URL}/${TYPE}/${PROPERTY}`);
});

it('should accept an object with property and query fields', async () => {
  const QUERY = {key: 'value'};
  const scope = nock(HOST)
                    .get(`${PATH}/project/${PROPERTY}`)
                    .query(QUERY)
                    .reply(200, {}, HEADERS);
  const res = await gcp.project({property: PROPERTY, params: QUERY});
  scope.done();
  assert(JSON.stringify(res.config.params), JSON.stringify(QUERY));
  assert(res.config.url, `${BASE_URL}/${TYPE}/${PROPERTY}`);
});

it('should extend the request options', async () => {
  const options = {property: PROPERTY, headers: {'Custom-Header': 'Custom'}};
  const originalOptions = extend(true, {}, options);
  const scope =
      nock(HOST).get(`${PATH}/${TYPE}/${PROPERTY}`).reply(200, {}, HEADERS);
  const res = await gcp.instance(options);
  scope.done();
  assert(res.config.url, `${BASE_URL}/${TYPE}/${PROPERTY}`);
  assert(res.config.headers['Custom-Header'], 'Custom');
  assert.deepStrictEqual(options, originalOptions);  // wasn't modified
});

it('should return the request error', async () => {
  const scope =
      nock(HOST).get(`${PATH}/${TYPE}`).times(4).reply(500, undefined, HEADERS);
  await assert.rejects(gcp.instance(), /Unsuccessful response status code/);
  scope.done();
});

it('should return error when res is empty', async () => {
  const scope = nock(HOST).get(`${PATH}/${TYPE}`).reply(200, null, HEADERS);
  await assert.rejects(gcp.instance());
  scope.done();
});

it('should return error when flavor header is incorrect', async () => {
  const scope =
      nock(HOST)
          .get(`${PATH}/${TYPE}`)
          .reply(200, {}, {[gcp.HEADER_NAME.toLowerCase()]: 'Hazelnut'});
  await assert.rejects(
      gcp.instance(),
      /Invalid response from metadata service: incorrect Metadata-Flavor header./);
  scope.done();
});

it('should return error if statusCode is not 200', async () => {
  const scope = nock(HOST).get(`${PATH}/${TYPE}`).reply(418, {}, HEADERS);
  await assert.rejects(gcp.instance(), /Unsuccessful response status code/);
  scope.done();
});

it('should retry if the initial request fails', async () => {
  const scope = nock(HOST)
                    .get(`${PATH}/${TYPE}`)
                    .times(2)
                    .reply(500)
                    .get(`${PATH}/${TYPE}`)
                    .reply(200, {}, HEADERS);
  const res = await gcp.instance();
  scope.done();
  assert(res.config.url, `${BASE_URL}/${TYPE}`);
});

it('should throw if request options are passed', async () => {
  await assert.rejects(
      // tslint:disable-next-line no-any
      (gcp as any).instance({qs: {one: 'two'}}), /\'qs\' is not a valid/);
});

it('should retry on DNS errors', async () => {
  const scope = nock(HOST)
                    .get(`${PATH}/${TYPE}`)
                    .replyWithError({code: 'ETIMEDOUT'})
                    .get(`${PATH}/${TYPE}`)
                    .reply(200, {}, HEADERS);
  const res = await gcp.instance();
  scope.done();
  assert(res.data);
});

it('should report isGCE if the server returns a 500 first', async () => {
  const scope = nock(HOST)
                    .get(`${PATH}/${TYPE}`)
                    .twice()
                    .reply(500)
                    .get(`${PATH}/${TYPE}`)
                    .reply(200, {}, HEADERS);
  const isGCE = await gcp.isAvailable();
  scope.done();
  assert(isGCE);
});

it('should fail fast on isAvailable if ENOTFOUND is returned', async () => {
  const scope =
      nock(HOST).get(`${PATH}/${TYPE}`).replyWithError({code: 'ENOTFOUND'});
  const isGCE = await gcp.isAvailable();
  scope.done();
  assert.equal(isGCE, false);
});

it('should fail fast on isAvailable if ENOENT is returned', async () => {
  const scope =
      nock(HOST).get(`${PATH}/${TYPE}`).replyWithError({code: 'ENOENT'});
  const isGCE = await gcp.isAvailable();
  scope.done();
  assert.equal(isGCE, false);
});

it('should throw on unexpected errors', async () => {
  const scope =
      nock(HOST).get(`${PATH}/${TYPE}`).replyWithError({code: '🤡'});
  await assert.rejects(gcp.isAvailable());
  scope.done();
});
