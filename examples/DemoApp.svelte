<script lang="ts">
	import Box from '../src/components/Box.svelte';

	let {
		width = 80,
		height = 24,
	}: {
		width?: number;
		height?: number;
	} = $props();

	let inputValue = $state('');
	let inputCursor = $state(0);
	let keystrokeCount = $state(0);
	let avg = $state(0);
	let p50 = $state(0);
	let p95 = $state(0);
	let p99 = $state(0);
	let max = $state(0);
	let hasStats = $derived(keystrokeCount > 0);

	export function insert(char: string) {
		inputValue = inputValue.slice(0, inputCursor) + char + inputValue.slice(inputCursor);
		inputCursor++;
	}

	export function backspace() {
		if (inputCursor > 0) {
			inputValue = inputValue.slice(0, inputCursor - 1) + inputValue.slice(inputCursor);
			inputCursor--;
		}
	}

	export function moveLeft() { if (inputCursor > 0) inputCursor--; }
	export function moveRight() { if (inputCursor < inputValue.length) inputCursor++; }
	export function home() { inputCursor = 0; }
	export function end() { inputCursor = inputValue.length; }
	export function clear() { inputValue = ''; inputCursor = 0; }

	export function updateStats(stats: { count: number; avg: number; p50: number; p95: number; p99: number; max: number }) {
		keystrokeCount = stats.count;
		avg = stats.avg;
		p50 = stats.p50;
		p95 = stats.p95;
		p99 = stats.p99;
		max = stats.max;
	}
</script>

<Box {width} {height} flexDirection="column">
	<Box height={1} style="inverse">
		<span> Toner Demo </span>
	</Box>

	<Box flexGrow={1} paddingX={2} paddingY={1} flexDirection="column">
		<Box height={1}>
			<span>> {inputValue}</span>
		</Box>
		<Box height={1} style="dim">
			<span>{inputValue.length} chars</span>
		</Box>
		<Box height={1}><span> </span></Box>

		{#if hasStats}
			<Box height={1}>
				<span>Keystrokes: {keystrokeCount}</span>
			</Box>
			<Box height={1}>
				<span>avg: {avg.toFixed(1)}us | p50: {p50.toFixed(1)}us | p95: {p95.toFixed(1)}us | p99: {p99.toFixed(1)}us | max: {max.toFixed(1)}us</span>
			</Box>
		{:else}
			<Box height={1}>
				<span>Type something! (Ctrl+C to quit)</span>
			</Box>
			<Box height={1}><span> </span></Box>
		{/if}

		<Box height={1}><span> </span></Box>
		<Box height={1} style="dim">
			<span>Arrows: move cursor | Backspace: delete | Home/End | Ctrl+C: quit</span>
		</Box>
		<Box height={1}><span> </span></Box>
		<Box height={1} style="dim">
			<span>toner — Svelte 5 for interactive CLIs</span>
		</Box>
	</Box>

	<Box height={1} style="dim">
		<span> Svelte 5 + Yoga WASM | mutation-driven rendering</span>
	</Box>
</Box>
