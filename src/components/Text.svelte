<script lang="ts">
	import type { Snippet } from 'svelte';
	let { style = '', children }: { style?: string; children?: Snippet } = $props();
</script>

<span data-style={style}>{@render children?.()}</span>
