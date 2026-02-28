// Debug logging — writes to /tmp/toner-debug.log.
// Enable: TONER_DEBUG=1

import { appendFileSync } from 'node:fs';

const LOG_FILE = '/tmp/toner-debug.log';
const ENABLED = process.env.TONER_DEBUG === '1';

export function debug(...args: any[]) {
	if (!ENABLED) return;
	const line = args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a, null, 2))).join(' ');
	appendFileSync(LOG_FILE, `[${new Date().toISOString()}] ${line}\n`);
}

export function debugTree(node: any, depth = 0): string {
	if (!ENABLED) return '';
	const pad = '  '.repeat(depth);
	let out = '';
	if (node.nodeType === 1) {
		const attrs = [...node.attributes.entries()]
			.map(([k, v]: [string, string]) => `${k}=${JSON.stringify(v)}`)
			.join(' ');
		out += `${pad}<${node.tagName}> ${attrs}\n`;
	} else if (node.nodeType === 3) {
		const text = node._value;
		if (text.trim()) out += `${pad}TEXT: ${JSON.stringify(text)}\n`;
	} else if (node.nodeType === 11) {
		out += `${pad}FRAG\n`;
	}
	for (const child of node.childNodes) out += debugTree(child, depth + 1);
	return out;
}

export function debugLayout(layoutMap: Map<any, any>): string {
	if (!ENABLED) return '';
	let out = `Layout map (${layoutMap.size} entries):\n`;
	for (const [node, layout] of layoutMap) {
		if (node.nodeType === 1) {
			const tag = node.tagName;
			const style = node.getAttribute('data-style') || '';
			const lstr = node.getAttribute('data-layout') || '';
			out += `  <${tag}> style="${style}" layout="${lstr}" => ${JSON.stringify(layout)}\n`;
		}
	}
	return out;
}
