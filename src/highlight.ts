// Syntax highlighting -> ANSI escape codes
// Regex-based, zero dependencies.

const ESC = '\x1b[';
const RESET = `${ESC}0m`;
const MAGENTA = `${ESC}35m`;
const YELLOW = `${ESC}33m`;
const GREEN = `${ESC}32m`;
const CYAN = `${ESC}36m`;
const GRAY = `${ESC}90m`;
const BLUE = `${ESC}34m`;

const LANG_MAP: Record<string, string> = {
	js: 'javascript', jsx: 'javascript', mjs: 'javascript', cjs: 'javascript',
	ts: 'typescript', tsx: 'typescript', mts: 'typescript', cts: 'typescript',
	py: 'python', pyw: 'python', rs: 'rust', go: 'go',
	c: 'c', h: 'c', cpp: 'cpp', cc: 'cpp', hpp: 'cpp',
	java: 'java', rb: 'ruby', php: 'php',
	sh: 'bash', bash: 'bash', zsh: 'bash',
	json: 'json', css: 'css', html: 'html', lua: 'lua',
	swift: 'swift', kt: 'kotlin', sql: 'sql',
	toml: 'toml', yaml: 'yaml', yml: 'yaml',
	md: 'markdown', mdx: 'markdown', zig: 'zig',
	svelte: 'svelte', vue: 'vue',
};

const LANG_ALIASES: Record<string, string> = {
	javascript: 'javascript', typescript: 'typescript', python: 'python',
	rust: 'rust', golang: 'go', go: 'go',
	bash: 'bash', shell: 'bash', zsh: 'bash', sh: 'bash',
	json: 'json', css: 'css', html: 'html', ruby: 'ruby', php: 'php',
	java: 'java', kotlin: 'kotlin', swift: 'swift', lua: 'lua',
	sql: 'sql', toml: 'toml', yaml: 'yaml', markdown: 'markdown',
	c: 'c', cpp: 'cpp', 'c++': 'cpp', zig: 'zig', svelte: 'svelte',
};

export function resolveLanguage(hint: string): string | null {
	const lower = hint.toLowerCase().trim();
	return LANG_ALIASES[lower] ?? LANG_MAP[lower] ?? null;
}

const KEYWORDS: Record<string, RegExp> = {
	javascript:
		/\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|import|export|from|default|class|extends|new|this|super|async|await|try|catch|throw|finally|typeof|instanceof|in|of|void|delete|yield)\b/g,
	typescript:
		/\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|import|export|from|default|class|extends|new|this|super|async|await|try|catch|throw|finally|typeof|instanceof|in|of|void|delete|yield|interface|type|enum|implements|declare|namespace|abstract|readonly|as|is|keyof|infer|satisfies)\b/g,
	python:
		/\b(def|class|return|if|elif|else|for|while|import|from|as|try|except|finally|raise|with|yield|lambda|pass|break|continue|and|or|not|in|is|None|True|False|self|async|await|global|nonlocal|assert|del)\b/g,
	rust: /\b(fn|let|mut|const|if|else|for|while|loop|match|return|use|mod|pub|struct|enum|impl|trait|where|self|Self|super|crate|as|in|ref|move|async|await|unsafe|extern|type|static|dyn|break|continue)\b/g,
	go: /\b(func|var|const|return|if|else|for|range|switch|case|break|continue|import|package|type|struct|interface|map|chan|go|defer|select|default|fallthrough|goto)\b/g,
	bash: /\b(if|then|else|elif|fi|for|while|do|done|case|esac|function|return|local|export|source|echo|exit|set|unset|readonly|shift|eval|exec|trap|wait|read|declare|typeset|in)\b/g,
	c: /\b(if|else|for|while|do|switch|case|break|continue|return|typedef|struct|enum|union|const|static|extern|void|int|char|float|double|long|short|unsigned|signed|sizeof|goto|default|volatile|register|auto|inline|restrict)\b/g,
	cpp: /\b(if|else|for|while|do|switch|case|break|continue|return|class|struct|enum|union|const|static|extern|virtual|override|public|private|protected|template|typename|namespace|using|new|delete|throw|try|catch|auto|inline|constexpr|noexcept|nullptr|this|operator|friend|mutable|volatile|sizeof|decltype|static_assert|concept|requires|co_await|co_yield|co_return)\b/g,
	json: /(?!x)x/,
	sql: /\b(SELECT|FROM|WHERE|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|TABLE|INDEX|JOIN|LEFT|RIGHT|INNER|OUTER|ON|AND|OR|NOT|IN|IS|NULL|AS|ORDER|BY|GROUP|HAVING|LIMIT|OFFSET|UNION|ALL|DISTINCT|SET|VALUES|INTO|BETWEEN|LIKE|EXISTS|CASE|WHEN|THEN|ELSE|END|BEGIN|COMMIT|ROLLBACK|GRANT|REVOKE)\b/gi,
	yaml: /(?!x)x/,
	toml: /(?!x)x/,
};

