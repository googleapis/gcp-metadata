import test from 'ava';
import {AxiosError} from 'axios';
import * as extend from 'extend';
import * as nock from 'nock';

import * as gcp from '../src';

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
  t.is(res.config.headers[HEADER_NAME], gcp.HEADER_VALUE);
  t.is(res.headers[HEADER_NAME.toLowerCase()], gcp.HEADER_VALUE);
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
      nock(HOST).get(`${PATH}/${TYPE}`).times(4).reply(500, undefined, HEADERS);
  await t.throws(gcp.instance(), (err: AxiosError) => {
    return err.message.startsWith('Unsuccessful response status code') &&
        err.response!.status === 500;
  });
  scope.done();
});

test.serial('should return error when res is empty', async t => {
  const scope = nock(HOST).get(`${PATH}/${TYPE}`).reply(200, null, HEADERS);
  await t.throws(gcp.instance());
  scope.done();
});

test.serial('should return error when flavor header is incorrect', async t => {
  const scope =
      nock(HOST)
          .get(`${PATH}/${TYPE}`)
          .reply(200, {}, {[gcp.HEADER_NAME.toLowerCase()]: 'Hazelnut'});
  await t.throws(
      gcp.instance(),
      `Invalid response from metadata service: incorrect Metadata-Flavor header.`);
  scope.done();
});

test.serial('should return error if statusCode is not 200', async t => {
  const scope = nock(HOST).get(`${PATH}/${TYPE}`).reply(418, {}, HEADERS);
  await t.throws(gcp.instance(), (err: AxiosError) => {
    return err.message.startsWith('Unsuccessful response status code') &&
        err.response!.status === 418;
  });
  scope.done();
});

test.serial('should retry 3 times if the initial request fails', async t => {
  const scope = nock(HOST)
                    .get(`${PATH}/${TYPE}`)
                    .times(2)
                    .reply(500)
                    .get(`${PATH}/${TYPE}`)
                    .reply(200, {}, HEADERS);
  const res = await gcp.instance();
  scope.done();
  t.is(res.config.url, `${BASE_URL}/${TYPE}`);
});

test.serial('should accept a param to set the number of retries', async t => {
  const scope = nock(HOST)
                    .get(`${PATH}/${TYPE}`)
                    .times(3)
                    .reply(500)
                    .get(`${PATH}/${TYPE}`)
                    .reply(200, {}, HEADERS);
  const res = await gcp.instance(undefined, 4);
  scope.done();
  t.is(res.config.url, `${BASE_URL}/${TYPE}`);
});

test.serial('should throw if request options are passed', async t => {
  // tslint:disable-next-line no-any
  await t.throws((gcp as any).instance({qs: {one: 'two'}}), e => {
    return e.message.startsWith('\'qs\' is not a valid');
  });
});

test.serial('should retry on DNS errors', async t => {
  const scope = nock(HOST)
                    .get(`${PATH}/${TYPE}`)
                    .replyWithError({code: 'ETIMEDOUT'})
                    .get(`${PATH}/${TYPE}`)
                    .reply(200, {}, HEADERS);
  const res = await gcp.instance();
  scope.done();
  t.truthy(res.data);
});

test.serial(
    'should report isGCE if the server returns a 500 first', async t => {
      const scope = nock(HOST)
                        .get(`${PATH}/${TYPE}`)
                        .twice()
                        .reply(500)
                        .get(`${PATH}/${TYPE}`)
                        .reply(200, {}, HEADERS);
      const isGCE = await gcp.isAvailable();
      scope.done();
      t.true(isGCE);
    });

test.serial(
    'should fail fast on isAvailable if a network err is returned', async t => {
      const scope =
          nock(HOST).get(`${PATH}/${TYPE}`).replyWithError({code: 'ENOTFOUND'});
      const isGCE = await gcp.isAvailable();
      scope.done();
      t.false(isGCE);
    });
