import axios, {AxiosError, AxiosRequestConfig, AxiosResponse} from 'axios';
import * as extend from 'extend';
import * as rax from 'retry-axios';

export const HOST_ADDRESS = 'http://metadata.google.internal.';
export const BASE_PATH = '/computeMetadata/v1beta1';
export const BASE_URL = HOST_ADDRESS + BASE_PATH;

export type Options = AxiosRequestConfig&
    {[index: string]: {} | string | undefined, property?: string, uri?: string};

export type Callback =
    (error: NodeJS.ErrnoException|null, response?: AxiosResponse<string>,
     metadataProp?: string) => void;

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
      return new Error(e);
    }
  }
  return null;
}

export function _buildMetadataAccessor(type: string) {
  return function metadataAccessor(
      options: string|Options|Callback, callback?: Callback) {
    if (!options) {
      options = {};
    }

    if (typeof options === 'function') {
      callback = options;
      options = {};
    }

    if (typeof options === 'string') {
      options = {property: options};
    }

    let property = '';
    if (typeof options === 'object' && options.property) {
      property = '/' + options.property;
    }

    const err = validate(options);
    if (err) {
      setImmediate(callback!, err);
      return;
    }

    const ax = axios.create();
    rax.attach(ax);
    const baseOpts = {
      url: `${BASE_URL}/${type}${property}`,
      headers: {'Metadata-Flavor': 'Google'},
      raxConfig: {noResponseRetries: 0}
    };
    const reqOpts = extend(true, baseOpts, options);
    delete (reqOpts as {property: string}).property;
    ax.request(reqOpts)
        .then(res => {
          // NOTE: node.js converts all incoming headers to lower case.
          if (res.headers['metadata-flavor'] !== 'Google') {
            callback!(new Error(
                `Invalid response from metadata service: incorrect Metadata-Flavor header.`));
          } else if (!res.data) {
            callback!(new Error('Invalid response from the metadata service'));
          } else {
            callback!(null, res, res.data);
          }
        })
        .catch((err: AxiosError) => {
          if (err.response && err.response.status !== 200) {
            callback!(new Error('Unsuccessful response status code'));
          } else {
            callback!(err);
          }
        });
  };
}

export const instance = _buildMetadataAccessor('instance');
export const project = _buildMetadataAccessor('project');
