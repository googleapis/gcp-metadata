# Changelog

[npm history][1]

[1]: https://www.npmjs.com/package/PACKAGE NAME?activeTab=versions

## v0.7.0

This is a re-release of v0.6.5 (which was unpublished) as a semver major
(v0.7.0). The potentially breaking change is how we deal with unexpected errors
in the `isAvailable` function. Previously unexpected errors would be swallowed,
but now they get thrown.

### Notable Changes

* 2d34f9d fix: do not swallow unexpected errors (#57)

### Other commits

Since 0.6.3:

* 5e74a0e refactor: use mocha instead of ava (#63)
* 475081e build: fix typo in publish step (#59)
* 89ebf0f chore(deps): update dependency nyc to v12 (#53)
* 3cb8173 chore(deps): update dependency gts to ^0.7.0 (#55)
* f18fab2 docs: document isAvailable method (#52)
* 1da2e85 chore: update to the latest version of all dependencies (#51)
* 4305f3f docs: add a few things to the readme (#50)
* e1d448d chore(build): test node10, separate lint job (#49)
* 360474f Update renovate.json

