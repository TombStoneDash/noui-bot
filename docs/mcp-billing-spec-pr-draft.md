# Draft PR: Align MCP billing spec with current main and #14

Build-out register: NOUI-PUBLISH-GUARD-4-AND-BILLING-SPEC, part 2.

Base: main at bfc0fab (merged #14). Branch: codex/bo-noui-mcp-billing-spec.
Supersedes the billing-spec content from draft #1. Keep this PR in draft; do not merge.

The older spec draft retained pre-#14 amounts and mixed documentation with runtime
validation changes. This change carries its billing envelope, meter request, and
receipt schemas and fictional fixtures onto current main as documentation only,
with targeted contract tests. No application, dependency, lockfile, or database
changes are included.

Amounts follow cents × 10,000 = microcents and microcents / 1,000,000 = USD.
The 1-cent example displays $0.0100 and signs 10,000 microcents using the real
HMAC-SHA256 signer with an explicitly public test-only key. Historical receipts
are not rescaled or re-signed. The draft documents the seven signed fields,
unsigned metadata, public POST envelope verification, the separate legacy lookup,
and known runtime/SDK discrepancies without claiming full implementation conformance.

Validation performed:

- `npm test`: 71 passed, 1 failed because the fresh worktree lacks React; the
  health/build integration test could not load. This is incomplete verification.
- All 16 new documentation contract tests passed, including dollar conversions,
  fixture/example agreement, signing, and tampering of all seven signed fields.
- `git diff --check`: passed.
- Dependency recovery: offline `npm ci` failed on an uncached ws tarball; online
  `npm ci` failed with registry DNS `ENOTFOUND`. No manifests or lockfiles changed.

Before this draft can pass verification, install the locked dependencies and run
`npm test` successfully, including the existing health/build integration test.
GitHub access was unavailable in this worktree, so this file supplies the review
body for the runner; no remote PR was created or updated here. Changes remain
uncommitted and unpushed for the runner.
