// Tree-driven terminal renderer with mutation tracking.
//
// Two modes:
// 1. Full render: walk entire tree -> ANSI. Sets position mappings on text nodes.
// 2. Mutation render: text node changed -> emit ANSI for just that region.

import {
	COMMENT_NODE,
	ELEMENT_NODE,
	setMutationCallback,
	TEXT_NODE,
	type TuiElement,
	type TuiNode,
	type TuiText,
} from './dom-proxy/nodes.js';
import { type ComputedLayout, computeLayout } from './layout/yoga.js';

const ESC = '\x1b';
const CSI = `${ESC}[`;

// --- ANSI style resolution ---

const FG_COLORS: Record<string, string> = {
	black: '30', red: '31', green: '32', yellow: '33', blue: '34',
	magenta: '35', cyan: '36', white: '37', gray: '90', grey: '90',
	blackBright: '90', redBright: '91', greenBright: '92', yellowBright: '93',
	blueBright: '94', magentaBright: '95', cyanBright: '96', whiteBright: '97',
};

const BG_COLORS: Record<string, string> = {
	bgBlack: '40', bgRed: '41', bgGreen: '42', bgYellow: '43', bgBlue: '44',
	bgMagenta: '45', bgCyan: '46', bgWhite: '47', bgGray: '100', bgGrey: '100',
	bgBlackBright: '100', bgRedBright: '101', bgGreenBright: '102', bgYellowBright: '103',
	bgBlueBright: '104', bgMagentaBright: '105', bgCyanBright: '106', bgWhiteBright: '107',
};

const MODIFIERS: Record<string, string> = {
	bold: '1', dim: '2', italic: '3', underline: '4', inverse: '7', strikethrough: '9',
};

function parseHex(hex: string): [number, number, number] | null {
	const h = hex.startsWith('#') ? hex.slice(1) : hex;
	if (h.length === 3) return [parseInt(h[0] + h[0], 16), parseInt(h[1] + h[1], 16), parseInt(h[2] + h[2], 16)];
	if (h.length === 6) return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
	return null;
}

function parseRgb(str: string): [number, number, number] | null {
	const m = str.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/);
	return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

function parseAnsi256(str: string): number | null {
	const m = str.match(/^ansi256\(\s*(\d+)\s*\)$/);
	return m ? Number(m[1]) : null;
}

export function resolveStyleToken(token: string): string | null {
	if (MODIFIERS[token]) return MODIFIERS[token];
	if (FG_COLORS[token]) return FG_COLORS[token];
	if (BG_COLORS[token]) return BG_COLORS[token];
	if (token.startsWith('#')) { const rgb = parseHex(token); return rgb ? `38;2;${rgb[0]};${rgb[1]};${rgb[2]}` : null; }
	if (token.startsWith('bg#')) { const rgb = parseHex(token.slice(2)); return rgb ? `48;2;${rgb[0]};${rgb[1]};${rgb[2]}` : null; }
	if (token.startsWith('rgb(')) { const rgb = parseRgb(token); return rgb ? `38;2;${rgb[0]};${rgb[1]};${rgb[2]}` : null; }
	if (token.startsWith('bgRgb(')) { const rgb = parseRgb(token.slice(2)); return rgb ? `48;2;${rgb[0]};${rgb[1]};${rgb[2]}` : null; }
	if (token.startsWith('ansi256(')) { const n = parseAnsi256(token); return n !== null ? `38;5;${n}` : null; }
	if (token.startsWith('bgAnsi256(')) { const n = parseAnsi256(token.slice(2)); return n !== null ? `48;5;${n}` : null; }
	return null;
}

export function getAnsiOpen(el: TuiElement): string {
	const style = el.getAttribute('data-style');
	if (!style) return '';

	const codes: string[] = [];
	for (const part of style.split(';')) {
		const t = part.trim();
		if (!t) continue;
		const code = resolveStyleToken(t);
		if (code) codes.push(code);
	}

	return codes.length > 0 ? `${CSI}${codes.join(';')}m` : '';
}

