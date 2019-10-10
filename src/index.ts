/**
 * Copyright 2018 Google LLC
 *
 * Distributed under MIT license.
 * See file LICENSE for detail or copy at https://opensource.org/licenses/MIT
 */

import {GaxiosOptions, GaxiosResponse, request} from 'gaxios';
import {OutgoingHttpHeaders} from 'http';
const jsonBigint = require('json-bigint');

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
          `'qs' is not a valid configuration option. Please use 'params' instead.`
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
      timeout: 3000,
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
  return Promise.race([request<T>(options), request<T>(secondaryOptions)]);
}

// tslint:disable-next-line no-any
export function instance<T = any>(options?: string | Options) {
  return metadataAccessor<T>('instance', options);
}

// tslint:disable-next-line no-any
export function project<T = any>(options?: string | Options) {
  return metadataAccessor<T>('project', options);
}

/**
 * Determine if the metadata server is currently available.
 */
export async function isAvailable() {
  try {
    // Attempt to read instance metadata. As configured, this will
    // retry 3 times if there is a valid response, and fail fast
    // if there is an ETIMEDOUT or ENOTFOUND error.
    await metadataAccessor('instance', undefined, 0, true);
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
      (err.code === 'ENOTFOUND' ||
        err.code === 'ENOENT' ||
        err.code === 'ENETUNREACH')
    ) {
      // Failure to resolve the metadata service means that it is not available.
      return false;
    }
    // Throw unexpected errors.
    throw err;
  }
}
