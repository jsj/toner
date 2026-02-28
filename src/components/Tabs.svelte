<script lang="ts">
	import Box from './Box.svelte';

	let {
		items = [],
		activeIndex = $bindable(0),
	}: {
		items?: string[];
		activeIndex?: number;
	} = $props();

	export function next() { activeIndex = (activeIndex + 1) % items.length; }
	export function prev() { activeIndex = (activeIndex - 1 + items.length) % items.length; }
</script>

<Box height={1}>
	{#each items as item, i}
		{#if i === activeIndex}
			<span data-style="bold;inverse"> {item} </span>
		{:else}
			<span data-style="dim"> {item} </span>
		{/if}
		{#if i < items.length - 1}
			<span data-style="dim"> | </span>
		{/if}
	{/each}
</Box>