// --- Simple tree-walk render (sets position mappings) ---

export function renderTree(root: TuiNode, cols: number, rows: number): string {
	const lines: string[] = [];
	let currentLine = '';
	let currentCol = 0;
	let currentLineIdx = 0;

	function walk(node: TuiNode) {
		if (node.nodeType === COMMENT_NODE) return;

		if (node.nodeType === TEXT_NODE) {
			const textNode = node as TuiText;
			const text = textNode._value;
			textNode._line = currentLineIdx;
			textNode._col = currentCol;
			textNode._len = text.length;
			currentLine += text;
			currentCol += text.length;
			return;
		}

		if (node.nodeType === ELEMENT_NODE) {
			const el = node as TuiElement;
			const tag = el.tagName.toLowerCase();
			const ansiOpen = getAnsiOpen(el);
			const ansiClose = ansiOpen ? `${CSI}0m` : '';

			if (ansiOpen) currentLine += ansiOpen;

			const isBlock = tag === 'div' || tag === 'section' || tag === 'article';
			if (isBlock && currentLine.length > 0) {
				lines.push(currentLine);
				currentLine = '';
				currentCol = 0;
				currentLineIdx++;
			}

			for (const child of node.childNodes) walk(child);
			if (ansiClose) currentLine += ansiClose;

			if (isBlock) {
				lines.push(currentLine);
				currentLine = '';
				currentCol = 0;
				currentLineIdx++;
			}
			return;
		}

		for (const child of node.childNodes) walk(child);
	}

	walk(root);
	if (currentLine) lines.push(currentLine);

	let output = `${CSI}H`;
	for (let i = 0; i < Math.min(lines.length, rows); i++) {
		output += `${lines[i].slice(0, cols)}${CSI}K\r\n`;
	}
	for (let i = lines.length; i < rows; i++) {
		output += `${CSI}K\r\n`;
	}

	return output;
}

// --- Mutation render (direct ANSI for one text node) ---

export function renderTextMutation(node: TuiText, cols: number): string | null {
	if (node._line < 0) return null;

	const line = node._line;
	const col = node._col;
	const newText = node._value;

	let output = `${CSI}${line + 1};${col + 1}H`;
	const restOfLine = collectRestOfLine(node);
	output += `${newText}${restOfLine}${CSI}K`;
	return output;
}

function collectRestOfLine(node: TuiText): string {
	let result = '';
	let current: TuiNode | null = node.nextSibling;

	while (current) {
		if (current.nodeType === TEXT_NODE) {
			result += (current as TuiText)._value;
		} else if (current.nodeType === ELEMENT_NODE) {
			const el = current as TuiElement;
			const ansiOpen = getAnsiOpen(el);
			const ansiClose = ansiOpen ? `${CSI}0m` : '';
			if (ansiOpen) result += ansiOpen;
			result += collectTextContent(current);
			if (ansiClose) result += ansiClose;
		}
		current = current.nextSibling;
	}

	if (node.parentNode && node.parentNode.nodeType === ELEMENT_NODE) {
		let parentSibling: TuiNode | null = node.parentNode.nextSibling;
		while (parentSibling) {
			if (parentSibling.nodeType === TEXT_NODE) {
				result += (parentSibling as TuiText)._value;
			} else if (parentSibling.nodeType === ELEMENT_NODE) {
				const el = parentSibling as TuiElement;
				const ansiOpen = getAnsiOpen(el);
				const ansiClose = ansiOpen ? `${CSI}0m` : '';
				if (ansiOpen) result += ansiOpen;
				result += collectTextContent(parentSibling);
				if (ansiClose) result += ansiClose;
			}
			parentSibling = parentSibling.nextSibling;
		}
	}

	return result;
}

function collectTextContent(node: TuiNode): string {
	if (node.nodeType === TEXT_NODE) return (node as TuiText)._value;
	if (node.nodeType === COMMENT_NODE) return '';
	let r = '';
	for (const child of node.childNodes) r += collectTextContent(child);
	return r;
}

