# Changelog

## [0.1.3] - Unreleased
### Fixed
- Corrected proxy, metering payload, and metering response types to match the wire formats
### Added
- Added `client.receipts` lookup and public verification APIs
### Release procedure
- After review and merge to main, the Publish Packages workflow validates the SDK and publishes a changed version to npm. An already published version is skipped.

## [0.1.2] - 2026-03-01
- version bump only

## [0.1.1] - 2026-03-01
### Fixed
- ESM/CJS dual export configuration
- Type declaration bundling

## [0.1.0] - 2026-02-26
### Added
- Initial release
- Consumer API: catalog.list(), tools.call(), usage.summary(), balance.check()
- Provider API: registerProvider(), tools.register(), billing.summary()
- Full TypeScript type definitions
- CJS + ESM + DTS bundles
- Sub-cent precision billing support
- Automatic API key authentication
