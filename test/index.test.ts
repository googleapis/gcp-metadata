import * as assert from 'assert';
import * as extend from 'extend';
import * as proxyquire from 'proxyquire';
import * as _gcpMetadata from '../src';

type GcpMetadata = typeof _gcpMetadata;
type RetryRequest =
    (reqOpts: Object, opts: Object,
     callback: (err?: any, request?: any) => void) => void;

// tslint:disable-next-line:no-empty
const noop = () => {};

const VALID_RESPONSE = {
  statusCode: 200
};

describe('gcpMetadata', () => {
  let cachedGcpMetadata: GcpMetadata;
  let gcpMetadata: GcpMetadata;

  let retryRequestOverride: RetryRequest|null;
  let fakeRetryRequest = (...args: any[]) => {
    return ((retryRequestOverride || noop) as Function)(...args);
  };

  before(() => {
    cachedGcpMetadata =
        proxyquire('../src/index.js', {'retry-request': fakeRetryRequest});
  });

  beforeEach(() => {
    retryRequestOverride = null;
    gcpMetadata =
        proxyquire('../src/index.js', {'retry-request': fakeRetryRequest});
    extend(gcpMetadata, cachedGcpMetadata);
  });

  it('should create the correct accessors', () => {
    assert.strictEqual(typeof gcpMetadata.instance, 'function');
    assert.strictEqual(typeof gcpMetadata.project, 'function');
  });

  it('should access all the metadata properly', (done) => {
    const BASE_URL = 'http://metadata.google.internal/computeMetadata/v1';
    const TYPE = 'type';

    const getMetadata = gcpMetadata._buildMetadataAccessor(TYPE);

    retryRequestOverride = (reqOpts, opts, callback) => {
      assert.deepEqual(
          reqOpts,
          {uri: BASE_URL + '/' + TYPE, headers: {'Metadata-Flavor': 'Google'}});
      callback(null, VALID_RESPONSE);
    };

    getMetadata(done);
  });

  it('should access a specific metadata property', (done) => {
    const BASE_URL = 'http://metadata.google.internal/computeMetadata/v1';
    const TYPE = 'type';
    const PROPERTY = 'property';

    const getMetadata = gcpMetadata._buildMetadataAccessor(TYPE);

    retryRequestOverride = (reqOpts, opts, callback) => {
      assert.deepEqual(reqOpts, {
        uri: BASE_URL + '/' + TYPE + '/' + PROPERTY,
        headers: {'Metadata-Flavor': 'Google'}
      });
      callback(null, VALID_RESPONSE);
    };

    getMetadata(PROPERTY, done);
  });

  it('should accept an object with property and query fields', (done) => {
    const BASE_URL = 'http://metadata.google.internal/computeMetadata/v1';
    const TYPE = 'type';
    const PROPERTY = 'property';
    const QUERY = {key: 'value'};

    const getMetadata = gcpMetadata._buildMetadataAccessor(TYPE);

    retryRequestOverride = (reqOpts, opts, callback) => {
      assert.deepEqual(reqOpts, {
        uri: BASE_URL + '/' + TYPE + '/' + PROPERTY,
        headers: {'Metadata-Flavor': 'Google'},
        qs: QUERY
      });
      callback(null, VALID_RESPONSE);
    };

    getMetadata({property: PROPERTY, qs: QUERY}, done);
  });

  it('should extend the request options', (done) => {
    const BASE_URL = 'http://metadata.google.internal/computeMetadata/v1';
    const TYPE = 'type';
    const PROPERTY = 'property';

    const getMetadata = gcpMetadata._buildMetadataAccessor(TYPE);

    retryRequestOverride = (reqOpts, opts, callback) => {
      assert.deepEqual(reqOpts, {
        uri: BASE_URL + '/' + TYPE + '/' + PROPERTY,
        headers: {'Metadata-Flavor': 'Google', 'Custom-Header': 'Custom'}
      });
      callback(null, VALID_RESPONSE);
    };

    const options = {property: PROPERTY, headers: {'Custom-Header': 'Custom'}};

    const originalOptions = extend(true, {}, options);

    getMetadata(options, (err) => {
      assert.ifError(err);
      assert.deepEqual(options, originalOptions);  // wasn't modified
      done();
    });
  });

  it('should return the request error', (done) => {
    const ERROR = Object.assign(new Error('fake error'), {code: 'ETEST'});
    const TYPE = 'type';

    const getMetadata = gcpMetadata._buildMetadataAccessor(TYPE);

    retryRequestOverride = (reqOpts, opts, callback) => {
      callback(ERROR);
    };

    getMetadata((err) => {
      // TSC fails if code isn't defined on err.
      assert.ok(err && typeof (err.code) === 'string');

      assert.strictEqual(err, ERROR);
      done();
    });
  });

  it('should return error when res is empty', (done) => {
    const TYPE = 'type';
    const getMetadata = gcpMetadata._buildMetadataAccessor(TYPE);

    retryRequestOverride = (reqOpts, opts, callback) => {
      callback(null, null);
    };

    getMetadata((err) => {
      assert(err instanceof Error);
      done();
    });
  });

  it('should return error when flavor header is incorrect', (done) => {
    const TYPE = 'type';
    const getMetadata = gcpMetadata._buildMetadataAccessor(TYPE);

    retryRequestOverride = (reqOpts, opts, callback) => {
      callback(null, {headers: {'Metadata-Flavor': 'Hazelnut'}});
    };

    getMetadata((err) => {
      assert(err instanceof Error);
      done();
    });
  });

  it('should return error if statusCode is not 200', (done) => {
    const TYPE = 'type';
    const getMetadata = gcpMetadata._buildMetadataAccessor(TYPE);

    retryRequestOverride = (reqOpts, opts, callback) => {
      callback(null, {headers: {'Metadata-Flavor': 'Google'}, statusCode: 418});
    };

    getMetadata((err) => {
      assert(err instanceof Error);
      done();
    });
  });
});
