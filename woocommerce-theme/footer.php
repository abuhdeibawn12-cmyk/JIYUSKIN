<?php
/**
 * Footer for WooCommerce-owned pages.
 *
 * @package JIYU_Original
 */

defined( 'ABSPATH' ) || exit;
?>
<footer class="jwc-footer">
	<p>&copy; <?php echo esc_html( gmdate( 'Y' ) ); ?> JIYU. <?php esc_html_e( 'All rights reserved.', 'jiyu-original' ); ?></p>
	<nav aria-label="<?php esc_attr_e( 'Legal', 'jiyu-original' ); ?>">
		<a href="<?php echo esc_url( home_url( '/pages/privacy-policy/' ) ); ?>"><?php esc_html_e( 'Privacy', 'jiyu-original' ); ?></a>
		<a href="<?php echo esc_url( home_url( '/pages/refund-return-policy-1/' ) ); ?>"><?php esc_html_e( 'Returns', 'jiyu-original' ); ?></a>
		<a href="<?php echo esc_url( home_url( '/pages/terms-of-service/' ) ); ?>"><?php esc_html_e( 'Terms', 'jiyu-original' ); ?></a>
	</nav>
</footer>
<?php wp_footer(); ?>
</body>
</html>

