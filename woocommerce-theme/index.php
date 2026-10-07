<?php
/**
 * Generic WordPress fallback.
 *
 * @package JIYU_Original
 */

get_header();
?>
<main class="jwc-shell">
	<?php
	while ( have_posts() ) {
		the_post();
		the_content();
	}
	?>
</main>
<?php
get_footer();

