import test from 'ava';
import {AxiosResponse} from 'axios';
import * as extend from 'extend';
import * as nock from 'nock';
import * as pify from 'pify';

import * as gcpMetadata from '../src';

const HOST = gcpMetadata.HOST_ADDRESS;
const PATH = gcpMetadata.BASE_PATH;
const BASE_URL = gcpMetadata.BASE_URL;
const TYPE = 'type';
const PROPERTY = 'property';
const metadataFlavor = 'Metadata-Flavor';

// NOTE: nodejs switches all header names to lower case.
const HEADERS = {
  'metadata-flavor': 'Google'
};

nock.disableNetConnect();

test.afterEach.always(async t => {
  nock.cleanAll();
});

test.serial('should create the correct accessors', async t => {
  t.is(typeof gcpMetadata.instance, 'function');
  t.is(typeof gcpMetadata.project, 'function');
});

test.serial('should access all the metadata properly', async t => {
  const getMetadata = gcpMetadata._buildMetadataAccessor(TYPE);
  const scope = nock(HOST).get(`${PATH}/${TYPE}`).reply(200, {}, HEADERS);
  const res = await pify(getMetadata)();
  scope.done();
  t.is(res.config.url, `${BASE_URL}/${TYPE}`);
  t.is(res.config.headers[metadataFlavor], 'Google');
  t.is(res.headers[metadataFlavor.toLowerCase()], 'Google');
});

test.serial('should access a specific metadata property', async t => {
  const getMetadata = gcpMetadata._buildMetadataAccessor(TYPE);
  const scope =
      nock(HOST).get(`${PATH}/${TYPE}/${PROPERTY}`).reply(200, {}, HEADERS);
  const res = await pify(getMetadata)(PROPERTY);
  scope.done();
  t.is(res.config.url, `${BASE_URL}/${TYPE}/${PROPERTY}`);
});

test.serial(
    'should accept an object with property and query fields', async t => {
      const QUERY = {key: 'value'};
      const getMetadata = gcpMetadata._buildMetadataAccessor(TYPE);
      const scope = nock(HOST)
                        .get(`${PATH}/${TYPE}/${PROPERTY}`)
                        .query(QUERY)
                        .reply(200, {}, HEADERS);
      const res = await pify(getMetadata)({property: PROPERTY, params: QUERY});
      scope.done();
      t.is(JSON.stringify(res.config.params), JSON.stringify(QUERY));
      t.is(res.config.url, `${BASE_URL}/${TYPE}/${PROPERTY}`);
    });

test.serial('should extend the request options', async t => {
  const getMetadata = gcpMetadata._buildMetadataAccessor(TYPE);
  const options = {property: PROPERTY, headers: {'Custom-Header': 'Custom'}};
  const originalOptions = extend(true, {}, options);
  const scope =
      nock(HOST).get(`${PATH}/${TYPE}/${PROPERTY}`).reply(200, {}, HEADERS);
  const res = await pify(getMetadata)(options);
  scope.done();
  t.is(res.config.url, `${BASE_URL}/${TYPE}/${PROPERTY}`);
  t.is(res.config.headers['Custom-Header'], 'Custom');
  t.deepEqual(options, originalOptions);  // wasn't modified
});

test.serial('should return the request error', async t => {
  const getMetadata = gcpMetadata._buildMetadataAccessor(TYPE);
  const scope =
      nock(HOST).get(`${PATH}/${TYPE}`).times(2).reply(500, undefined, HEADERS);
  await t.throws(pify(getMetadata)(), 'Unsuccessful response status code');
  scope.done();
});

test.serial('should return error when res is empty', async t => {
  const getMetadata = gcpMetadata._buildMetadataAccessor(TYPE);
  const scope = nock(HOST).get(`${PATH}/${TYPE}`).reply(200, null, HEADERS);
  await t.throws(pify(getMetadata)());
  scope.done();
});

test.serial('should return error when flavor header is incorrect', async t => {
  const getMetadata = gcpMetadata._buildMetadataAccessor(TYPE);
  const scope = nock(HOST).get(`${PATH}/${TYPE}`).reply(200, {}, {
    'metadata-flavor': 'Hazelnut'
  });
  await t.throws(
      pify(getMetadata)(),
      `The 'Metadata-Flavor' header is not set to 'Google'.`);
  scope.done();
});

test.serial('should return error if statusCode is not 200', async t => {
  const getMetadata = gcpMetadata._buildMetadataAccessor(TYPE);
  const scope = nock(HOST).get(`${PATH}/${TYPE}`).reply(418, {}, HEADERS);
  await t.throws(pify(getMetadata)(), 'Unsuccessful response status code');
  scope.done();
});

test.serial('should retry if the initial request fails', async t => {
  const getMetadata = gcpMetadata._buildMetadataAccessor(TYPE);
  const scopes = [
    nock(HOST).get(`${PATH}/${TYPE}`).reply(500),
    nock(HOST).get(`${PATH}/${TYPE}`).reply(200, {}, HEADERS)
  ];
  const res = await pify(getMetadata)();
  scopes.forEach(s => s.done());
  t.is(res.config.url, `${BASE_URL}/${TYPE}`);
});

test.serial('should throw if request options are passed', async t => {
  const getMetadata = gcpMetadata._buildMetadataAccessor(TYPE);
  // tslint:disable-next-line no-any
  await t.throws(pify((gcpMetadata as any).instance)({qs: {one: 'two'}}), e => {
    return e.message.startsWith('\'qs\' is not a valid');
  });
});

test.serial('should not retry on DNS errors', async t => {
  const getMetadata = gcpMetadata._buildMetadataAccessor(TYPE);
  const scope =
      nock(HOST).get(`${PATH}/${TYPE}`).replyWithError({code: 'ETIMEDOUT'});
  await t.throws(pify(getMetadata)());
  scope.done();
});
