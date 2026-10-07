<?php
/**
 * WordPress page template, including Checkout and My Account.
 *
 * @package JIYU_Original
 */

get_header();
?>
<main class="jwc-shell<?php echo function_exists( 'is_checkout' ) && is_checkout() ? ' jwc-shell--checkout' : ''; ?>">
	<?php
	while ( have_posts() ) {
		the_post();
		the_content();
	}
	?>
</main>
<?php
get_footer();

