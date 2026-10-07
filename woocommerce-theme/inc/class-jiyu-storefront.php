<?php
/**
 * Storefront compatibility and asset loading.
 *
 * @package JIYU_Original
 */

defined( 'ABSPATH' ) || exit;

final class JIYU_Storefront {
	const VERSION = '0.1.0';

	const PRODUCT_SLUGS = array(
		'toner'  => 'renewal-rejuvenation-toner-pads',
		'cream'  => 'nad-anti-aging-moisturizing-cream',
		'bundle' => 'test-complete-care-bundle',
	);

	/** Boot theme hooks. */
	public static function boot() {
		add_action( 'after_setup_theme', array( __CLASS__, 'setup' ) );
		add_action( 'after_switch_theme', array( __CLASS__, 'flush_routes' ) );
		add_action( 'init', array( __CLASS__, 'register_routes' ) );
		add_filter( 'query_vars', array( __CLASS__, 'query_vars' ) );
		add_filter( 'template_include', array( __CLASS__, 'template_include' ), 99 );
		add_action( 'template_redirect', array( __CLASS__, 'redirect_shop' ) );
		add_action( 'wp_enqueue_scripts', array( __CLASS__, 'enqueue_assets' ), 20 );
		add_filter( 'script_loader_tag', array( __CLASS__, 'script_attributes' ), 10, 3 );
		add_filter( 'body_class', array( __CLASS__, 'body_classes' ) );
		add_filter( 'woocommerce_account_menu_items', array( __CLASS__, 'account_menu_items' ) );
		add_action( 'admin_notices', array( __CLASS__, 'product_notice' ) );
	}

	/** Enable WordPress and WooCommerce features. */
	public static function setup() {
		add_theme_support( 'title-tag' );
		add_theme_support( 'post-thumbnails' );
		add_theme_support( 'woocommerce' );
		add_theme_support( 'wc-product-gallery-lightbox' );
		add_theme_support( 'wc-product-gallery-slider' );
		add_theme_support( 'html5', array( 'search-form', 'comment-form', 'comment-list', 'gallery', 'caption', 'style', 'script' ) );
	}

	/** Register Shopify-compatible public paths. */
	public static function register_routes() {
		add_rewrite_rule( '^collections/all/?$', 'index.php?jiyu_route=shop', 'top' );
		add_rewrite_rule( '^products/([^/]+)/?$', 'index.php?product=$matches[1]&jiyu_route=product', 'top' );
		add_rewrite_rule( '^pages/([^/]+)/?$', 'index.php?jiyu_route=page&jiyu_slug=$matches[1]', 'top' );
		add_rewrite_rule( '^policies/([^/]+)/?$', 'index.php?jiyu_route=policy&jiyu_slug=$matches[1]', 'top' );
		add_rewrite_rule( '^blogs/news/?$', 'index.php?jiyu_route=journal', 'top' );
		add_rewrite_rule( '^apps/parcelpanel/?$', 'index.php?jiyu_route=tracking', 'top' );
		add_rewrite_rule( '^track-order/?$', 'index.php?jiyu_route=tracking', 'top' );
	}

	/** Flush public JIYU URLs once when the theme is activated. */
	public static function flush_routes() {
		self::register_routes();
		flush_rewrite_rules();
	}

	/** Add custom route query vars. */
	public static function query_vars( $vars ) {
		$vars[] = 'jiyu_route';
		$vars[] = 'jiyu_slug';
		return $vars;
	}

	/** Keep the React storefront for JIYU routes and products. */
	public static function template_include( $template ) {
		if ( 'tracking' === get_query_var( 'jiyu_route' ) ) {
			return get_template_directory() . '/tracking.php';
		}

		if ( self::is_storefront_request() ) {
			wp_dequeue_style( 'wp-block-library' );
			wp_dequeue_style( 'wp-block-library-theme' );
			wp_dequeue_style( 'global-styles' );
			wp_dequeue_style( 'woocommerce-general' );
			wp_dequeue_style( 'woocommerce-layout' );
			wp_dequeue_style( 'woocommerce-smallscreen' );

			return get_template_directory() . '/front-controller.php';
		}

		return $template;
	}

	/** Redirect WooCommerce's default shop URL to the original JIYU URL. */
	public static function redirect_shop() {
		if ( function_exists( 'is_shop' ) && is_shop() && ! get_query_var( 'jiyu_route' ) ) {
			wp_safe_redirect( home_url( '/collections/all/' ), 301 );
			exit;
		}
	}

