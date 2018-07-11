# gcp-metadata
> Get the metadata from a Google Cloud Platform environment.

[![NPM Version][npm-image]][npm-url]
[![CircleCI][circleimg]][circle]
[![codecov][codecov-image]][codecov-url]

```sh
$ npm install --save gcp-metadata
```
```js
const gcpMetadata = require('gcp-metadata');
```

#### Check to see if the metadata server is available
```js
const isAvailable = await gcpMetadata.isAvailable();
```

#### Access all metadata
```js
const data = await gcpMetadata.instance();
console.log(data); // ... All metadata properties
```

#### Access specific properties
```js
const data = await gcpMetadata.instance('hostname');
console.log(data) // ...Instance hostname
```

#### Access specific properties with query parameters
```js
const data = await gcpMetadata.instance({
  property: 'tags',
  params: { alt: 'text' }
});
console.log(data) // ...Tags as newline-delimited list
```

[circle]: https://circleci.com/gh/stephenplusplus/gcp-metadata
[circleimg]: https://circleci.com/gh/stephenplusplus/gcp-metadata.svg?style=shield
[codecov-image]: https://codecov.io/gh/stephenplusplus/gcp-metadata/branch/master/graph/badge.svg
[codecov-url]: https://codecov.io/gh/stephenplusplus/gcp-metadata
[npm-image]: https://img.shields.io/npm/v/gcp-metadata.svg
[npm-url]: https://www.npmjs.com/package/gcp-metadata