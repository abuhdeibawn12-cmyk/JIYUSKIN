# JIYU — Green & Pink Storefront

Educational recreation of the JIYU storefront, containing the green toner pads, pink moisturizing cream and their two-product bundle.

## Development

Use Node.js 20.19+ or 22.12+ and pnpm.

```sh
pnpm install --ignore-scripts
pnpm dev
pnpm build
pnpm test:sites
```

## Current implementation

React/Vite storefront with responsive home, product, collection, About, loyalty and FAQ pages; local imagery, fonts and video assets; galleries, smooth scrolling, video playback and a cart/checkout demonstration.

This branch is the existing website source. It is not yet a Shopify Liquid theme. Shopify-backed products, cart, checkout, customer accounts and configured rewards are the next migration step. Demo checkout does not charge payments or create Shopify orders.

The source design, imagery and marketing content are reproduced from JIYU for the assignment. Generated builds, installed dependencies and local working notes are excluded.

## Shopify theme branch

The `shopify-theme` branch contains the Shopify theme directory structure and compiled assets. It is generated from this branch using:

```sh
node scripts/build-shopify.mjs /path/to/theme-output
```

The theme uses Shopify cart operations and checkout. Configure the three products and pack variants in the store before enabling purchases. Subscriptions are hidden until selling plans exist. The store still needs product/page records, shipping, test payments, account/reward configuration and final ecommerce QA. The existing published prototype remains available separately.
