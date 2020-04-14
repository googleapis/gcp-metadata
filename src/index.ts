/**
 * Copyright 2018 Google LLC
 *
 * Distributed under MIT license.
 * See file LICENSE for detail or copy at https://opensource.org/licenses/MIT
 */

import {GaxiosOptions, GaxiosResponse, request} from 'gaxios';
import {OutgoingHttpHeaders} from 'http';
const jsonBigint = require('json-bigint'); // eslint-disable-line

export const HOST_ADDRESS = 'http://169.254.169.254';
export const BASE_PATH = '/computeMetadata/v1';
export const BASE_URL = HOST_ADDRESS + BASE_PATH;
export const SECONDARY_HOST_ADDRESS = 'http://metadata.google.internal.';
export const SECONDARY_BASE_URL = SECONDARY_HOST_ADDRESS + BASE_PATH;
export const HEADER_NAME = 'Metadata-Flavor';
export const HEADER_VALUE = 'Google';
export const HEADERS = Object.freeze({[HEADER_NAME]: HEADER_VALUE});

export interface Options {
  params?: {[index: string]: string};
  property?: string;
  headers?: OutgoingHttpHeaders;
}

// Accepts an options object passed from the user to the API. In previous
// versions of the API, it referred to a `Request` or an `Axios` request
// options object.  Now it refers to an object with very limited property
// names. This is here to help ensure users don't pass invalid options when
// they  upgrade from 0.4 to 0.5 to 0.8.
function validate(options: Options) {
  Object.keys(options).forEach(key => {
    switch (key) {
      case 'params':
      case 'property':
      case 'headers':
        break;
      case 'qs':
        throw new Error(
          "'qs' is not a valid configuration option. Please use 'params' instead."
        );
      default:
        throw new Error(`'${key}' is not a valid configuration option.`);
    }
  });
}

async function metadataAccessor<T>(
  type: string,
  options?: string | Options,
  noResponseRetries = 3,
  fastFail = false
): Promise<T> {
  options = options || {};
  if (typeof options === 'string') {
    options = {property: options};
  }
  let property = '';
  if (typeof options === 'object' && options.property) {
    property = '/' + options.property;
  }
  validate(options);
  try {
    const requestMethod = fastFail ? fastFailMetadataRequest : request;
    const res = await requestMethod<T>({
      url: `${BASE_URL}/${type}${property}`,
      headers: Object.assign({}, HEADERS, options.headers),
      retryConfig: {noResponseRetries},
      params: options.params,
      responseType: 'text',
      timeout: requestTimeout(),
    });
    // NOTE: node.js converts all incoming headers to lower case.
    if (res.headers[HEADER_NAME.toLowerCase()] !== HEADER_VALUE) {
      throw new Error(
        `Invalid response from metadata service: incorrect ${HEADER_NAME} header.`
      );
    } else if (!res.data) {
      throw new Error('Invalid response from the metadata service');
    }
    if (typeof res.data === 'string') {
      try {
        return jsonBigint.parse(res.data);
      } catch {
        /* ignore */
      }
    }
    return res.data;
  } catch (e) {
    if (e.response && e.response.status !== 200) {
      e.message = `Unsuccessful response status code. ${e.message}`;
    }
    throw e;
  }
}

async function fastFailMetadataRequest<T>(
  options: GaxiosOptions
): Promise<GaxiosResponse> {
  const secondaryOptions = {
    ...options,
    url: options.url!.replace(BASE_URL, SECONDARY_BASE_URL),
  };
  // We race a connection between DNS/IP to metadata server. There are a couple
  // reasons for this:
  //
  // 1. the DNS is slow in some GCP environments; by checking both, we might
  //    detect the runtime environment signficantly faster.
  // 2. we can't just check the IP, which is tarpitted and slow to respond
  //    on a user's local machine.
  //
  // Additional logic has been added to make sure that we don't create an
  // unhandled rejection in scenarios where a failure happens sometime
  // after a success.
  //
  // Note, however, if a failure happens prior to a success, a rejection should
  // occur, this is for folks running locally.
  //
  let responded = false;
  const r1: Promise<GaxiosResponse> = request<T>(options)
    .then(res => {
      responded = true;
      return res;
    })
    .catch(err => {
      if (responded) {
        return r2;
      } else {
        responded = true;
        throw err;
      }
    });
  const r2: Promise<GaxiosResponse> = request<T>(secondaryOptions)
    .then(res => {
      responded = true;
      return res;
    })
    .catch(err => {
      if (responded) {
        return r1;
      } else {
        responded = true;
        throw err;
      }
    });
  return Promise.race([r1, r2]);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function instance<T = any>(options?: string | Options) {
  return metadataAccessor<T>('instance', options);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function project<T = any>(options?: string | Options) {
  return metadataAccessor<T>('project', options);
}

/*
 * How many times should we retry detecting GCP environment.
 */
function detectGCPAvailableRetries(): number {
  return process.env.DETECT_GCP_RETRIES
    ? Number(process.env.DETECT_GCP_RETRIES)
    : 0;
}

/**
 * Determine if the metadata server is currently available.
 */
let cachedIsAvailableResponse: Promise<boolean> | undefined;
export async function isAvailable() {
  try {
    // If a user is instantiating several GCP libraries at the same time,
    // this may result in multiple calls to isAvailable(), to detect the
    // runtime environment. We use the same promise for each of these calls
    // to reduce the network load.
    if (cachedIsAvailableResponse === undefined) {
      cachedIsAvailableResponse = metadataAccessor(
        'instance',
        undefined,
        detectGCPAvailableRetries(),
        true
      );
    }
    await cachedIsAvailableResponse;
    return true;
  } catch (err) {
    if (process.env.DEBUG_AUTH) {
      console.info(err);
    }

    if (err.type === 'request-timeout') {
      // If running in a GCP environment, metadata endpoint should return
      // within ms.
      return false;
    } else if (
      err.code &&
      [
        'EHOSTDOWN',
        'EHOSTUNREACH',
        'ENETUNREACH',
        'ENOENT',
        'ENOTFOUND',
        'ECONNREFUSED',
      ].includes(err.code)
    ) {
      // Failure to resolve the metadata service means that it is not available.
      return false;
    } else if (err.response && err.response.status === 404) {
      return false;
    }
    // Throw unexpected errors.
    throw err;
  }
}

/**
 * reset the memoized isAvailable() lookup.
 */
export function resetIsAvailableCache() {
  cachedIsAvailableResponse = undefined;
}

export function requestTimeout(): number {
  // In testing, we were able to reproduce behavior similar to
  // https://github.com/googleapis/google-auth-library-nodejs/issues/798
  // by making many concurrent network requests. Requests do not actually fail,
  // rather they take significantly longer to complete (and we hit our
  // default 3000ms timeout).
  //
  // This logic detects a GCF environment, using the documented environment
  // variables K_SERVICE and FUNCTION_NAME:
  // https://cloud.google.com/functions/docs/env-var and, in a GCF environment
  // eliminates timeouts (by setting the value to 0 to disable).
  return process.env.K_SERVICE || process.env.FUNCTION_NAME ? 0 : 3000;
}
