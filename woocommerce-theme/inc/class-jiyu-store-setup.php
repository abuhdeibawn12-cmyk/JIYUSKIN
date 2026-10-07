<?php
/**
 * Safe baseline WooCommerce configuration for JIYU.
 *
 * @package JIYU_Original
 */

defined( 'ABSPATH' ) || exit;

final class JIYU_Store_Setup {
	const SETUP_VERSION = '0.1.0';

	/** Register hooks. */
	public static function boot() {
		add_action( 'after_switch_theme', array( __CLASS__, 'configure' ), 20 );
		add_action( 'admin_init', array( __CLASS__, 'maybe_configure' ) );
		add_filter( 'woocommerce_countries_allowed_countries', array( __CLASS__, 'us_only' ) );
		add_filter( 'woocommerce_countries_shipping_countries', array( __CLASS__, 'us_only' ) );
	}

	/** Run setup after WooCommerce is available. */
	public static function maybe_configure() {
		if ( self::SETUP_VERSION !== get_option( 'jiyu_store_setup_version' ) ) {
			self::configure();
		}
	}

	/** Apply only settings established by the original JIYU storefront. */
	public static function configure() {
		if ( ! class_exists( 'WooCommerce' ) ) {
			return;
		}

		update_option( 'woocommerce_currency', 'USD' );
		update_option( 'woocommerce_allowed_countries', 'specific' );
		update_option( 'woocommerce_specific_allowed_countries', array( 'US' ) );
		update_option( 'woocommerce_ship_to_countries', 'specific' );
		update_option( 'woocommerce_specific_ship_to_countries', array( 'US' ) );
		update_option( 'woocommerce_enable_guest_checkout', 'yes' );
		update_option( 'woocommerce_enable_signup_and_login_from_checkout', 'yes' );
		update_option( 'woocommerce_enable_myaccount_registration', 'yes' );
		update_option( 'woocommerce_registration_generate_username', 'yes' );
		update_option( 'woocommerce_registration_generate_password', 'yes' );

		self::ensure_coupon();
		update_option( 'jiyu_store_setup_version', self::SETUP_VERSION );
	}

	/** Keep country lists US-only even if another plugin alters options. */
	public static function us_only( $countries ) {
		return isset( $countries['US'] ) ? array( 'US' => $countries['US'] ) : array( 'US' => 'United States (US)' );
	}

	/** Create the 10% JIYU code shown in the original announcement bar. */
	private static function ensure_coupon() {
		if ( ! class_exists( 'WC_Coupon' ) || ! function_exists( 'wc_get_coupon_id_by_code' ) ) {
			return;
		}

		$coupon_id = wc_get_coupon_id_by_code( 'JIYU' );
		$coupon    = $coupon_id ? new WC_Coupon( $coupon_id ) : new WC_Coupon();

		if ( ! $coupon_id ) {
			$coupon->set_code( 'JIYU' );
		}

		$coupon->set_description( 'JIYU storefront: extra 10% off at checkout.' );
		$coupon->set_discount_type( 'percent' );
		$coupon->set_amount( 10 );
		$coupon->set_individual_use( false );
		$coupon->set_exclude_sale_items( false );
		$coupon->set_usage_limit_per_user( 1 );
		$coupon->save();
	}
}

