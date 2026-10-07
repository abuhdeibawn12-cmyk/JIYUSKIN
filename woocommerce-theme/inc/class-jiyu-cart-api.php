<?php
/**
 * Shopify-shaped cart endpoints backed by the WooCommerce session.
 *
 * @package JIYU_Original
 */

defined( 'ABSPATH' ) || exit;

final class JIYU_Cart_API {
	/** Register hooks. */
	public static function boot() {
		add_action( 'rest_api_init', array( __CLASS__, 'register_routes' ) );
	}

	/** Register cart routes consumed by the original storefront. */
	public static function register_routes() {
		foreach ( array( 'get', 'add', 'change', 'update' ) as $action ) {
			register_rest_route(
				'jiyu/v1',
				'/cart/' . $action,
				array(
					'methods'             => 'get' === $action ? WP_REST_Server::READABLE : WP_REST_Server::CREATABLE,
					'callback'            => array( __CLASS__, 'handle_' . $action ),
					'permission_callback' => array( __CLASS__, 'permission' ),
				)
			);
		}
	}

	/** Same-origin nonce protection for public cart mutations. */
	public static function permission( WP_REST_Request $request ) {
		$nonce = $request->get_header( 'X-WP-Nonce' );
		return $nonce && wp_verify_nonce( $nonce, 'wp_rest' );
	}

	/** Return the current cart. */
	public static function handle_get() {
		self::ensure_cart();
		return rest_ensure_response( self::cart_payload() );
	}

	/** Add one or more configured product variations. */
	public static function handle_add( WP_REST_Request $request ) {
		self::ensure_cart();
		$body  = self::body( $request );
		$items = isset( $body['items'] ) && is_array( $body['items'] ) ? $body['items'] : array();
		$added = array();

		foreach ( $items as $item ) {
			$variation_id = isset( $item['id'] ) ? absint( $item['id'] ) : 0;
			$quantity     = isset( $item['quantity'] ) ? max( 1, absint( $item['quantity'] ) ) : 1;
			$product      = wc_get_product( $variation_id );

			if ( ! $product || ! $product->is_purchasable() || ! $product->is_in_stock() ) {
				return new WP_Error( 'jiyu_unavailable', 'This selection is currently unavailable.', array( 'status' => 409 ) );
			}

			$parent_id  = $product->is_type( 'variation' ) ? $product->get_parent_id() : $product->get_id();
			$attributes = $product->is_type( 'variation' ) ? $product->get_variation_attributes() : array();
			$cart_data  = array();

			if ( ! empty( $item['selling_plan'] ) ) {
				$cart_data['jiyu_selling_plan'] = sanitize_text_field( $item['selling_plan'] );
			}

			$key = WC()->cart->add_to_cart( $parent_id, $quantity, $product->is_type( 'variation' ) ? $variation_id : 0, $attributes, $cart_data );
			if ( ! $key ) {
				return new WP_Error( 'jiyu_add_failed', 'Unable to add this selection to your bag.', array( 'status' => 409 ) );
			}

			$added[] = $key;
		}

		WC()->cart->calculate_totals();
		return rest_ensure_response( array( 'items' => $added ) );
	}

	/** Change one cart line. */
	public static function handle_change( WP_REST_Request $request ) {
		self::ensure_cart();
		$body     = self::body( $request );
		$key      = isset( $body['id'] ) ? wc_clean( $body['id'] ) : '';
		$quantity = isset( $body['quantity'] ) ? max( 0, absint( $body['quantity'] ) ) : 0;

		if ( ! $key || ! isset( WC()->cart->get_cart()[ $key ] ) ) {
			return new WP_Error( 'jiyu_line_missing', 'That bag item is no longer available.', array( 'status' => 404 ) );
		}

		WC()->cart->set_quantity( $key, $quantity, true );
		return rest_ensure_response( self::cart_payload() );
	}

	/** Update several cart lines atomically. */
	public static function handle_update( WP_REST_Request $request ) {
		self::ensure_cart();
		$body    = self::body( $request );
		$updates = isset( $body['updates'] ) && is_array( $body['updates'] ) ? $body['updates'] : array();

		foreach ( $updates as $key => $quantity ) {
			if ( isset( WC()->cart->get_cart()[ $key ] ) ) {
				WC()->cart->set_quantity( wc_clean( $key ), max( 0, absint( $quantity ) ), false );
			}
		}

		WC()->cart->calculate_totals();
		return rest_ensure_response( self::cart_payload() );
	}

