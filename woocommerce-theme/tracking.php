<?php
/**
 * Customer-facing order tracking.
 *
 * @package JIYU_Original
 */

defined( 'ABSPATH' ) || exit;

status_header( 200 );

get_header();
?>
<main class="jtrack">
	<section class="jtrack__hero">
		<p class="jtrack__eyebrow"><?php esc_html_e( 'Order support', 'jiyu-original' ); ?></p>
		<h1><?php esc_html_e( 'Track Your Order', 'jiyu-original' ); ?></h1>
		<p><?php esc_html_e( 'Use your order details or shipment tracking number for the latest delivery update.', 'jiyu-original' ); ?></p>
	</section>

	<section class="jtrack__panel" aria-labelledby="jtrack-order-heading">
		<div class="jtrack__heading">
			<span>01</span>
			<div>
				<h2 id="jtrack-order-heading"><?php esc_html_e( 'Order number + email', 'jiyu-original' ); ?></h2>
				<p><?php esc_html_e( 'Best for checking your JIYU order securely.', 'jiyu-original' ); ?></p>
			</div>
		</div>
		<div class="jtrack__woo-form">
			<?php echo do_shortcode( '[woocommerce_order_tracking]' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
		</div>
	</section>

	<section class="jtrack__panel" aria-labelledby="jtrack-parcel-heading">
		<div class="jtrack__heading">
			<span>02</span>
			<div>
				<h2 id="jtrack-parcel-heading"><?php esc_html_e( 'Tracking number', 'jiyu-original' ); ?></h2>
				<p><?php esc_html_e( 'Enter the number from your dispatch confirmation.', 'jiyu-original' ); ?></p>
			</div>
		</div>
		<form class="jtrack__parcel-form" action="<?php echo esc_url( home_url( '/parcel-panel/' ) ); ?>" method="get">
			<label for="jtrack-number"><?php esc_html_e( 'Tracking number', 'jiyu-original' ); ?></label>
			<div class="jtrack__field-row">
				<input id="jtrack-number" type="text" name="nums" autocomplete="off" placeholder="e.g. BEST123456789" required>
				<button type="submit"><?php esc_html_e( 'Track parcel', 'jiyu-original' ); ?> <span aria-hidden="true">→</span></button>
			</div>
		</form>
	</section>

	<section class="jtrack__assurances" aria-label="<?php esc_attr_e( 'Tracking benefits', 'jiyu-original' ); ?>">
		<div><strong><?php esc_html_e( 'Secure lookup', 'jiyu-original' ); ?></strong><span><?php esc_html_e( 'Your order details stay protected.', 'jiyu-original' ); ?></span></div>
		<div><strong><?php esc_html_e( 'Live updates', 'jiyu-original' ); ?></strong><span><?php esc_html_e( 'Follow your parcel from dispatch to delivery.', 'jiyu-original' ); ?></span></div>
		<div><strong><?php esc_html_e( 'Need help?', 'jiyu-original' ); ?></strong><span><?php esc_html_e( 'Our support team can help locate your order.', 'jiyu-original' ); ?></span></div>
	</section>
</main>
<?php
get_footer();

