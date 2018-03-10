import axios, {AxiosError, AxiosRequestConfig, AxiosResponse} from 'axios';
import * as extend from 'extend';
import * as rax from 'retry-axios';

export const HOST_ADDRESS = 'http://metadata.google.internal';
export const BASE_PATH = '/computeMetadata/v1';
export const BASE_URL = HOST_ADDRESS + BASE_PATH;
export const HEADER_NAME = 'Metadata-Flavor';
export const HEADER_VALUE = 'Google';
export const HEADERS = Object.freeze({[HEADER_NAME]: HEADER_VALUE});

export type Options = AxiosRequestConfig&
    {[index: string]: {} | string | undefined, property?: string, uri?: string};

// Accepts an options object passed from the user to the API.  In the
// previous version of the API, it referred to a `Request` options object.
// Now it refers to an Axios Request Config object.  This is here to help
// ensure users don't pass invalid options when they upgrade from 0.4 to 0.5.
function validate(options: Options) {
  const vpairs = [
    {invalid: 'uri', expected: 'url'}, {invalid: 'json', expected: 'data'},
    {invalid: 'qs', expected: 'params'}
  ];
  for (const pair of vpairs) {
    if (options[pair.invalid]) {
      const e = `'${
          pair.invalid}' is not a valid configuration option. Please use '${
          pair.expected}' instead. This library is using Axios for requests. Please see https://github.com/axios/axios to learn more about the valid request options.`;
      throw new Error(e);
    }
  }
}

async function metadataAccessor(
    type: string, options?: string|Options, noResponseRetries = 3) {
  options = options || {};
  if (typeof options === 'string') {
    options = {property: options};
  }
  let property = '';
  if (typeof options === 'object' && options.property) {
    property = '/' + options.property;
  }
  validate(options);
  const ax = axios.create();
  rax.attach(ax);
  const baseOpts = {
    url: `${BASE_URL}/${type}${property}`,
    headers: Object.assign({}, HEADERS),
    raxConfig: {noResponseRetries, instance: ax}
  };
  const reqOpts = extend(true, baseOpts, options);
  delete (reqOpts as {property: string}).property;
  return ax.request(reqOpts)
      .then(res => {
        // NOTE: node.js converts all incoming headers to lower case.
        if (res.headers[HEADER_NAME.toLowerCase()] !== HEADER_VALUE) {
          throw new Error(`Invalid response from metadata service: incorrect ${
              HEADER_NAME} header.`);
        } else if (!res.data) {
          throw new Error('Invalid response from the metadata service');
        }
        return res;
      })
      .catch((err: AxiosError) => {
        if (err.response && err.response.status !== 200) {
          err.message = 'Unsuccessful response status code. ' + err.message;
        }
        throw err;
      });
}

export function instance(options?: string|Options) {
  return metadataAccessor('instance', options);
}

export function project(options?: string|Options) {
  return metadataAccessor('project', options);
}

/**
 * Determine if the metadata server is currently available.
 */
export async function isAvailable() {
  try {
    // Attempt to read instance metadata. As configured, this will
    // retry 3 times if there is a valid response, and fail fast
    // if there is an ETIMEDOUT or ENOTFOUND error.
    await metadataAccessor('instance', undefined, 0);
    return true;
  } catch (err) {
    return false;
  }
}
