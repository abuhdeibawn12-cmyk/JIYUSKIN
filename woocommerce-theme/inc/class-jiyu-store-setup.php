<?php
/**
 * Safe baseline WooCommerce configuration for JIYU.
 *
 * @package JIYU_Original
 */

defined( 'ABSPATH' ) || exit;

final class JIYU_Store_Setup {
	const SETUP_VERSION = '0.1.2';

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
		update_option( 'woocommerce_calc_taxes', 'no' );
		update_option( 'woocommerce_enable_guest_checkout', 'yes' );
		update_option( 'woocommerce_enable_signup_and_login_from_checkout', 'yes' );
		update_option( 'woocommerce_enable_myaccount_registration', 'yes' );
		update_option( 'woocommerce_registration_generate_username', 'yes' );
		update_option( 'woocommerce_registration_generate_password', 'yes' );

		self::ensure_free_us_shipping();
		self::ensure_coupon();
		update_option( 'jiyu_store_setup_version', self::SETUP_VERSION );
	}

	/** Keep country lists US-only even if another plugin alters options. */
	public static function us_only( $countries ) {
		return isset( $countries['US'] ) ? array( 'US' => $countries['US'] ) : array( 'US' => 'United States (US)' );
	}

	/**
	 * Ensure every US order receives the single free 3–7 business-day method.
	 *
	 * Existing non-free methods are disabled rather than deleted so a merchant can
	 * recover their previous configuration if the shipping policy changes later.
	 */
	private static function ensure_free_us_shipping() {
		if ( ! class_exists( 'WC_Shipping_Zones' ) || ! class_exists( 'WC_Shipping_Zone' ) ) {
			return;
		}

		$us_zone = null;
		foreach ( WC_Shipping_Zones::get_zones() as $zone_data ) {
			$zone = new WC_Shipping_Zone( $zone_data['zone_id'] );
			foreach ( $zone->get_zone_locations() as $location ) {
				if ( 'country' === $location->type && 'US' === $location->code ) {
					$us_zone = $zone;
					break 2;
				}
			}
		}

		if ( ! $us_zone ) {
			$us_zone = new WC_Shipping_Zone();
			$us_zone->set_zone_name( 'United States' );
			$us_zone->set_locations(
				array(
					array(
						'code' => 'US',
						'type' => 'country',
					),
				)
			);
			$us_zone->save();
		}

		$free_instance_id = 0;
		foreach ( $us_zone->get_shipping_methods( true ) as $instance_id => $method ) {
			if ( 'free_shipping' === $method->id ) {
				$free_instance_id = (int) $instance_id;
				continue;
			}

			$settings            = get_option( 'woocommerce_' . $method->id . '_' . $instance_id . '_settings', array() );
			$settings['enabled'] = 'no';
			update_option( 'woocommerce_' . $method->id . '_' . $instance_id . '_settings', $settings );
		}

		if ( ! $free_instance_id ) {
			$free_instance_id = (int) $us_zone->add_shipping_method( 'free_shipping' );
		}

		if ( $free_instance_id ) {
			update_option(
				'woocommerce_free_shipping_' . $free_instance_id . '_settings',
				array(
					'enabled'          => 'yes',
					'title'            => 'Free shipping (3–7 business days)',
					'requires'         => '',
					'min_amount'       => '0',
					'ignore_discounts' => 'no',
				)
			);
		}

		if ( class_exists( 'WC_Cache_Helper' ) ) {
			WC_Cache_Helper::get_transient_version( 'shipping', true );
		}
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

