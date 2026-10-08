# JIYU WooCommerce port

This branch contains the original JIYU storefront adapted to WooCommerce. It does not use Catakor theme files or branding.

## Build outputs

- Theme source: `woocommerce-theme/`
- Installable theme ZIP: `dist/jiyu-original-woocommerce-0.1.0.zip`
- WooCommerce product import: `jiyu-products-woocommerce.csv`
- Build command: `powershell -ExecutionPolicy Bypass -File tools/build-woocommerce-theme.ps1`

## Implemented

- Original JIYU homepage, shop, product, editorial, policy, and content routes
- Original desktop and mobile styling, product selectors, and cart drawer
- WooCommerce-backed cart add, change, remove, quantity, totals, and checkout links
- Three products with nine pack variations and the original one-time prices
- USD currency and United States-only selling/shipping country baseline
- Free US shipping on every order with a 3–7 business-day delivery estimate
- Guest checkout and customer account creation
- `JIYU` 10% coupon matching the storefront announcement
- Order lookup by order number and billing email
- Shipment lookup by tracking number through the ParcelPanel public page
- WordPress favicon, account, checkout, and tracking links

## Intentionally not guessed

The following require store credentials, a licensed plugin, or a business decision and are not silently simulated by the theme:

- Live payment gateway credentials and checkout transaction testing
- Subscription renewals and subscription product configuration
- Loyalty points, tiers, and reward redemption
- Tax registration and tax rules
- Customer/order history migration from Shopify

The storefront hides subscription controls until a real subscription integration enables the `jiyu_subscriptions_enabled` filter. This prevents customers from selecting a purchase option that cannot renew correctly.

## Staging installation order

1. Install WordPress and WooCommerce on the JIYU host.
2. Upload and activate the generated theme ZIP.
3. Import `jiyu-products-woocommerce.csv` from **Products → Import**.
4. Confirm the imported variable products and all nine variations.
5. Configure the US shipping method, taxes, and payment gateway in WooCommerce.
6. Install and configure the chosen subscriptions, loyalty, and tracking plugins.
7. Test every pack option, cart edit/removal, coupon, account, checkout, order email, and tracking lookup on desktop and mobile.
8. Connect the production domain only after staging acceptance.