// --- Reactive renderer ---

export interface ReactiveRenderer {
	fullRender: () => string;
	start: (writeFn: (s: string) => void) => void;
	stop: () => void;
	refresh: () => string;
}

export function createReactiveRenderer(root: TuiNode, cols: number, rows: number): ReactiveRenderer {
	let writeFn: ((s: string) => void) | null = null;

	function fullRender(): string {
		return renderTree(root, cols, rows);
	}

	function start(fn: (s: string) => void) {
		writeFn = fn;
		setMutationCallback((node, _old, _new) => {
			if (!writeFn) return;
			const ansi = renderTextMutation(node, cols);
			if (ansi) writeFn(ansi);
			else writeFn(fullRender());
		});
	}

	function stop() {
		writeFn = null;
		setMutationCallback(null);
	}

	return { fullRender, start, stop, refresh: fullRender };
}

// --- Layout-aware render using Yoga ---

const BORDERS: Record<string, { topLeft: string; top: string; topRight: string; bottomLeft: string; bottom: string; bottomRight: string; left: string; right: string }> = {
	round: { topLeft: '\u256d', top: '\u2500', topRight: '\u256e', bottomLeft: '\u2570', bottom: '\u2500', bottomRight: '\u256f', left: '\u2502', right: '\u2502' },
	single: { topLeft: '\u250c', top: '\u2500', topRight: '\u2510', bottomLeft: '\u2514', bottom: '\u2500', bottomRight: '\u2518', left: '\u2502', right: '\u2502' },
	double: { topLeft: '\u2554', top: '\u2550', topRight: '\u2557', bottomLeft: '\u255a', bottom: '\u2550', bottomRight: '\u255d', left: '\u2551', right: '\u2551' },
	bold: { topLeft: '\u250f', top: '\u2501', topRight: '\u2513', bottomLeft: '\u2517', bottom: '\u2501', bottomRight: '\u251b', left: '\u2503', right: '\u2503' },
};

function borderColorToAnsi(color: string | undefined): string | null {
	if (!color) return null;
	const code = resolveStyleToken(color);
	return code ? `${CSI}${code}m` : null;
}

function drawBorders(
	root: TuiNode, layoutMap: Map<TuiNode, ComputedLayout>,
	grid: string[][], styleGrid: (string | null)[][], cols: number, rows: number,
) {
	function walk(node: TuiNode) {
		if (node.nodeType === ELEMENT_NODE) {
			const el = node as TuiElement;
			const borderAttr = el.getAttribute('data-border');
			const layout = layoutMap.get(el);

			if (borderAttr && layout) {
				const [styleName, colorName] = borderAttr.split(':');
				const box = BORDERS[styleName] ?? BORDERS.round;
				const ansi = borderColorToAnsi(colorName) || `${ESC}[2m`;
				const { x, y, width, height } = layout;

				function putChar(r: number, c: number, ch: string) {
					if (r >= 0 && r < rows && c >= 0 && c < cols) {
						grid[r][c] = ch;
						styleGrid[r][c] = ansi;
					}
				}

				putChar(y, x, box.topLeft);
				for (let c = x + 1; c < x + width - 1; c++) putChar(y, c, box.top);
				putChar(y, x + width - 1, box.topRight);
				putChar(y + height - 1, x, box.bottomLeft);
				for (let c = x + 1; c < x + width - 1; c++) putChar(y + height - 1, c, box.bottom);
				putChar(y + height - 1, x + width - 1, box.bottomRight);
				for (let r = y + 1; r < y + height - 1; r++) {
					putChar(r, x, box.left);
					putChar(r, x + width - 1, box.right);
				}
			}

			for (const child of el.childNodes) walk(child);
		} else if (node.nodeType !== COMMENT_NODE && node.nodeType !== TEXT_NODE) {
			for (const child of node.childNodes) walk(child);
		}
	}
	walk(root);
}

