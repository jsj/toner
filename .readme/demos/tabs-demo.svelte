<script lang="ts">
	import Box from '../../src/components/Box.svelte';
	import Tabs from '../../src/components/Tabs.svelte';
</script>

<Box width={50} height={5} flexDirection="column">
	<Box height={1} paddingX={1}>
		<Tabs items={['Files', 'Search', 'Settings', 'Help']} activeIndex={1} />
	</Box>
	<Box borderStyle="round" borderColor="cyan" paddingX={2} paddingY={1} height={4}>
		<span data-style="dim">Search results will appear here...</span>
	</Box>
</Box>