	/** Determine whether the compiled JIYU storefront owns the current request. */
	public static function is_storefront_request() {
		if ( is_front_page() || is_home() || ( get_query_var( 'jiyu_route' ) && 'tracking' !== get_query_var( 'jiyu_route' ) ) ) {
			return true;
		}

		return function_exists( 'is_product' ) && is_product();
	}

	/** Load the original JIYU assets and the WooCommerce adapter. */
	public static function enqueue_assets() {
		wp_enqueue_style( 'jiyu-theme', get_stylesheet_uri(), array(), self::VERSION );

		if ( self::is_storefront_request() ) {
			$styles = array(
				'jiyu'           => 'jiyu.css',
				'jiyu-account'   => 'account-drawer.css',
				'jiyu-tracking'  => 'tracking-page.css',
				'jiyu-offer'     => 'toner-offer-badge.css',
				'jiyu-promo'     => 'promo-code-banner.css',
				'jiyu-cart'      => 'cart-drawer.css',
				'jiyu-performance' => 'performance-fixes.css',
			);

			foreach ( $styles as $handle => $file ) {
				wp_enqueue_style( $handle, self::asset_url( $file ), array(), self::asset_version( $file ) );
			}

			wp_enqueue_script( 'jiyu-hls', self::asset_url( 'videos-hls.min.js' ), array(), self::asset_version( 'videos-hls.min.js' ), true );
			wp_enqueue_script( 'jiyu-woo-bridge', self::asset_url( 'jiyu-woo-bridge.js' ), array(), self::asset_version( 'jiyu-woo-bridge.js' ), false );
			wp_add_inline_script( 'jiyu-woo-bridge', self::configuration_script(), 'before' );
			wp_enqueue_script( 'jiyu-storefront', self::asset_url( 'jiyu.js' ), array( 'jiyu-woo-bridge' ), self::asset_version( 'jiyu.js' ), true );
			wp_enqueue_script( 'jiyu-account', self::asset_url( 'account-drawer.js' ), array( 'jiyu-storefront' ), self::asset_version( 'account-drawer.js' ), true );
			wp_enqueue_script( 'jiyu-cart', self::asset_url( 'cart-drawer.js' ), array( 'jiyu-storefront' ), self::asset_version( 'cart-drawer.js' ), true );
			wp_enqueue_script( 'jiyu-offer', self::asset_url( 'toner-offer-badge.js' ), array( 'jiyu-storefront' ), self::asset_version( 'toner-offer-badge.js' ), true );
			wp_enqueue_script( 'jiyu-promo', self::asset_url( 'promo-code-banner.js' ), array( 'jiyu-storefront' ), self::asset_version( 'promo-code-banner.js' ), true );
			return;
		}

		wp_enqueue_style( 'jiyu-woocommerce', self::asset_url( 'woocommerce.css' ), array( 'jiyu-theme' ), self::asset_version( 'woocommerce.css' ) );
		if ( 'tracking' === get_query_var( 'jiyu_route' ) ) {
			wp_enqueue_style( 'jiyu-woo-tracking', self::asset_url( 'woo-tracking.css' ), array( 'jiyu-woocommerce' ), self::asset_version( 'woo-tracking.css' ) );
		}
	}

	/** Add data attributes required by the original offer enhancer. */
	public static function script_attributes( $tag, $handle, $src ) {
		if ( 'jiyu-offer' !== $handle ) {
			return $tag;
		}

		$attributes = sprintf(
			' data-toner-image="%s" data-moisturizer-image="%s"',
			esc_url( self::asset_url( 'd2976e15e91c8320.png' ) ),
			esc_url( self::asset_url( '4f0c08d424cfdb25.png' ) )
		);

		return str_replace( ' src=', $attributes . ' src=', $tag );
	}

	/** Add scoped classes for non-SPA WooCommerce pages. */
	public static function body_classes( $classes ) {
		if ( ! self::is_storefront_request() ) {
			$classes[] = 'jiyu-woocommerce-page';
		}
		return $classes;
	}

	/** Remove the irrelevant digital-download tab from skincare accounts. */
	public static function account_menu_items( $items ) {
		unset( $items['downloads'] );
		return $items;
	}

