<script lang="ts">
	import { subscribe, currentFrame } from './spinner-clock.js';

	let {
		style = 'yellow',
		label = '',
	}: {
		style?: string;
		label?: string;
	} = $props();

	let frame = $state(currentFrame());

	$effect(() => {
		return subscribe(() => {
			frame = currentFrame();
		});
	});
</script>

<span data-style={style}>{frame}{label ? ' ' + label : ''}</span>
