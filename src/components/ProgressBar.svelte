<script lang="ts">
	import Box from './Box.svelte';

	let {
		value = 0,
		max = 100,
		width = 40,
		label = '',
		style = 'green',
	}: {
		value?: number;
		max?: number;
		width?: number;
		label?: string;
		style?: string;
	} = $props();

	let pct = $derived(Math.max(0, Math.min(1, value / max)));
	let filled = $derived(Math.round(pct * width));
	let empty = $derived(width - filled);
	let bar = $derived('\u2588'.repeat(filled) + '\u2591'.repeat(empty));
	let pctStr = $derived(`${Math.round(pct * 100)}%`);
</script>

<Box height={1}>
	{#if label}
		<span>{label} </span>
	{/if}
	<span data-style={style}>{bar}</span>
	<span data-style="dim"> {pctStr}</span>
</Box>
