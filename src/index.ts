import axios, {AxiosError, AxiosRequestConfig, AxiosResponse} from 'axios';
import * as extend from 'extend';

const BASE_URL = 'http://metadata.google.internal/computeMetadata/v1';

export type Options = AxiosRequestConfig&{property?: string, uri?: string};

export type Callback =
    (error: NodeJS.ErrnoException|null, response?: AxiosResponse<string>,
     metadataProp?: string) => void;

// Accepts an options object passed from the user to the API.  In the
// previous version of the API, it referred to a `Request` options object.
// Now it refers to an Axiox Request Config object.  This is here to help
// ensure users don't pass invalid options when they upgrade from 0.4 to 0.5.
// tslint:disable-next-line no-any
function validate(options: any) {
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


export function _buildMetadataAccessor(type: string) {
  return function metadataAccessor(
      options: string|Options|Callback, callback?: Callback) {
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

    try {
      validate(options);
    } catch (e) {
      return callback!(e);
    }

    const reqOpts = extend(
                        true, {
                          url: `${BASE_URL}/${type}${property}`,
                          headers: {'Metadata-Flavor': 'Google'}
                        },
                        options) as AxiosRequestConfig &
        {property?: string};
    delete reqOpts.property;

    axios(reqOpts)
        .then(res => {
          callback!(null, res, res.data);
        })
        .catch((err: AxiosError) => {
          let e: Error = err;
          if (err.response && !err.response.data) {
            e = new Error('Invalid response from metadata service');
          } else if (err.code !== '200') {
            e = new Error('Unsuccessful response status code');
          }
          return callback!(e);
        });
  };
}

export const instance = _buildMetadataAccessor('instance');
export const project = _buildMetadataAccessor('project');