	/** Frontend configuration with WooCommerce product and route data. */
	private static function configuration_script() {
		$config = array(
			'assetBase'    => trailingslashit( get_template_directory_uri() . '/assets' ),
			'root'         => trailingslashit( home_url( '/' ) ),
			'accountUrl'   => function_exists( 'wc_get_page_permalink' ) ? wc_get_page_permalink( 'myaccount' ) : home_url( '/my-account/' ),
			'checkoutUrl'  => function_exists( 'wc_get_checkout_url' ) ? wc_get_checkout_url() : home_url( '/checkout/' ),
			'trackingUrl'  => home_url( '/track-order/' ),
			'currency'     => function_exists( 'get_woocommerce_currency' ) ? get_woocommerce_currency() : 'USD',
			'locale'       => str_replace( '_', '-', get_locale() ),
			'cartApi'      => esc_url_raw( rest_url( 'jiyu/v1/cart' ) ),
			'restNonce'    => wp_create_nonce( 'wp_rest' ),
			'subscriptionsEnabled' => (bool) apply_filters( 'jiyu_subscriptions_enabled', false ),
			'products'     => self::products_payload(),
		);

		$cart_config = array(
			'root'          => trailingslashit( home_url( '/' ) ),
			'logo'          => self::asset_url( '5f469f939df6e349.png' ),
			'guaranteeIcon' => self::asset_url( 'cart-guarantee-0.svg' ),
			'shippingIcon'  => self::asset_url( 'cart-guarantee-1.svg' ),
			'payments'      => array_map(
				function ( $index ) {
					return self::asset_url( 'cart-payment-' . $index . '.svg' );
				},
				range( 0, 11 )
			),
		);

		return 'window.JIYU_THEME=' . wp_json_encode( $config ) . ';'
			. 'window.JIYU_CART_DRAWER=' . wp_json_encode( $cart_config ) . ';'
			. 'window.Shopify=window.Shopify||{currency:{active:window.JIYU_THEME.currency}};'
			. 'window.JIYU_THEME.formatMoney=function(cents){try{return new Intl.NumberFormat(window.JIYU_THEME.locale||"en-US",{style:"currency",currency:window.JIYU_THEME.currency||"USD",minimumFractionDigits:2,maximumFractionDigits:2}).format((Number(cents)||0)/100)}catch(e){return "$"+((Number(cents)||0)/100).toFixed(2)}};'
			. 'window.JIYU_THEME.resolveAssetText=function(text){text=String(text||"").replaceAll("/assets/nav-04024a0db1243bee","/assets/nav-04024a0db1243bee.jpg").replaceAll("/assets/nav-59a4fe69a2e2129c","/assets/nav-59a4fe69a2e2129c.jpg").replaceAll("/assets/nav-687610b252848e05","/assets/nav-687610b252848e05.jpg").replaceAll("/assets/nav-7cd1d9324f72c423","/assets/nav-7cd1d9324f72c423.jpg").replaceAll("/assets/nav-ca9a831e9bf989ea","/assets/nav-ca9a831e9bf989ea.jpg").replaceAll("/assets/nav-de64769438065a0e","/assets/nav-de64769438065a0e.jpg");return text.replace(/\\/assets\\/(video\\/|source\\/|videos\\/)?/g,function(_,folder){return folder==="video/"?"https://cdn.jsdelivr.net/gh/mohannadabuhdeib-art/shopify1@399b5e6fe6db8122131f712ada962a0cde3c8f6f/public/assets/video/":window.JIYU_THEME.assetBase+(folder?folder.replace("/","-"):"")})};';
	}

	/** Build the product objects expected by the original React storefront. */
	public static function products_payload() {
		$products = array();

		foreach ( self::PRODUCT_SLUGS as $key => $slug ) {
			$products[ $key ] = self::product_payload( $slug );
		}

		return $products;
	}

