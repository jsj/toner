<script lang="ts">
	import Box from '../../src/components/Box.svelte';
	import ProgressBar from '../../src/components/ProgressBar.svelte';
</script>

<Box width={56} height={7} flexDirection="column" gap={1} paddingX={2} paddingY={1}>
	<ProgressBar value={100} max={100} width={30} label="Build  " style="green" />
	<ProgressBar value={67} max={100} width={30} label="Test   " style="cyan" />
	<ProgressBar value={23} max={100} width={30} label="Deploy " style="yellow" />
</Box>
