// Yoga layout integration — maps TuiElement tree to Yoga nodes,
// computes flexbox layout, stores computed positions.

import Yoga, { Align, Direction, Display, Edge, FlexDirection, Justify, type Node as YogaNode } from 'yoga-layout';

import {
	COMMENT_NODE,
	DOCUMENT_FRAGMENT_NODE,
	ELEMENT_NODE,
	TEXT_NODE,
	type TuiElement,
	type TuiNode,
	type TuiText,
} from '../dom-proxy/nodes.js';

export interface ComputedLayout {
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface LayoutProps {
	flexDirection?: 'row' | 'column';
	justifyContent?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly';
	alignItems?: 'flex-start' | 'center' | 'flex-end' | 'stretch';
	flexGrow?: number;
	flexShrink?: number;
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
	overflow?: 'visible' | 'hidden' | 'scroll';
	display?: 'flex' | 'none';
	border?: boolean;
}

const FLEX_DIR_MAP: Record<string, FlexDirection> = {
	row: FlexDirection.Row,
	column: FlexDirection.Column,
};

const JUSTIFY_MAP: Record<string, Justify> = {
	'flex-start': Justify.FlexStart,
	center: Justify.Center,
	'flex-end': Justify.FlexEnd,
	'space-between': Justify.SpaceBetween,
	'space-around': Justify.SpaceAround,
	'space-evenly': Justify.SpaceEvenly,
};

const ALIGN_MAP: Record<string, Align> = {
	'flex-start': Align.FlexStart,
	center: Align.Center,
	'flex-end': Align.FlexEnd,
	stretch: Align.Stretch,
};

function measureTextWidth(text: string): number {
	let max = 0;
	let current = 0;
	for (let i = 0; i < text.length; i++) {
		if (text[i] === '\n') {
			max = Math.max(max, current);
			current = 0;
		} else {
			current++;
		}
	}
	return Math.max(max, current, 1);
}

function measureTextHeight(text: string): number {
	let lines = 1;
	for (let i = 0; i < text.length; i++) {
		if (text[i] === '\n') lines++;
	}
	return lines;
}

function collectText(node: TuiNode): string {
	if (node.nodeType === TEXT_NODE) return (node as TuiText)._value;
	if (node.nodeType === COMMENT_NODE) return '';
	let r = '';
	for (const child of node.childNodes) r += collectText(child);
	return r;
}

function isLeaf(node: TuiNode): boolean {
	for (const child of node.childNodes) {
		if (child.nodeType === ELEMENT_NODE) return false;
		if (child.nodeType === DOCUMENT_FRAGMENT_NODE && !isLeaf(child)) return false;
	}
	return true;
}

function parseLayoutProps(el: TuiElement): LayoutProps {
	const props: LayoutProps = {};
	const layout = el.getAttribute('data-layout');
	if (!layout) return props;

	for (const pair of layout.split(';')) {
		const [key, val] = pair.split(':').map((s) => s.trim());
		if (!key || !val) continue;

		switch (key) {
			case 'flex-direction':
				props.flexDirection = val as any;
				break;
			case 'justify-content':
				props.justifyContent = val as any;
				break;
			case 'align-items':
				props.alignItems = val as any;
				break;
			case 'flex-grow':
				props.flexGrow = Number(val);
				break;
			case 'flex-shrink':
				props.flexShrink = Number(val);
				break;
			case 'width':
				props.width = val.endsWith('%') ? val : Number(val);
				break;
			case 'height':
				props.height = val.endsWith('%') ? val : Number(val);
				break;
			case 'min-width':
				props.minWidth = Number(val);
				break;
			case 'min-height':
				props.minHeight = Number(val);
				break;
			case 'padding':
				props.padding = Number(val);
				break;
			case 'padding-x':
				props.paddingX = Number(val);
				break;
			case 'padding-y':
				props.paddingY = Number(val);
				break;
			case 'margin':
				props.margin = Number(val);
				break;
			case 'margin-x':
				props.marginX = Number(val);
				break;
			case 'margin-y':
				props.marginY = Number(val);
				break;
			case 'margin-top':
				props.marginTop = Number(val);
				break;
			case 'gap':
				props.gap = Number(val);
				break;
			case 'display':
				props.display = val as any;
				break;
			case 'border':
				props.border = true;
				break;
		}
	}
	return props;
}

function applyProps(yogaNode: YogaNode, props: LayoutProps) {
	if (props.flexDirection) yogaNode.setFlexDirection(FLEX_DIR_MAP[props.flexDirection] ?? FlexDirection.Column);
	if (props.justifyContent) yogaNode.setJustifyContent(JUSTIFY_MAP[props.justifyContent] ?? Justify.FlexStart);
	if (props.alignItems) yogaNode.setAlignItems(ALIGN_MAP[props.alignItems] ?? Align.Stretch);
	if (props.flexGrow !== undefined) yogaNode.setFlexGrow(props.flexGrow);
	if (props.flexShrink !== undefined) yogaNode.setFlexShrink(props.flexShrink);

	if (props.width !== undefined) {
		if (typeof props.width === 'string' && props.width.endsWith('%')) {
			yogaNode.setWidthPercent(parseFloat(props.width));
		} else {
			yogaNode.setWidth(Number(props.width));
		}
	}
	if (props.height !== undefined) {
		if (typeof props.height === 'string' && props.height.endsWith('%')) {
			yogaNode.setHeightPercent(parseFloat(props.height));
		} else {
			yogaNode.setHeight(Number(props.height));
		}
	}
	if (props.minWidth !== undefined) yogaNode.setMinWidth(props.minWidth);
	if (props.minHeight !== undefined) yogaNode.setMinHeight(props.minHeight);

	if (props.padding !== undefined) yogaNode.setPadding(Edge.All, props.padding);
	if (props.paddingX !== undefined) yogaNode.setPadding(Edge.Horizontal, props.paddingX);
	if (props.paddingY !== undefined) yogaNode.setPadding(Edge.Vertical, props.paddingY);

	if (props.margin !== undefined) yogaNode.setMargin(Edge.All, props.margin);
	if (props.marginX !== undefined) yogaNode.setMargin(Edge.Horizontal, props.marginX);
	if (props.marginY !== undefined) yogaNode.setMargin(Edge.Vertical, props.marginY);
	if (props.marginTop !== undefined) yogaNode.setMargin(Edge.Top, props.marginTop);

	if (props.gap !== undefined) yogaNode.setGap(Edge.All as any, props.gap);
	if (props.display === 'none') yogaNode.setDisplay(Display.None);

	if (props.border) {
		yogaNode.setBorder(Edge.Top, 1);
		yogaNode.setBorder(Edge.Bottom, 1);
		yogaNode.setBorder(Edge.Left, 1);
		yogaNode.setBorder(Edge.Right, 1);
	}
}

export function computeLayout(root: TuiNode, termCols: number, termRows: number): Map<TuiNode, ComputedLayout> {
	const layoutMap = new Map<TuiNode, ComputedLayout>();
	const yogaNodes: [TuiNode, YogaNode][] = [];

	function buildYogaTree(node: TuiNode, parentYoga: YogaNode | null): YogaNode | null {
		if (node.nodeType === COMMENT_NODE) return null;
		if (node.nodeType === TEXT_NODE) return null;

		if (node.nodeType === ELEMENT_NODE) {
			const el = node as TuiElement;
			if (el.tagName === 'SPAN') return null;

			const yogaNode = Yoga.Node.create();
			yogaNode.setFlexDirection(FlexDirection.Column);

			const props = parseLayoutProps(el);
			applyProps(yogaNode, props);

			if (isLeaf(el)) {
				yogaNode.setMeasureFunc((width: number, widthMode: number, _height: number, _heightMode: number) => {
					const text = collectText(el);
					const textW = measureTextWidth(text);
					const textH = measureTextHeight(text);
					const effectiveWidth = widthMode !== 0 && width < textW ? width : textW;
					const wrappedHeight = widthMode !== 0 && width < textW ? Math.ceil(textW / Math.max(width, 1)) : textH;
					return { width: effectiveWidth, height: wrappedHeight };
				});
			}

			if (parentYoga) {
				parentYoga.insertChild(yogaNode, parentYoga.getChildCount());
			}

			yogaNodes.push([el, yogaNode]);

			if (!isLeaf(el)) {
				for (const child of el.childNodes) {
					buildYogaTree(child, yogaNode);
				}
			}

			return yogaNode;
		}

		for (const child of node.childNodes) {
			buildYogaTree(child, parentYoga);
		}
		return null;
	}

	const rootYoga = Yoga.Node.create();
	rootYoga.setWidth(termCols);
	rootYoga.setHeight(termRows);
	rootYoga.setFlexDirection(FlexDirection.Column);

	for (const child of root.childNodes) {
		buildYogaTree(child, rootYoga);
	}

	rootYoga.calculateLayout(termCols, termRows, Direction.LTR);

	for (const [tuiNode, yogaNode] of yogaNodes) {
		let x = Math.round(yogaNode.getComputedLeft());
		let y = Math.round(yogaNode.getComputedTop());

		let parent = yogaNode.getParent();
		while (parent && parent !== rootYoga) {
			x += Math.round(parent.getComputedLeft());
			y += Math.round(parent.getComputedTop());
			parent = parent.getParent();
		}

		layoutMap.set(tuiNode, {
			x,
			y,
			width: Math.round(yogaNode.getComputedWidth()),
			height: Math.round(yogaNode.getComputedHeight()),
		});
	}

	rootYoga.freeRecursive();
	return layoutMap;
}
