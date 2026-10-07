<?php
/**
 * Header for WooCommerce-owned pages.
 *
 * @package JIYU_Original
 */

defined( 'ABSPATH' ) || exit;
?><!doctype html>
<html <?php language_attributes(); ?>>
<head>
	<meta charset="<?php bloginfo( 'charset' ); ?>">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>
<header class="jwc-header">
	<div class="jwc-header__inner">
		<a class="jwc-logo" href="<?php echo esc_url( home_url( '/' ) ); ?>" aria-label="<?php esc_attr_e( 'JIYU home', 'jiyu-original' ); ?>">
			<img src="<?php echo esc_url( JIYU_Storefront::asset_url( '5f469f939df6e349.png' ) ); ?>" alt="JIYU">
		</a>
		<a class="jwc-header__shop" href="<?php echo esc_url( home_url( '/collections/all/' ) ); ?>"><?php esc_html_e( 'Return to shop', 'jiyu-original' ); ?></a>
	</div>
</header>

