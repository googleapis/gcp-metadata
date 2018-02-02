import * as assert from 'assert';
import * as extend from 'extend';
import * as nock from 'nock';

import * as gcpMetadata from '../src';

const HOST = 'http://metadata.google.internal';
const PATH = '/computeMetadata/v1';
const BASE_URL = `${HOST}${PATH}`;
const TYPE = 'type';
const PROPERTY = 'property';

function createNock() {
  nock(HOST).get(PATH).reply(200, {});
}

describe('gcpMetadata', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  it('should create the correct accessors', () => {
    assert.strictEqual(typeof gcpMetadata.instance, 'function');
    assert.strictEqual(typeof gcpMetadata.project, 'function');
  });

  it('should access all the metadata properly', (done) => {
    const getMetadata = gcpMetadata._buildMetadataAccessor(TYPE);
    nock(HOST).get(`${PATH}/${TYPE}`).reply(200, {});
    getMetadata((err, res) => {
      assert.equal(res!.config.url, `${BASE_URL}/${TYPE}`);
      assert.equal(res!.config.headers['Metadata-Flavor'], 'Google');
      done();
    });
  });

  it('should access a specific metadata property', (done) => {
    const getMetadata = gcpMetadata._buildMetadataAccessor(TYPE);
    nock(HOST).get(`${PATH}/${TYPE}/${PROPERTY}`).reply(200, {});
    getMetadata(PROPERTY, (err, res) => {
      assert.equal(res!.config.url, `${BASE_URL}/${TYPE}/${PROPERTY}`);
      assert.equal(res!.config.headers['Metadata-Flavor'], 'Google');
      done();
    });
  });

  it('should accept an object with property and query fields', (done) => {
    const QUERY = {key: 'value'};
    const getMetadata = gcpMetadata._buildMetadataAccessor(TYPE);
    nock(HOST).get(`${PATH}/${TYPE}/${PROPERTY}`).query(QUERY).reply(200, {});
    getMetadata({property: PROPERTY, params: QUERY}, (err, res) => {
      assert.equal(JSON.stringify(res!.config.params), JSON.stringify(QUERY));
      assert.equal(res!.config.headers['Metadata-Flavor'], 'Google');
      assert.equal(res!.config.url, `${BASE_URL}/${TYPE}/${PROPERTY}`);
      done();
    });
  });

  it('should extend the request options', (done) => {
    const getMetadata = gcpMetadata._buildMetadataAccessor(TYPE);
    const options = {property: PROPERTY, headers: {'Custom-Header': 'Custom'}};
    const originalOptions = extend(true, {}, options);
    nock(HOST).get(`${PATH}/${TYPE}/${PROPERTY}`).reply(200, {});
    getMetadata(options, (err, res) => {
      assert.equal(res!.config.url, `${BASE_URL}/${TYPE}/${PROPERTY}`);
      // assert.equal(res!.config.headers['Metadata-Flavor'], 'Google');
      assert.equal(res!.config.headers['Custom-Header'], 'Custom');
      assert.ifError(err);
      assert.deepEqual(options, originalOptions);  // wasn't modified
      done();
    });
  });

  it('should return the request error', (done) => {
    const getMetadata = gcpMetadata._buildMetadataAccessor(TYPE);
    nock(HOST).get(`${PATH}/${TYPE}`).reply(500, {});
    getMetadata(err => {
      assert.strictEqual(err!.message, 'Unsuccessful response status code');
      done();
    });
  });

  it('should return error when res is empty', (done) => {
    const getMetadata = gcpMetadata._buildMetadataAccessor(TYPE);
    nock(HOST).get(`${PATH}/${TYPE}`).reply(200, null);
    getMetadata((err) => {
      assert(err instanceof Error);
      done();
    });
  });

  it('should return error when flavor header is incorrect', (done) => {
    const getMetadata = gcpMetadata._buildMetadataAccessor(TYPE);
    nock(HOST).get(PATH).reply(200, {}, {'Metadata-Flavor': 'Hazelnut'});
    getMetadata((err) => {
      assert(err instanceof Error);
      done();
    });
  });

  it('should return error if statusCode is not 200', (done) => {
    const getMetadata = gcpMetadata._buildMetadataAccessor(TYPE);
    nock(HOST).get(PATH).reply(418, {}, {'Metadata-Flavor': 'Google'});
    getMetadata((err) => {
      assert(err instanceof Error);
      done();
    });
  });

  it('should retry if the initial request fails', (done) => {
    const getMetadata = gcpMetadata._buildMetadataAccessor(TYPE);
    nock(HOST).get(`${PATH}/${TYPE}`).reply(500);
    nock(HOST).get(`${PATH}/${TYPE}`).reply(200, {});
    getMetadata((err, res) => {
      assert.equal(res!.config.url, `${BASE_URL}/${TYPE}`);
      assert.equal(res!.config.headers['Metadata-Flavor'], 'Google');
      done();
    });
  });

  it('should throw if request options are passed', (done) => {
    const getMetadata = gcpMetadata._buildMetadataAccessor(TYPE);
    // tslint:disable-next-line no-any
    (gcpMetadata as any).instance({qs: {one: 'two'}}, (err: Error) => {
      assert.notEqual(err, null);
      assert(err.message.startsWith('\'qs\' is not a valid'));
      done();
    });
  });

  it('should not retry on DNS errors', (done) => {
    const getMetadata = gcpMetadata._buildMetadataAccessor(TYPE);
    nock(HOST).get(PATH).replyWithError({code: 'ETIMEDOUT'});
    nock(HOST).get(PATH).reply(200, {});
    getMetadata(err => {
      assert(err instanceof Error);
      done();
    });
  });
});
