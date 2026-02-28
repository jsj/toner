<script lang="ts">
	const PASTE_COLLAPSE_CHARS = 400;
	const PASTE_COLLAPSE_LINES = 8;
	const COLLAPSED_RE = /\[.+?\.\.\. \d+ lines\]/g;

	let {
		value = $bindable(''),
		cursor = $bindable(0),
		placeholder = '',
		maxHeight = 4,
	}: {
		value?: string;
		cursor?: number;
		placeholder?: string;
		maxHeight?: number;
	} = $props();

	let collapsedPastes: Map<string, string> = $state(new Map());

	let lines = $derived(value ? value.split('\n') : ['']);
	let lineCount = $derived(Math.min(lines.length, maxHeight));

	let pos = $derived.by(() => {
		let remaining = cursor;
		for (let i = 0; i < lines.length; i++) {
			if (remaining <= lines[i].length) return { row: i, col: remaining };
			remaining -= lines[i].length + 1;
		}
		return { row: lines.length - 1, col: lines[lines.length - 1].length };
	});

	function toFlat(row: number, col: number): number {
		let flat = 0;
		for (let i = 0; i < row; i++) flat += lines[i].length + 1;
		return flat + col;
	}

	function collapseIfLarge(text: string): string {
		const lineCount = text.split('\n').length;
		if (text.length > PASTE_COLLAPSE_CHARS || lineCount > PASTE_COLLAPSE_LINES) {
			const preview = text.substring(0, 50).replace(/\n/g, ' ').replace(/\t/g, ' ').trim();
			const marker = `[${preview}... ${lineCount} lines]`;
			collapsedPastes = new Map(collapsedPastes).set(marker, text);
			return marker;
		}
		return text;
	}

	function cleanupCollapsed(oldVal: string, newVal: string): void {
		const oldMarkers = oldVal.match(COLLAPSED_RE);
		const newMarkers = newVal.match(COLLAPSED_RE);
		if (oldMarkers) {
			const removed = oldMarkers.filter((m) => !newMarkers || !newMarkers.includes(m));
			if (removed.length > 0) {
				const next = new Map(collapsedPastes);
				for (const m of removed) next.delete(m);
				collapsedPastes = next;
			}
		}
	}

	export function insert(char: string): void {
		value = value.slice(0, cursor) + char + value.slice(cursor);
		cursor += char.length;
	}

	export function paste(text: string): void {
		const clean = text
			.replace(/\r\n/g, '\n')
			.replace(/\r/g, '\n')
			.replace(/[\x00-\x08\x0e-\x1f\x7f]/g, '')
			.trim();
		if (!clean) return;
		const collapsed = collapseIfLarge(clean);
		const before = value.slice(0, cursor);
		const after = value.slice(cursor);
		value = before + collapsed + after;
		cursor = before.length + collapsed.length;
	}

	export function getExpandedValue(): string {
		let result = value;
		const markers = value.match(COLLAPSED_RE);
		if (markers) {
			for (const m of markers) {
				const original = collapsedPastes.get(m);
				if (original) result = result.replace(m, original);
			}
		}
		return result;
	}

	export function newline(): void { insert('\n'); }

	export function backspace(): void {
		if (cursor > 0) {
			const oldVal = value;
			const before = value.slice(0, cursor);
			const chars = [...before];
			chars.pop();
			const newBefore = chars.join('');
			value = newBefore + value.slice(cursor);
			cursor = newBefore.length;
			cleanupCollapsed(oldVal, value);
		}
	}

	export function deleteForward(): void {
		if (cursor < value.length) {
			const oldVal = value;
			const after = value.slice(cursor);
			const chars = [...after];
			chars.shift();
			value = value.slice(0, cursor) + chars.join('');
			cleanupCollapsed(oldVal, value);
		}
	}

	export function wordBackspace(): void {
		if (cursor === 0) return;
		const oldVal = value;
		let i = cursor;
		while (i > 0 && /\s/.test(value[i - 1])) i--;
		while (i > 0 && !/\s/.test(value[i - 1])) i--;
		value = value.slice(0, i) + value.slice(cursor);
		cursor = i;
		cleanupCollapsed(oldVal, value);
	}

	export function killToEnd(): void {
		const { row, col } = pos;
		const line = lines[row];
		if (col < line.length) {
			const start = toFlat(row, 0);
			value = value.slice(0, start + col) + (row < lines.length - 1 ? '\n' + lines.slice(row + 1).join('\n') : '');
		} else if (row < lines.length - 1) {
			value = value.slice(0, cursor) + value.slice(cursor + 1);
		}
	}

	export function clearLine(): void {
		const { row } = pos;
		const start = toFlat(row, 0);
		value = value.slice(0, start) + value.slice(toFlat(row, lines[row].length));
		cursor = start;
	}

	export function moveLeft(): void { if (cursor > 0) cursor--; }
	export function moveRight(): void { if (cursor < value.length) cursor++; }
	export function moveUp(): void {
		const { row, col } = pos;
		if (row > 0) cursor = toFlat(row - 1, Math.min(col, lines[row - 1].length));
	}
	export function moveDown(): void {
		const { row, col } = pos;
		if (row < lines.length - 1) cursor = toFlat(row + 1, Math.min(col, lines[row + 1].length));
	}
	export function wordLeft(): void {
		let i = cursor;
		while (i > 0 && /\s/.test(value[i - 1])) i--;
		while (i > 0 && !/\s/.test(value[i - 1])) i--;
		cursor = i;
	}
	export function wordRight(): void {
		let i = cursor;
		while (i < value.length && !/\s/.test(value[i])) i++;
		while (i < value.length && /\s/.test(value[i])) i++;
		cursor = i;
	}
	export function home(): void { cursor = toFlat(pos.row, 0); }
	export function end(): void { cursor = toFlat(pos.row, lines[pos.row].length); }
	export function clear(): void { value = ''; cursor = 0; collapsedPastes = new Map(); }

	export function isAtFirstLine(): boolean { return pos.row === 0; }
	export function isAtLastLine(): boolean { return pos.row === lines.length - 1; }

	let showPlaceholder = $derived(!value && placeholder);
</script>

{#if showPlaceholder}<span data-style="dim">{placeholder}</span
	>{:else}{#each lines.slice(0, maxHeight) as line, i}{#if i > 0}<span>{'\n'}</span>{/if}{#if i === pos.row}<span
				>{line.slice(0, pos.col)}</span
			><span data-style="inverse">{line[pos.col] ?? ' '}</span><span>{line.slice(pos.col + 1)}</span>{:else}<span
				>{line}</span
			>{/if}{/each}{/if}
