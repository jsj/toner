<script lang="ts">
	import Box from '../../src/components/Box.svelte';
</script>

<Box width={60} height={12} flexDirection="column">
	<Box height={1} style="bold;cyan">
		<span>  Box Layout</span>
	</Box>
	<Box flexDirection="row" gap={1} padding={1} borderStyle="round" borderColor="cyan" height={5}>
		<Box flexGrow={1} borderStyle="single" borderColor="green" padding={1}>
			<span data-style="green">Left (flexGrow=1)</span>
		</Box>
		<Box width={20} borderStyle="single" borderColor="yellow" padding={1}>
			<span data-style="yellow">Right (w=20)</span>
		</Box>
	</Box>
	<Box flexDirection="row" gap={1} paddingX={1} height={3}>
		<Box flexGrow={1} borderStyle="double" borderColor="magenta" alignItems="center" justifyContent="center">
			<span data-style="magenta">A</span>
		</Box>
		<Box flexGrow={1} borderStyle="bold" borderColor="blue" alignItems="center" justifyContent="center">
			<span data-style="blue">B</span>
		</Box>
		<Box flexGrow={1} borderStyle="round" borderColor="red" alignItems="center" justifyContent="center">
			<span data-style="red">C</span>
		</Box>
	</Box>
</Box>
