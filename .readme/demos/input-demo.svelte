<script lang="ts">
	import Box from '../../src/components/Box.svelte';

	let text = $state('Hello, toner!');
	let cursorPos = $state(13);

	let before = $derived(text.slice(0, cursorPos));
	let cursorChar = $derived(text[cursorPos] ?? ' ');
	let after = $derived(text.slice(cursorPos + 1));
</script>

<Box width={50} height={6} flexDirection="column">
	<Box height={1} style="bold;cyan">
		<span>  Input</span>
	</Box>
	<Box paddingX={2} paddingY={1} borderStyle="round" borderColor="cyan" height={3}>
		<span data-style="white">{before}</span><span data-style="inverse">{cursorChar}</span><span data-style="white">{after}</span>
	</Box>
	<Box paddingX={2} height={1}>
		<span data-style="dim">{text.length} chars | cursor: {cursorPos}</span>
	</Box>
</Box>
