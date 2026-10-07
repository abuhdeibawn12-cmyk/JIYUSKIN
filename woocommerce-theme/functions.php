<?php
/**
 * JIYU Original for WooCommerce.
 *
 * @package JIYU_Original
 */

defined( 'ABSPATH' ) || exit;

require_once get_template_directory() . '/inc/class-jiyu-storefront.php';
require_once get_template_directory() . '/inc/class-jiyu-cart-api.php';
require_once get_template_directory() . '/inc/class-jiyu-store-setup.php';

JIYU_Storefront::boot();
JIYU_Cart_API::boot();
JIYU_Store_Setup::boot();

