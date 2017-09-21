'use strict'

var assert = require('assert')
var extend = require('extend')
var proxyquire = require('proxyquire')

var VALID_RESPONSE = {
  statusCode: 200
}

describe('gcpMetadata', function () {
  var cachedGcpMetadata
  var gcpMetadata

  var retryRequestOverride
  var fakeRetryRequest = function () {
    return (retryRequestOverride || function () {}).apply(null, arguments)
  }

  before(function () {
    cachedGcpMetadata = proxyquire('./index.js', {
      'retry-request': fakeRetryRequest
    })
  })

  beforeEach(function () {
    retryRequestOverride = null
    gcpMetadata = proxyquire('./index.js', {
      'retry-request': fakeRetryRequest
    })
    extend(gcpMetadata, cachedGcpMetadata)
  })

  it('should create the correct accessors', function () {
    assert.strictEqual(typeof gcpMetadata.instance, 'function')
    assert.strictEqual(typeof gcpMetadata.project, 'function')
  })

  it('should access all the metadata properly', function (done) {
    var BASE_URL = 'http://metadata.google.internal/computeMetadata/v1'
    var TYPE = 'type'

    var getMetadata = gcpMetadata._buildMetadataAccessor(TYPE)

    retryRequestOverride = function (reqOpts, callback) {
      assert.deepEqual(reqOpts, {
        uri: BASE_URL + '/' + TYPE,
        headers: {
          'Metadata-Flavor': 'Google'
        }
      })
      callback(null, VALID_RESPONSE)
    }

    getMetadata(done)
  })

  it('should access a specific metadata property', function (done) {
    var BASE_URL = 'http://metadata.google.internal/computeMetadata/v1'
    var TYPE = 'type'
    var PROPERTY = 'property'

    var getMetadata = gcpMetadata._buildMetadataAccessor(TYPE)

    retryRequestOverride = function (reqOpts, callback) {
      assert.deepEqual(reqOpts, {
        uri: BASE_URL + '/' + TYPE + '/' + PROPERTY,
        headers: {
          'Metadata-Flavor': 'Google'
        }
      })
      callback(null, VALID_RESPONSE)
    }

    getMetadata(PROPERTY, done)
  })

  it('should accept an object with property and query fields', function (done) {
    var BASE_URL = 'http://metadata.google.internal/computeMetadata/v1'
    var TYPE = 'type'
    var PROPERTY = 'property'
    var QUERY = {
      key: 'value'
    }

    var getMetadata = gcpMetadata._buildMetadataAccessor(TYPE)

    retryRequestOverride = function (reqOpts, callback) {
      assert.deepEqual(reqOpts, {
        uri: BASE_URL + '/' + TYPE + '/' + PROPERTY,
        headers: {
          'Metadata-Flavor': 'Google'
        },
        qs: QUERY
      })
      callback(null, VALID_RESPONSE)
    }

    getMetadata({
      property: PROPERTY,
      qs: QUERY
    }, done)
  })

  it('should extend the request options', function (done) {
    var BASE_URL = 'http://metadata.google.internal/computeMetadata/v1'
    var TYPE = 'type'
    var PROPERTY = 'property'

    var getMetadata = gcpMetadata._buildMetadataAccessor(TYPE)

    retryRequestOverride = function (reqOpts, callback) {
      assert.deepEqual(reqOpts, {
        uri: BASE_URL + '/' + TYPE + '/' + PROPERTY,
        headers: {
          'Metadata-Flavor': 'Google',
          'Custom-Header': 'Custom'
        }
      })
      callback(null, VALID_RESPONSE)
    }

    var options = {
      property: PROPERTY,
      headers: {
        'Custom-Header': 'Custom'
      }
    }

    var originalOptions = extend(true, {}, options)

    getMetadata(options, function (err) {
      assert.ifError(err)
      assert.deepEqual(options, originalOptions) // wasn't modified
      done()
    })
  })

  it('should return the request error', function (done) {
    var ERROR = 'fake error'
    var TYPE = 'type'

    var getMetadata = gcpMetadata._buildMetadataAccessor(TYPE)

    retryRequestOverride = function (reqOpts, callback) {
      callback(ERROR)
    }

    getMetadata(function (err) {
      assert.strictEqual(err, ERROR)
      done()
    })
  })

  it('should return error when res is empty', function (done) {
    var TYPE = 'type'
    var getMetadata = gcpMetadata._buildMetadataAccessor(TYPE)

    retryRequestOverride = function (reqOpts, callback) {
      callback(null, null)
    }

    getMetadata(function (err) {
      assert(err instanceof Error)
      done()
    })
  })

  it('should return error when flavor header is incorrect', function (done) {
    var TYPE = 'type'
    var getMetadata = gcpMetadata._buildMetadataAccessor(TYPE)

    retryRequestOverride = function (reqOpts, callback) {
      callback(null, {
        headers: {
          'Metadata-Flavor': 'Hazelnut'
        }
      })
    }

    getMetadata(function (err) {
      assert(err instanceof Error)
      done()
    })
  })

  it('should return error if statusCode is not 200', function (done) {
    var TYPE = 'type'
    var getMetadata = gcpMetadata._buildMetadataAccessor(TYPE)

    retryRequestOverride = function (reqOpts, callback) {
      callback(null, {
        headers: {
          'Metadata-Flavor': 'Google'
        },
        statusCode: 418
      })
    }

    getMetadata(function (err) {
      assert(err instanceof Error)
      done()
    })
  })
})
