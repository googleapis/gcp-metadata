import test from 'ava';
import {AxiosResponse} from 'axios';
import * as extend from 'extend';
import * as nock from 'nock';
import * as gcp from '../src';

const HOST = gcp.HOST_ADDRESS;
const PATH = gcp.BASE_PATH;
const BASE_URL = gcp.BASE_URL;
const TYPE = 'instance';
const PROPERTY = 'property';
const metadataFlavor = 'Metadata-Flavor';

// NOTE: nodejs switches all incoming header names to lower case.
const HEADERS = {
  'metadata-flavor': 'Google'
};

nock.disableNetConnect();

test.afterEach.always(async t => {
  nock.cleanAll();
});

test.serial('should create the correct accessors', async t => {
  t.is(typeof gcp.instance, 'function');
  t.is(typeof gcp.project, 'function');
});

test.serial('should access all the metadata properly', async t => {
  const scope = nock(HOST).get(`${PATH}/${TYPE}`).reply(200, {}, HEADERS);
  const res = await gcp.instance();
  scope.done();
  t.is(res.config.url, `${BASE_URL}/${TYPE}`);
  t.is(res.config.headers[metadataFlavor], 'Google');
  t.is(res.headers[metadataFlavor.toLowerCase()], 'Google');
});

test.serial('should access a specific metadata property', async t => {
  const scope =
      nock(HOST).get(`${PATH}/${TYPE}/${PROPERTY}`).reply(200, {}, HEADERS);
  const res = await gcp.instance(PROPERTY);
  scope.done();
  t.is(res.config.url, `${BASE_URL}/${TYPE}/${PROPERTY}`);
});

test.serial(
    'should accept an object with property and query fields', async t => {
      const QUERY = {key: 'value'};
      const scope = nock(HOST)
                        .get(`${PATH}/${TYPE}/${PROPERTY}`)
                        .query(QUERY)
                        .reply(200, {}, HEADERS);
      const res = await gcp.instance({property: PROPERTY, params: QUERY});
      scope.done();
      t.is(JSON.stringify(res.config.params), JSON.stringify(QUERY));
      t.is(res.config.url, `${BASE_URL}/${TYPE}/${PROPERTY}`);
    });

test.serial('should extend the request options', async t => {
  const options = {property: PROPERTY, headers: {'Custom-Header': 'Custom'}};
  const originalOptions = extend(true, {}, options);
  const scope =
      nock(HOST).get(`${PATH}/${TYPE}/${PROPERTY}`).reply(200, {}, HEADERS);
  const res = await gcp.instance(options);
  scope.done();
  t.is(res.config.url, `${BASE_URL}/${TYPE}/${PROPERTY}`);
  t.is(res.config.headers['Custom-Header'], 'Custom');
  t.deepEqual(options, originalOptions);  // wasn't modified
});

test.serial('should return the request error', async t => {
  const scope =
      nock(HOST).get(`${PATH}/${TYPE}`).times(2).reply(500, undefined, HEADERS);
  await t.throws(gcp.instance(), 'Unsuccessful response status code');
  scope.done();
});

test.serial('should return error when res is empty', async t => {
  const scope = nock(HOST).get(`${PATH}/${TYPE}`).reply(200, null, HEADERS);
  await t.throws(gcp.instance());
  scope.done();
});

test.serial('should return error when flavor header is incorrect', async t => {
  const scope = nock(HOST).get(`${PATH}/${TYPE}`).reply(200, {}, {
    'metadata-flavor': 'Hazelnut'
  });
  await t.throws(
      gcp.instance(),
      `Invalid response from metadata service: incorrect Metadata-Flavor header.`);
  scope.done();
});

test.serial('should return error if statusCode is not 200', async t => {
  const scope = nock(HOST).get(`${PATH}/${TYPE}`).reply(418, {}, HEADERS);
  await t.throws(gcp.instance(), 'Unsuccessful response status code');
  scope.done();
});

test.serial('should retry if the initial request fails', async t => {
  const scopes = [
    nock(HOST).get(`${PATH}/${TYPE}`).reply(500),
    nock(HOST).get(`${PATH}/${TYPE}`).reply(200, {}, HEADERS)
  ];
  const res = await gcp.instance();
  scopes.forEach(s => s.done());
  t.is(res.config.url, `${BASE_URL}/${TYPE}`);
});

test.serial('should throw if request options are passed', async t => {
  // tslint:disable-next-line no-any
  await t.throws((gcp as any).instance({qs: {one: 'two'}}), e => {
    return e.message.startsWith('\'qs\' is not a valid');
  });
});

test.serial('should not retry on DNS errors', async t => {
  const scope =
      nock(HOST).get(`${PATH}/${TYPE}`).replyWithError({code: 'ETIMEDOUT'});
  await t.throws(gcp.instance());
  scope.done();
});
