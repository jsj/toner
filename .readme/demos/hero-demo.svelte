<script lang="ts">
	import Box from '../../src/components/Box.svelte';
	import Spinner from '../../src/components/Spinner.svelte';
	import ProgressBar from '../../src/components/ProgressBar.svelte';
	import Tabs from '../../src/components/Tabs.svelte';

	let count = $state(0);
	let progress = $state(0);

	$effect(() => {
		const t1 = setInterval(() => { count++; }, 100);
		const t2 = setInterval(() => { progress = Math.min(100, progress + 2); }, 120);
		return () => { clearInterval(t1); clearInterval(t2); };
	});
</script>

<Box width={60} height={16} flexDirection="column">
	<Box height={1} style="bold;inverse" paddingX={1}>
		<span> toner — Svelte for CLIs </span>
	</Box>

	<Box paddingX={2} paddingY={1} flexDirection="column" gap={1}>
		<Box height={1}>
			<Tabs items={['Counter', 'Progress', 'Status']} activeIndex={0} />
		</Box>

		<Box borderStyle="round" borderColor="cyan" paddingX={2} paddingY={1} flexDirection="column" gap={1} height={8}>
			<Box height={1}>
				<span data-style="green;bold">{count}</span>
				<span data-style="dim"> ticks elapsed</span>
			</Box>

			<ProgressBar value={progress} max={100} width={30} label="Build" style="cyan" />

			<Box height={1}>
				<Spinner style="yellow" label="Watching for changes..." />
			</Box>
		</Box>

		<Box height={1}>
			<span data-style="dim">Svelte 5 + Yoga WASM | mutation-driven ANSI rendering</span>
		</Box>
	</Box>
</Box>
