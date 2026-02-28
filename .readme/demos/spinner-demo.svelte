<script lang="ts">
	import Box from '../../src/components/Box.svelte';
	import Spinner from '../../src/components/Spinner.svelte';
</script>

<Box width={50} height={6} flexDirection="column" gap={1} paddingX={2} paddingY={1}>
	<Box height={1}>
		<Spinner style="yellow" label="Installing dependencies..." />
	</Box>
	<Box height={1}>
		<Spinner style="cyan" label="Compiling 42 modules..." />
	</Box>
	<Box height={1}>
		<Spinner style="green" label="Running tests..." />
	</Box>
</Box>
