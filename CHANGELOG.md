# Changelog

[npm history][1]

[1]: https://www.npmjs.com/package/gcp-metadata?activeTab=versions

## v0.9.0

10-26-2018 13:10 PDT

- feat: allow custom headers ([#109](https://github.com/googleapis/gcp-metadata/pull/109))
- chore: update issue templates ([#108](https://github.com/googleapis/gcp-metadata/pull/108))
- chore: remove old issue template ([#106](https://github.com/googleapis/gcp-metadata/pull/106))
- build: run tests on node11 ([#105](https://github.com/googleapis/gcp-metadata/pull/105))
- chores(build): do not collect sponge.xml from windows builds ([#104](https://github.com/googleapis/gcp-metadata/pull/104))
- chores(build): run codecov on continuous builds ([#102](https://github.com/googleapis/gcp-metadata/pull/102))
- chore(deps): update dependency nock to v10 ([#103](https://github.com/googleapis/gcp-metadata/pull/103))
- chore: update new issue template ([#101](https://github.com/googleapis/gcp-metadata/pull/101))
- build: fix codecov uploading on Kokoro ([#97](https://github.com/googleapis/gcp-metadata/pull/97))
- Update kokoro config ([#95](https://github.com/googleapis/gcp-metadata/pull/95))
- Update CI config ([#93](https://github.com/googleapis/gcp-metadata/pull/93))
- Update kokoro config ([#91](https://github.com/googleapis/gcp-metadata/pull/91))
- Re-generate library using /synth.py ([#90](https://github.com/googleapis/gcp-metadata/pull/90))
- test: remove appveyor config ([#89](https://github.com/googleapis/gcp-metadata/pull/89))
- Update kokoro config ([#88](https://github.com/googleapis/gcp-metadata/pull/88))
- Enable prefer-const in the eslint config ([#87](https://github.com/googleapis/gcp-metadata/pull/87))
- Enable no-var in eslint ([#86](https://github.com/googleapis/gcp-metadata/pull/86))

### New Features

A new option, `headers`, has been added to allow metadata queries to be sent with custom headers.

## v0.8.0

**This release has breaking changes**.  Please take care when upgrading to the latest version.

#### Dropped support for Node.js 4.x and 9.x
This library is no longer tested against versions 4.x and 9.x of Node.js.  Please upgrade to the latest supported LTS version!

#### Return type of `instance()` and `project()` has changed
The `instance()` and `project()` methods are much more selective about which properties they will accept.

The only accepted properties are `params` and `properties`.  The `instance()` and `project()` methods also now directly return the data instead of a response object.

#### Changes in how large number valued properties are handled

Previously large number-valued properties were being silently losing precision when
returned by this library (as a number). In the cases where a number valued property
returned by the metadata service is too large to represent as a JavaScript number, we
will now return the value as a BigNumber (from the bignumber.js) library. Numbers that
do fit into the JavaScript number range will continue to be returned as numbers.
For more details see [#74](https://github.com/googleapis/gcp-metadata/pull/74).

### Breaking Changes
- chore: drop support for node.js 4 and 9 ([#68](https://github.com/googleapis/gcp-metadata/pull/68))
- fix: quarantine axios config ([#62](https://github.com/googleapis/gcp-metadata/pull/62))

### Implementation Changes
- fix: properly handle large numbers in responses ([#74](https://github.com/googleapis/gcp-metadata/pull/74))

### Dependencies
- chore(deps): update dependency pify to v4 ([#73](https://github.com/googleapis/gcp-metadata/pull/73))

### Internal / Testing Changes
- Move to the new github org ([#84](https://github.com/googleapis/gcp-metadata/pull/84))
- Update CI config ([#83](https://github.com/googleapis/gcp-metadata/pull/83))
- Retry npm install in CI ([#81](https://github.com/googleapis/gcp-metadata/pull/81))
- Update CI config ([#79](https://github.com/googleapis/gcp-metadata/pull/79))
- chore(deps): update dependency nyc to v13 ([#77](https://github.com/googleapis/gcp-metadata/pull/77))
- add key for system tests
- increase kitchen test timeout
- add a lint npm script
- update npm scripts
- add a synth file and run it ([#75](https://github.com/googleapis/gcp-metadata/pull/75))
- chore(deps): update dependency assert-rejects to v1 ([#72](https://github.com/googleapis/gcp-metadata/pull/72))
- chore: ignore package-log.json ([#71](https://github.com/googleapis/gcp-metadata/pull/71))
- chore: update renovate config ([#70](https://github.com/googleapis/gcp-metadata/pull/70))
- test: throw on deprecation
- chore(deps): update dependency typescript to v3 ([#67](https://github.com/googleapis/gcp-metadata/pull/67))
- chore: make it OSPO compliant ([#66](https://github.com/googleapis/gcp-metadata/pull/66))
- chore(deps): update dependency gts to ^0.8.0 ([#65](https://github.com/googleapis/gcp-metadata/pull/65))

