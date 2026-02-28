<script lang="ts">
	import Box from '../../src/components/Box.svelte';

	let items = ['Create new project', 'Open existing', 'Import from Git', 'Browse templates', 'Settings'];
	let selected = 2;
</script>

<Box width={40} height={9} flexDirection="column">
	<Box height={1} style="bold;cyan">
		<span>  Select</span>
	</Box>
	<Box flexDirection="column" paddingX={2} paddingY={1}>
		{#each items as item, i}
			<Box height={1}>
				{#if i === selected}
					<span data-style="cyan;bold">> {item}</span>
				{:else}
					<span data-style="dim">  {item}</span>
				{/if}
			</Box>
		{/each}
	</Box>
</Box>
