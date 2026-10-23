# Nano (XNO) settlement rail — verifier only, not wired in

Proposal: [issue #12](https://github.com/TombStoneDash/noui-bot/issues/12). An agent pays a
provider per call with its own signed Nano send block. The proxy releases the tool result only
after confirming that block, instead of debiting a pre-funded balance.

## What exists

`src/lib/nano-settlement.ts` has no dependencies and is not imported by any route
(`tests/nano-settlement.test.mjs` asserts that).

- `verifyNanoSendBlock(hash, blockInfo, { payTo, amountRaw, payer? })` checks a Nano RPC
  `block_info` (`json_block: true`) response. It is valid only for a **confirmed state send** of
  **exactly** `amountRaw` to `payTo` (and from `payer`, when pinned). Every other result has a
  specific `reason`: `unconfirmed`, `not_send`, `wrong_recipient`, `wrong_amount`, …
- `fetchNanoBlockInfo(rpcUrl, hash, { fetch, timeoutMs })` is a small RPC client with a timeout.
  It returns `null` for an unknown block.
- `xnoToRaw` / `rawToXno` convert exact decimals with BigInt (1 XNO = 10^30 raw), never floats.
- `isValidNanoAccount` checks the address checksum (blake2b-40 of the public key), so a
  mistyped address is rejected. `verifyNanoSendBlock` refuses a `payTo` or `payer` that fails it.
  Provider registration should call it before saving an address. `isNanoAccount` checks format
  only. `nanoAccountFromPublicKey` / `nanoPublicKeyFromAccount` convert between the two forms.
  BLAKE2b is implemented in the file because Node's crypto only offers the 64-byte digest.

## What a verified block does *not* prove

- **Uniqueness.** One send block could pay for many calls. Before releasing a result, the proxy
  must claim the block hash atomically (for example, a `UNIQUE` column in a new table) and reject
  any second use.
- **Binding to this call.** A send block has no memo field. Binding a block to a specific call
  needs either a per-call amount nonce or a per-call receive address. That is a design choice.

## Decisions needed before wiring it in (Hudson)

1. **Adopt the rail at all?** It moves money outside Stripe, so it needs a compliance and tax
   review.
2. **Platform take.** Payment goes straight to the provider, so the 10% platform fee is not
   collected. Options: a second send to a platform address, invoice the provider, or no fee on
   this rail.
3. **Pricing.** Tools are priced in USD cents. Turning that into an `amountRaw` needs an exchange
   rate source and a quote window, or providers price in XNO directly.
4. **RPC node.** Run our own node or use a third-party one. A third-party node is trusted for
   `confirmed`.
5. **Refunds and disputes.** There is no chargeback path. A failed tool call after payment needs a
   refund policy.

Once these are decided, the integration point is the paid-tool branch in
`src/app/api/bazaar/proxy/route.ts`, plus a migration for the claimed-hash table.