	/** Convert one WooCommerce product to Shopify's public product JSON shape. */
	private static function product_payload( $slug ) {
		if ( ! function_exists( 'wc_get_product' ) ) {
			return null;
		}

		$post = get_page_by_path( $slug, OBJECT, 'product' );
		if ( ! $post ) {
			return null;
		}

		$product = wc_get_product( $post->ID );
		if ( ! $product ) {
			return null;
		}

		$images = array();
		foreach ( array_merge( array( $product->get_image_id() ), $product->get_gallery_image_ids() ) as $image_id ) {
			$image_url = $image_id ? wp_get_attachment_image_url( $image_id, 'full' ) : '';
			if ( $image_url ) {
				$images[] = $image_url;
			}
		}

		$variants = array();
		if ( $product->is_type( 'variable' ) ) {
			foreach ( $product->get_children() as $variation_id ) {
				$variation = wc_get_product( $variation_id );
				if ( ! $variation ) {
					continue;
				}

				$attributes = array_values( $variation->get_attributes() );
				$option      = isset( $attributes[0] ) ? $attributes[0] : $variation->get_name();
				$image_url   = $variation->get_image_id() ? wp_get_attachment_image_url( $variation->get_image_id(), 'full' ) : '';
				$variants[]  = array(
					'id'                       => $variation->get_id(),
					'title'                    => $option,
					'option1'                  => $option,
					'available'                => $variation->is_in_stock() && $variation->is_purchasable(),
					'price'                    => self::to_cents( $variation->get_price() ),
					'compare_at_price'         => self::compare_at_price( $variation ),
					'sku'                      => $variation->get_sku(),
					'featured_image'           => $image_url ? array( 'src' => $image_url ) : null,
					'selling_plan_allocations' => (array) apply_filters( 'jiyu_selling_plan_allocations', array(), $variation ),
				);
			}

			usort(
				$variants,
				function ( $a, $b ) {
					return intval( $a['option1'] ) <=> intval( $b['option1'] );
				}
			);
		} else {
			$variants[] = array(
				'id'                       => $product->get_id(),
				'title'                    => 'Default Title',
				'option1'                  => '1',
				'available'                => $product->is_in_stock() && $product->is_purchasable(),
				'price'                    => self::to_cents( $product->get_price() ),
				'compare_at_price'         => self::compare_at_price( $product ),
				'sku'                      => $product->get_sku(),
				'featured_image'           => ! empty( $images[0] ) ? array( 'src' => $images[0] ) : null,
				'selling_plan_allocations' => (array) apply_filters( 'jiyu_selling_plan_allocations', array(), $product ),
			);
		}

		$prices = wp_list_pluck( $variants, 'price' );

		return array(
			'id'                => $product->get_id(),
			'handle'            => $slug,
			'title'             => $product->get_name(),
			'url'               => home_url( '/products/' . $slug . '/' ),
			'featured_image'    => ! empty( $images[0] ) ? $images[0] : '',
			'images'            => $images,
			'price'             => $prices ? min( $prices ) : 0,
			'price_min'         => $prices ? min( $prices ) : 0,
			'price_max'         => $prices ? max( $prices ) : 0,
			'available'         => $product->is_in_stock(),
			'variants'          => $variants,
		);
	}

	/** Convert a WooCommerce decimal amount to integer cents. */
	private static function to_cents( $amount ) {
		return (int) round( (float) $amount * 100 );
	}

	/** Expose the regular price only when it is genuinely higher. */
	private static function compare_at_price( $product ) {
		$regular = self::to_cents( $product->get_regular_price() );
		$current = self::to_cents( $product->get_price() );
		return $regular > $current ? $regular : null;
	}

	/** Theme asset URL. */
	public static function asset_url( $file ) {
		return get_template_directory_uri() . '/assets/' . ltrim( $file, '/' );
	}

	/** File timestamp cache key. */
	private static function asset_version( $file ) {
		$path = get_template_directory() . '/assets/' . ltrim( $file, '/' );
		return file_exists( $path ) ? (string) filemtime( $path ) : self::VERSION;
	}

	/** Warn administrators if the required WooCommerce catalogue is incomplete. */
	public static function product_notice() {
		if ( ! current_user_can( 'manage_woocommerce' ) || ! function_exists( 'wc_get_product' ) ) {
			return;
		}

		$missing = array();
		foreach ( self::PRODUCT_SLUGS as $slug ) {
			if ( ! get_page_by_path( $slug, OBJECT, 'product' ) ) {
				$missing[] = $slug;
			}
		}

		if ( $missing ) {
			printf(
				'<div class="notice notice-warning"><p><strong>%s</strong> %s</p></div>',
				esc_html__( 'JIYU storefront:', 'jiyu-original' ),
				esc_html( sprintf( 'Import the WooCommerce catalogue before launch. Missing product slugs: %s', implode( ', ', $missing ) ) )
			);
		}
	}
}

