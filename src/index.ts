import axios, {AxiosError, AxiosRequestConfig, AxiosResponse} from 'axios';

const BASE_URL = 'http://metadata.google.internal/computeMetadata/v1';

export type Options = AxiosRequestConfig&{property?: string, uri?: string};

export type Callback =
    (error: NodeJS.ErrnoException|null, response?: AxiosResponse<string>,
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

    const reqOpts = Object.assign(
                        {
                          url: `${BASE_URL}/${type}${property}`,
                          headers: {'Metadata-Flavor': 'Google'}
                        },
                        options) as AxiosRequestConfig &
        {property?: string};
    delete reqOpts.property;

    axios(reqOpts)
        .then(res => {
          if (callback) callback(null, res, res.data);
        })
        .catch((err: AxiosError) => {
          if (callback) {
            if (err.response && !err.response.data) {
              callback(new Error('Invalid response from metadata service'));
            } else if (err.code !== '200') {
              callback(
                  new Error('Unsuccessful response status code'), err.response);
            } else {
              callback(err);
            }
          }
        });
  };
}

export const instance = _buildMetadataAccessor('instance');
export const project = _buildMetadataAccessor('project');
