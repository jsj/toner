<script lang="ts">
	import type { Snippet } from 'svelte';
	import Box from './Box.svelte';

	let {
		title = '',
		width,
		height,
		children,
	}: {
		title?: string;
		width?: number;
		height?: number;
		children?: Snippet;
	} = $props();
</script>

<Box flexDirection="column" {width} {height} paddingX={1} paddingY={1}>
	{#if title}
		<Box height={1}>
			<span data-style="bold">{title}</span>
		</Box>
		<Box height={1}>
			<span data-style="dim">{'\u2500'.repeat(40)}</span>
		</Box>
	{/if}
	{@render children?.()}
</Box>
