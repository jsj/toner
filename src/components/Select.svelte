<script lang="ts" generics="T">
	import type { Snippet } from 'svelte';
	import Box from './Box.svelte';

	let {
		items = [],
		selectedIndex = $bindable(0),
		height,
		indicator = '> ',
		children,
		onSelect,
	}: {
		items?: T[];
		selectedIndex?: number;
		height?: number;
		indicator?: string;
		children?: Snippet<[T, number, boolean]>;
		onSelect?: (item: T, index: number) => void;
	} = $props();

	let visibleHeight = $derived(height ?? items.length);
	let scrollOffset = $state(0);

	$effect(() => {
		if (selectedIndex < scrollOffset) {
			scrollOffset = selectedIndex;
		} else if (selectedIndex >= scrollOffset + visibleHeight) {
			scrollOffset = selectedIndex - visibleHeight + 1;
		}
	});

	let visibleItems = $derived.by(() => {
		const end = Math.min(scrollOffset + visibleHeight, items.length);
		return items.slice(scrollOffset, end).map((item, i) => ({
			item,
			index: scrollOffset + i,
			selected: scrollOffset + i === selectedIndex,
		}));
	});

	export function moveUp() { if (selectedIndex > 0) selectedIndex--; }
	export function moveDown() { if (selectedIndex < items.length - 1) selectedIndex++; }
	export function selectCurrent() { if (items.length > 0 && onSelect) onSelect(items[selectedIndex], selectedIndex); }
</script>

<Box flexDirection="column" height={visibleHeight}>
	{#each visibleItems as { item, index, selected }}
		<Box height={1}>
			{#if children}
				{@render children(item, index, selected)}
			{:else}
				<span>{selected ? indicator : '  '}{item}</span>
			{/if}
		</Box>
	{/each}
</Box>