function renderGrid(root: TuiNode, layoutMap: Map<TuiNode, ComputedLayout>, cols: number, rows: number): string {
	const grid: string[][] = [];
	const styleGrid: (string | null)[][] = [];
	for (let r = 0; r < rows; r++) {
		grid[r] = new Array(cols).fill(' ');
		styleGrid[r] = new Array(cols).fill(null);
	}

	function placeNode(node: TuiNode, inheritedStyle: string | null = null) {
		if (node.nodeType === COMMENT_NODE) return;

		if (node.nodeType === ELEMENT_NODE) {
			const el = node as TuiElement;
			const layout = layoutMap.get(el);
			const ownStyle = getAnsiOpen(el);
			const activeStyle = ownStyle || inheritedStyle;

			if (!layout) {
				for (const child of node.childNodes) placeNode(child, activeStyle);
				return;
			}
			const l = layout;

			if (isLeafElement(el)) {
				const maxRow = l.y + l.height;
				const maxCol = l.x + l.width;
				let row = l.y;
				let col = l.x;

				function placeText(text: string, textStyle: string | null) {
					for (let i = 0; i < text.length; i++) {
						if (row >= maxRow) return;
						if (text[i] === '\n') { row++; col = l.x; continue; }
						if (col >= maxCol) continue;
						if (row >= 0 && row < rows && col >= 0 && col < cols) {
							grid[row][col] = text[i];
							if (textStyle) styleGrid[row][col] = textStyle;
						}
						col++;
					}
				}

				function walkLeaf(n: TuiNode, leafStyle: string | null) {
					if (n.nodeType === TEXT_NODE) placeText((n as TuiText)._value, leafStyle);
					else if (n.nodeType === ELEMENT_NODE) {
						const childStyle = getAnsiOpen(n as TuiElement) || leafStyle;
						for (const c of n.childNodes) walkLeaf(c, childStyle);
					} else if (n.nodeType !== COMMENT_NODE) {
						for (const c of n.childNodes) walkLeaf(c, leafStyle);
					}
				}

				walkLeaf(el, activeStyle);
			} else {
				for (const child of el.childNodes) placeNode(child, activeStyle);
			}
			return;
		}

		for (const child of node.childNodes) placeNode(child, inheritedStyle);
	}

	placeNode(root);
	drawBorders(root, layoutMap, grid, styleGrid, cols, rows);

	let output = `${CSI}H`;
	for (let r = 0; r < rows; r++) {
		let line = '';
		let currentStyle: string | null = null;
		for (let c = 0; c < cols; c++) {
			const style = styleGrid[r][c];
			if (style !== currentStyle) {
				if (currentStyle) line += `${CSI}0m`;
				if (style) line += style;
				currentStyle = style;
			}
			line += grid[r][c];
		}
		if (currentStyle) line += `${CSI}0m`;
		line = line.replace(/\s+$/, '');
		output += `${line}${CSI}K\r\n`;
	}

	return output;
}

export function renderWithLayout(root: TuiNode, cols: number, rows: number): string {
	const layoutMap = computeLayout(root, cols, rows);
	return renderGrid(root, layoutMap, cols, rows);
}

export interface LayoutRenderer {
	render: () => string;
	recompute: () => void;
}

export function createLayoutRenderer(root: TuiNode, cols: number, rows: number): LayoutRenderer {
	let layoutMap = computeLayout(root, cols, rows);
	return {
		render() { return renderGrid(root, layoutMap, cols, rows); },
		recompute() { layoutMap = computeLayout(root, cols, rows); },
	};
}

function isLeafElement(node: TuiNode): boolean {
	for (const child of node.childNodes) {
		if (child.nodeType === ELEMENT_NODE) {
			const tag = (child as TuiElement).tagName;
			if (tag === 'DIV') return false;
			if (!isLeafElement(child)) return false;
		}
		if (child.nodeType === 11 && !isLeafElement(child)) return false;
	}
	return true;
}
