# Local security patch for test tooling

The code and types originate from `deepmerge` 4.3.1 (TehShrike/deepmerge), MIT licensed; see LICENSE. This is a local fork, not an upstream fixed release.

GHSA-gcqx-w48m-w2h4 / CVE-2026-93753 has no upstream patched version at the time of review (2026-11-06). In particular, copying a target object's own enumerable `__proto__` into a plain destination can change the returned object's prototype.

The only code change filters the string keys `__proto__`, `constructor` and `prototype` out of both target and source key enumeration, recursively. Enumerable symbols, arrays, cloning, custom merge functions and own normal properties retain upstream behavior. Configurations deliberately using these reserved keys are unsupported. The package override is limited to development tooling; application bundles do not import this module.

Run `node scripts/test-deepmerge-security.cjs` before the application tests. It exercises the published attack surface on both merge inputs, nested objects, null-prototype objects, symbols and ordinary Jest configuration merging. `npm ci` installs this checked-in fork reproducibly; do not replace it with an unpatched upstream tarball merely to update dependency numbers.

Advisory: https://github.com/advisories/GHSA-gcqx-w48m-w2h4
