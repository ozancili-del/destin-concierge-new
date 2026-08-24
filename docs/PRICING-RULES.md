# Website pricing rules

This record prevents deliberate OwnerRez pricing logic from being mistaken for unexplained hard-coding.

## Availability-calendar nightly rate

The website calendar currently calculates:

```text
displayed nightly rate = round(PriceLabs nightly rate × 0.875 + $25)
```

This matches two active OwnerRez rules shown in the OwnerRez administration screens:

- **Destiny Blue discount:** 12.50% of rent, applied automatically, taxable, for all selected properties when the source is **My Website**.
- **Management fee:** $25 fixed amount **per night**, taxable, for all selected properties when the source is **My Website**.

Therefore, `0.875` represents the remaining 87.5% after the 12.5% rent discount, and `+25` represents the nightly management fee. This is not an arbitrary adjustment and must not be removed merely because the PriceLabs feed contains a raw nightly price.

The secure OwnerRez quote/checkout remains authoritative. Before changing this calculation, compare the website result with a current OwnerRez quote for the same property, dates and guest counts.

## Make-an-offer estimate

The offer page preserves its historical estimate model:

- Cleaning fee: $175
- Tax: 13%
- Administrative fee: 3%
- Extra-guest fee: $20 per guest per night above four adults plus children; infants excluded

These values must remain until the corresponding current OwnerRez taxes, surcharges and applicability rules are individually reconciled. The page must continue to label the result as an estimate; the accepted offer's secure OwnerRez checkout total and terms control.

## Future automation

Preferred order:

1. Read applicable charges and discounts through a supported OwnerRez API endpoint, if the account/API exposes them.
2. Otherwise maintain a single versioned server-side configuration that mirrors OwnerRez and verify it with a scheduled quote comparison.
3. Do not scrape signed-in OwnerRez administration HTML during guest requests.

Any automated sync must account for applicability conditions including property, booking source, taxability, per-night/per-stay basis, and active dates. A value-only sync is insufficient.
