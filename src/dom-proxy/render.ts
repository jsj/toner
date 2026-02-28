import {
	COMMENT_NODE,
	ELEMENT_NODE,
	TEXT_NODE,
	type TuiComment,
	type TuiElement,
	type TuiNode,
	type TuiText,
} from './nodes.js';

export function collectText(node: TuiNode): string {
	if (node.nodeType === TEXT_NODE) return (node as TuiText).nodeValue;
	if (node.nodeType === COMMENT_NODE) return '';
	let result = '';
	for (const child of node.childNodes) result += collectText(child);
	return result;
}

export function renderToTerminal(root: TuiNode): string {
	return collectText(root);
}

export function debugTree(node: TuiNode, indent: number = 0): string {
	const pad = '  '.repeat(indent);
	if (node.nodeType === TEXT_NODE) {
		return `${pad}TEXT: "${(node as TuiText).nodeValue}"\n`;
	}
	if (node.nodeType === COMMENT_NODE) {
		return `${pad}COMMENT: "${(node as TuiComment).data}"\n`;
	}
	if (node.nodeType === ELEMENT_NODE) {
		const el = node as TuiElement;
		let s = `${pad}<${el.tagName.toLowerCase()}>\n`;
		for (const child of el.childNodes) s += debugTree(child, indent + 1);
		s += `${pad}</${el.tagName.toLowerCase()}>\n`;
		return s;
	}
	let s = `${pad}#fragment\n`;
	for (const child of node.childNodes) s += debugTree(child, indent + 1);
	return s;
}
