<?php
/**
 * Original JIYU React storefront shell.
 *
 * @package JIYU_Original
 */

defined( 'ABSPATH' ) || exit;
?><!doctype html>
<html <?php language_attributes(); ?>>
<head>
	<meta charset="<?php bloginfo( 'charset' ); ?>">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<link rel="icon" href="<?php echo esc_url( JIYU_Storefront::asset_url( '5f469f939df6e349.png' ) ); ?>" type="image/png">
	<?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>
<div id="root"></div>
<noscript>
	<main class="jiyu-noscript">
		<h1><?php bloginfo( 'name' ); ?></h1>
		<p><?php esc_html_e( 'Please enable JavaScript to browse this storefront.', 'jiyu-original' ); ?></p>
		<a href="<?php echo esc_url( home_url( '/collections/all/' ) ); ?>"><?php esc_html_e( 'Browse products', 'jiyu-original' ); ?></a>
	</main>
</noscript>
<?php wp_footer(); ?>
</body>
</html>

