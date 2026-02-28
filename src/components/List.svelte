<script lang="ts" generics="T">
	import type { Snippet } from 'svelte';
	import Box from './Box.svelte';

	let {
		items = [],
		height = 10,
		itemHeight = 1,
		follow = true,
		children,
	}: {
		items?: T[];
		height?: number;
		itemHeight?: number;
		follow?: boolean;
		children?: Snippet<[T, number]>;
	} = $props();

	let scrollOffset = $state(0);
	let visibleCount = $derived(Math.floor(height / itemHeight));

	$effect(() => {
		if (follow && items.length > visibleCount) {
			scrollOffset = items.length - visibleCount;
		}
	});

	let visibleItems = $derived.by(() => {
		const start = Math.max(0, Math.min(scrollOffset, items.length - visibleCount));
		const end = Math.min(start + visibleCount, items.length);
		return items.slice(start, end).map((item, i) => ({ item, index: start + i }));
	});

	export function scrollUp(lines = 1) { scrollOffset = Math.max(0, scrollOffset - lines); }
	export function scrollDown(lines = 1) { scrollOffset = Math.min(Math.max(0, items.length - visibleCount), scrollOffset + lines); }
	export function scrollToTop() { scrollOffset = 0; }
	export function scrollToBottom() { scrollOffset = Math.max(0, items.length - visibleCount); }
	export function pageUp() { scrollUp(visibleCount); }
	export function pageDown() { scrollDown(visibleCount); }
</script>

<Box {height} flexDirection="column">
	{#each visibleItems as { item, index }}
		<Box height={itemHeight}>
			{@render children?.(item, index)}
		</Box>
	{/each}
</Box>
