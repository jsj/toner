<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		style = '',
		children,
		flexDirection,
		flexGrow,
		flexShrink,
		justifyContent,
		alignItems,
		width,
		height,
		minWidth,
		minHeight,
		padding,
		paddingX,
		paddingY,
		margin,
		marginX,
		marginY,
		marginTop,
		gap,
		display,
		overflow,
		borderStyle,
		borderColor,
	}: {
		style?: string;
		children?: Snippet;
		flexDirection?: 'row' | 'column';
		flexGrow?: number;
		flexShrink?: number;
		justifyContent?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly';
		alignItems?: 'flex-start' | 'center' | 'flex-end' | 'stretch';
		width?: number | string;
		height?: number | string;
		minWidth?: number;
		minHeight?: number;
		padding?: number;
		paddingX?: number;
		paddingY?: number;
		margin?: number;
		marginX?: number;
		marginY?: number;
		marginTop?: number;
		gap?: number;
		display?: 'flex' | 'none';
		overflow?: 'visible' | 'hidden' | 'scroll';
		borderStyle?: 'round' | 'single' | 'double' | 'bold';
		borderColor?: string;
	} = $props();

	let layoutStr = $derived.by(() => {
		const parts: string[] = [];
		if (flexDirection) parts.push(`flex-direction:${flexDirection}`);
		if (flexGrow !== undefined) parts.push(`flex-grow:${flexGrow}`);
		if (flexShrink !== undefined) parts.push(`flex-shrink:${flexShrink}`);
		if (justifyContent) parts.push(`justify-content:${justifyContent}`);
		if (alignItems) parts.push(`align-items:${alignItems}`);
		if (width !== undefined) parts.push(`width:${width}`);
		if (height !== undefined) parts.push(`height:${height}`);
		if (minWidth !== undefined) parts.push(`min-width:${minWidth}`);
		if (minHeight !== undefined) parts.push(`min-height:${minHeight}`);
		if (padding !== undefined) parts.push(`padding:${padding}`);
		if (paddingX !== undefined) parts.push(`padding-x:${paddingX}`);
		if (paddingY !== undefined) parts.push(`padding-y:${paddingY}`);
		if (margin !== undefined) parts.push(`margin:${margin}`);
		if (marginX !== undefined) parts.push(`margin-x:${marginX}`);
		if (marginY !== undefined) parts.push(`margin-y:${marginY}`);
		if (marginTop !== undefined) parts.push(`margin-top:${marginTop}`);
		if (gap !== undefined) parts.push(`gap:${gap}`);
		if (display) parts.push(`display:${display}`);
		if (overflow) parts.push(`overflow:${overflow}`);
		if (borderStyle) parts.push(`border:${borderStyle}`);
		return parts.join(';');
	});

	let borderAttr = $derived(borderStyle ? `${borderStyle}${borderColor ? `:${borderColor}` : ''}` : undefined);
</script>

<div data-style={style} data-layout={layoutStr} data-border={borderAttr}>{@render children?.()}</div>
