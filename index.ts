import * as extend from 'extend';
import * as _request from 'request';  // for types only
import * as request from 'retry-request';

const BASE_URL = 'http://metadata.google.internal/computeMetadata/v1';

export type Options = _request.CoreOptions&{property?: string, uri?: string};

export type Callback =
    (error: Error|null, response?: _request.RequestResponse,
     metadataProp?: string) => void;

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

    const reqOpts = extend(
                        true, {
                          uri: BASE_URL + '/' + type + property,
                          headers: {'Metadata-Flavor': 'Google'}
                        },
                        options) as _request.Options &
        {property?: string};
    delete reqOpts.property;

    const retryRequestOpts = {noResponseRetries: 0};

    return request(reqOpts, retryRequestOpts, (err, res, body) => {
      if (callback) {  // for type safety; this should already always be true
        if (err) {
          callback(err);
        } else if (!res) {
          callback(new Error('Invalid response from metadata service'));
        } else if (res.statusCode !== 200) {
          callback(new Error('Unsuccessful response status code'), res);
        } else {
          callback(null, res, body);
        }
      }
    });
  };
}

export const instance = _buildMetadataAccessor('instance');
export const project = _buildMetadataAccessor('project');
