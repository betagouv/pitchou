<script lang="ts">
	import Squelette from '$lib/front-end/components/Squelette.svelte'

	let { data } = $$props
</script>

<svelte:head>
	<meta property="og:type" content="article" />
</svelte:head>

<Squelette>
	<article>
		<div class="prose">
			<data.content />
		</div>
	</article>
</Squelette>

<style>
	article {
		max-inline-size: var(--size-content-3);
		margin-inline: auto;
	}
</style>