const TYPE_RE = /\b([A-Z][a-zA-Z0-9_]*)\b/g;
const FUNC_CALL_RE = /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g;
const DECORATOR_RE = /@[a-zA-Z_][a-zA-Z0-9_.]*/g;

interface Span { start: number; end: number; color: string; }

function collectSpans(line: string, lang: string): Span[] {
	const spans: Span[] = [];
	const used = new Uint8Array(line.length);

	function addSpan(start: number, end: number, color: string) {
		for (let i = start; i < end; i++) { if (used[i]) return; }
		spans.push({ start, end, color });
		for (let i = start; i < end; i++) used[i] = 1;
	}

	let m: RegExpExecArray | null;

	const lineCommentRe = lang === 'python' || lang === 'bash' || lang === 'yaml' || lang === 'toml'
		? /(#.*)$/gm : /(\/\/.*)$/gm;
	lineCommentRe.lastIndex = 0;
	if ((m = lineCommentRe.exec(line))) addSpan(m.index, m.index + m[0].length, GRAY);

	if (lang === 'sql') {
		const sqlComment = /(--.*$)/gm;
		sqlComment.lastIndex = 0;
		if ((m = sqlComment.exec(line))) addSpan(m.index, m.index + m[0].length, GRAY);
	}

	const stringRe = /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g;
	stringRe.lastIndex = 0;
	while ((m = stringRe.exec(line))) addSpan(m.index, m.index + m[0].length, GREEN);

	if (lang === 'python' || lang === 'typescript' || lang === 'java') {
		DECORATOR_RE.lastIndex = 0;
		while ((m = DECORATOR_RE.exec(line))) addSpan(m.index, m.index + m[0].length, YELLOW);
	}

	const kwRe = KEYWORDS[lang] ??
		/\b(const|let|var|function|return|if|else|for|while|import|export|from|class|interface|type|async|await|try|catch|throw|new|this|super|extends|implements|enum|struct|fn|pub|mod|use|match|impl|trait|def|self|None|True|False|yield|in|of|as|is|not|and|or|with|lambda|raise|pass|break|continue|finally|elif|except)\b/g;
	kwRe.lastIndex = 0;
	while ((m = kwRe.exec(line))) addSpan(m.index, m.index + m[0].length, MAGENTA);

	const numRe = /\b(0x[0-9a-fA-F]+|0b[01]+|0o[0-7]+|\d+\.?\d*(?:e[+-]?\d+)?)\b/g;
	numRe.lastIndex = 0;
	while ((m = numRe.exec(line))) addSpan(m.index, m.index + m[0].length, YELLOW);

	const constRe = /\b(true|false|null|undefined|nil|None|True|False|NaN|Infinity)\b/g;
	constRe.lastIndex = 0;
	while ((m = constRe.exec(line))) addSpan(m.index, m.index + m[0].length, YELLOW);

	if (lang !== 'json' && lang !== 'yaml' && lang !== 'toml' && lang !== 'bash') {
		TYPE_RE.lastIndex = 0;
		while ((m = TYPE_RE.exec(line))) addSpan(m.index, m.index + m[0].length, CYAN);
	}

	if (lang !== 'json' && lang !== 'yaml' && lang !== 'toml') {
		FUNC_CALL_RE.lastIndex = 0;
		while ((m = FUNC_CALL_RE.exec(line))) addSpan(m.index, m.index + m[1].length, BLUE);
	}

	if (lang === 'json' || lang === 'yaml' || lang === 'toml') {
		const keyRe = /^(\s*"[^"]+"\s*):/gm;
		keyRe.lastIndex = 0;
		while ((m = keyRe.exec(line))) addSpan(m.index, m.index + m[1].length, CYAN);
	}

	return spans.sort((a, b) => a.start - b.start);
}

function applySpans(line: string, spans: Span[]): string {
	if (spans.length === 0) return line;
	let result = '';
	let pos = 0;
	for (const span of spans) {
		if (span.start > pos) result += line.slice(pos, span.start);
		result += span.color + line.slice(span.start, span.end) + RESET;
		pos = span.end;
	}
	if (pos < line.length) result += line.slice(pos);
	return result;
}

export function highlightSync(code: string, language: string): string[] {
	const lang = resolveLanguage(language);
	if (!lang) return code.split('\n');
	return code.split('\n').map((line) => {
		const spans = collectSpans(line, lang);
		return spans.length > 0 ? applySpans(line, spans) : line;
	});
}

export async function highlight(code: string, language: string): Promise<string[]> {
	return highlightSync(code, language);
}

export function prewarm(_languages?: string[]): void {}
