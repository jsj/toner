<script lang="ts">
	let {
		text = $bindable(''),
	}: {
		text?: string;
	} = $props();

	export function append(token: string): void { text += token; }
	export function clear(): void { text = ''; }
</script>

<div><span>{text}</span></div>
