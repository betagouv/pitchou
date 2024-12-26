<script lang="ts">
	let { data } = $$props
</script>

<svelte:head>
	<meta property="og:type" content="article" />
</svelte:head>

<article>
	<div class="prose">
		<data.content />
	</div>
</article>

<style>
	article {
		max-inline-size: var(--size-content-3);
		margin-inline: auto;
	}
</style>
