// Convert ANSI output from a toner demo to a styled PNG.
// Usage: bun run .readme/demos/ansi-to-png.ts <component-name> [output.png]
//
// Pipeline: render component -> ANSI -> aha (HTML) -> wrap in dark page -> screenshot

const name = process.argv[2];
const defaultName = name.replace(/-demo$/, '');
const outPath = process.argv[3] || `.readme/${defaultName}.png`;
if (!name) {
	console.error('Usage: bun run ansi-to-png.ts <component-name> [output.png]');
	process.exit(1);
}

// 1. Render ANSI
const render = Bun.spawn(['bun', 'run', `.readme/demos/render-static.ts`, name], {
	stdout: 'pipe', stderr: 'pipe',
});
const ansi = await new Response(render.stdout).text();
await render.exited;

// 2. Convert to HTML via aha
const aha = Bun.spawn(['aha', '--no-header'], {
	stdin: new Response(ansi).body!,
	stdout: 'pipe', stderr: 'pipe',
});
const htmlBody = await new Response(aha.stdout).text();
await aha.exited;

// 3. Strip empty trailing lines and blank rows from 24-row grid
const trimmed = htmlBody
	.split('\n')
	.reduceRight<string[]>((acc, line) => {
		if (acc.length === 0 && line.trim() === '') return acc;
		acc.unshift(line);
		return acc;
	}, [])
	.join('\n');

// 4. Wrap in dark-themed HTML
const html = `<!DOCTYPE html>
<html>
<head>
<style>
  body {
    background: #1e1e1e;
    color: #cdd6f4;
    font-family: 'SF Mono', 'Cascadia Code', 'JetBrains Mono', 'Fira Code', Menlo, Consolas, monospace;
    font-size: 14px;
    line-height: 1.4;
    padding: 24px 28px;
    margin: 0;
    white-space: pre;
    -webkit-font-smoothing: antialiased;
  }
  span[style*="color:green"] { color: #a6e3a1 !important; }
  span[style*="color:teal"] { color: #89dceb !important; }
  span[style*="color:olive"] { color: #f9e2af !important; }
  span[style*="color:red"] { color: #f38ba8 !important; }
  span[style*="color:blue"] { color: #89b4fa !important; }
  span[style*="color:purple"] { color: #cba6f7 !important; }
  span[style*="color:gray"] { color: #6c7086 !important; }
  span[style*="color:dimgray"] { color: #9399b2 !important; }
  span[style*="font-weight:bold"] { color: #cdd6f4; }
  span[style*="color:white"] { color: #cdd6f4 !important; }
  span[style*="text-decoration:line-through"] { opacity: 0.7; }
  /* aha renders dim as color:dimgray, inverse as background swap */
</style>
</head>
<body>${trimmed}</body>
</html>`;

const tmpHtml = `/tmp/toner-screenshot-${name}.html`;
await Bun.write(tmpHtml, html);

// 5. Screenshot with headless Chrome/Chromium
const chromePaths = [
	'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
	'/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
	'/Applications/Chromium.app/Contents/MacOS/Chromium',
	'/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
];

let chromeBin: string | null = null;
for (const p of chromePaths) {
	try { if (require('fs').existsSync(p)) { chromeBin = p; break; } } catch {}
}

if (!chromeBin) {
	console.error('No Chrome/Chromium found. Install Google Chrome or set CHROME_PATH.');
	console.log(`HTML saved to: ${tmpHtml}`);
	process.exit(1);
}

const fs = require('fs');
const path = require('path');
const absOut = path.resolve(outPath);

const screenshot = Bun.spawn([
	chromeBin,
	'--headless=new',
	'--disable-gpu',
	'--no-sandbox',
	`--screenshot=${absOut}`,
	`--window-size=700,${Math.max(100, trimmed.split('\n').length * 22 + 60)}`,
	'--force-device-scale-factor=2',
	'--default-background-color=001e1e1e',
	`file://${tmpHtml}`,
], { stdout: 'pipe', stderr: 'pipe' });

const stderrText = await new Response(screenshot.stderr).text();
await screenshot.exited;

if (fs.existsSync(absOut)) {
	const size = fs.statSync(absOut).size;
	console.log(`${outPath} (${(size / 1024).toFixed(1)}KB)`);
} else {
	console.error(`Failed to create ${absOut}`);
	if (stderrText) console.error(stderrText.slice(0, 500));
	console.log(`HTML saved to: ${tmpHtml}`);
	process.exit(1);
}
