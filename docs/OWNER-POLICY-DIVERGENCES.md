# Owner-approved historical test divergences

The authentic 947-test archive remains unchanged. This manifest records historical expectations that intentionally differ from the current owner-approved Agent v3 policy.

## PriceLabs owner command

- Preserve the owner's exact private PriceLabs price-update command and its existing response flow.

## Fresh booking links

- Preferred-unit changes invalidate prior booking verification.
- Every link request, including a resend or return to earlier dates, performs a fresh availability check.
- Persisted links are ignored rather than reused, whether valid, stale, malformed, mismatched, or malicious.
- Partial availability such as Unit 707 `true` and Unit 1006 `unknown` produces no booking link.

## Human repeat behavior

- A maintenance report in a later guest message remains actionable and may alert again.
- Identical internal calls within one guest message are suppressed, including across reasoning rounds.

## Validation contract

`npm run test:agent:policy` runs all offline tests, permits only the exact 16 named historical divergences, and fails for:

- any unexpected failure;
- any missing expected divergence, which signals that this manifest must be reviewed; or
- any newly renamed or silently changed historical expectation.

This is a classification layer, not a rewrite of the authentic archive.