	/** Load a WooCommerce cart/session in REST requests. */
	private static function ensure_cart() {
		if ( ! function_exists( 'WC' ) ) {
			throw new RuntimeException( 'WooCommerce is required for the JIYU cart.' );
		}

		if ( null === WC()->session && class_exists( 'WC_Session_Handler' ) ) {
			WC()->session = new WC_Session_Handler();
			WC()->session->init();
		}

		if ( null === WC()->customer && class_exists( 'WC_Customer' ) ) {
			WC()->customer = new WC_Customer( get_current_user_id(), true );
		}

		if ( null === WC()->cart && function_exists( 'wc_load_cart' ) ) {
			wc_load_cart();
		}

		if ( WC()->session && ! WC()->session->has_session() ) {
			WC()->session->set_customer_session_cookie( true );
		}
	}

	/** Decode a JSON request body safely. */
	private static function body( WP_REST_Request $request ) {
		$body = $request->get_json_params();
		return is_array( $body ) ? $body : array();
	}

	/** Convert the WooCommerce cart into the fields used by JIYU's original UI. */
	private static function cart_payload() {
		$items      = array();
		$item_count = 0;

		foreach ( WC()->cart->get_cart() as $key => $line ) {
			$product = isset( $line['data'] ) && is_a( $line['data'], 'WC_Product' ) ? $line['data'] : null;
			if ( ! $product ) {
				continue;
			}

			$quantity       = max( 1, absint( $line['quantity'] ) );
			$line_total     = self::to_cents( $line['line_total'] );
			$line_subtotal  = self::to_cents( $line['line_subtotal'] );
			$variation_id   = ! empty( $line['variation_id'] ) ? absint( $line['variation_id'] ) : absint( $line['product_id'] );
			$parent_product = wc_get_product( $line['product_id'] );
			$image_id       = $product->get_image_id();
			$image           = $image_id ? wp_get_attachment_image_url( $image_id, 'woocommerce_thumbnail' ) : '';

			$items[] = array(
				'id'                   => $variation_id,
				'key'                  => $key,
				'variant_id'           => $variation_id,
				'product_id'           => absint( $line['product_id'] ),
				'product_title'        => $parent_product ? $parent_product->get_name() : $product->get_name(),
				'variant_title'        => self::variation_title( $product ),
				'quantity'             => $quantity,
				'price'                => (int) round( $line_subtotal / $quantity ),
				'final_price'          => (int) round( $line_total / $quantity ),
				'original_price'       => (int) round( $line_subtotal / $quantity ),
				'final_line_price'     => $line_total,
				'original_line_price'  => $line_subtotal,
				'line_price'           => $line_total,
				'image'                => $image ? $image : '',
				'url'                  => home_url( '/products/' . ( $parent_product ? $parent_product->get_slug() : $product->get_slug() ) . '/' ),
				'properties'           => array(),
				'selling_plan_allocation' => null,
			);

			$item_count += $quantity;
		}

		$total = self::to_cents( WC()->cart->get_cart_contents_total() );

		return array(
			'token'                => WC()->cart->get_cart_hash(),
			'note'                 => null,
			'attributes'           => array(),
			'original_total_price' => $total,
			'total_price'          => $total,
			'total_discount'       => 0,
			'total_weight'         => 0,
			'item_count'           => $item_count,
			'items'                => $items,
			'items_subtotal_price' => $total,
			'requires_shipping'    => true,
			'currency'             => get_woocommerce_currency(),
			'cart_level_discount_applications' => array(),
		);
	}

	/** Human-readable first variation option. */
	private static function variation_title( $product ) {
		if ( ! $product->is_type( 'variation' ) ) {
			return 'Default Title';
		}

		$values = array_values( $product->get_attributes() );
		return $values ? implode( ' / ', $values ) : $product->get_name();
	}

	/** Decimal amount to cents. */
	private static function to_cents( $amount ) {
		return (int) round( (float) $amount * 100 );
	}
}

