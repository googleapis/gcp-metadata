'use strict'

var assert = require('assert')
var extend = require('extend')
var proxyquire = require('proxyquire')

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
      callback() // done()
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
      callback() // done()
    }

    getMetadata(PROPERTY, done)
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
      callback() // done()
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
})
