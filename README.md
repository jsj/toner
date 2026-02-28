<div align="center">
  <br>
  <h1>🖨️ toner</h1>
  <p><strong>Svelte for CLIs.</strong> Build interactive command-line apps using components.</p>
  <br>
</div>

Toner provides the same component-based UI building experience that Svelte offers in the browser, but for command-line apps. It uses [Yoga](https://github.com/facebook/yoga) to build Flexbox layouts in the terminal. If you already know Svelte, you already know Toner.

Since Toner runs Svelte 5's compiled output, all Svelte features work: `$state`, `$derived`, `$effect`, snippets, bindings, component composition. Only Toner-specific APIs are documented here.

## Install

```sh
bun add toner svelte
```

## Usage

```svelte
<!-- Counter.svelte -->
<script lang="ts">
  let count = $state(0);

  $effect(() => {
    const timer = setInterval(() => count++, 100);
    return () => clearInterval(timer);
  });
</script>

<span data-style="green">{count} tests passed</span>
```

```ts
import { render } from 'toner';
import Counter from './Counter.svelte';

render(Counter);
```

## How it works

Svelte's compiler emits DOM calls (`createElement`, `createTextNode`, `node.nodeValue = ...`). Toner provides a minimal DOM proxy that satisfies those calls with a lightweight tree. That tree is laid out with Yoga and rendered to ANSI.

When state changes, Svelte's compiled effects set `node.nodeValue` directly -- Toner intercepts these mutations and can emit ANSI for just the changed region, without walking the tree or diffing.

| | **Ink** (React) | **pi-tui** (Imperative TS) | **Toner** (Svelte) |
|---|---|---|---|
| UI model | JSX + React reconciler | `render(width): string[]` | `.svelte` components |
| Layout | Yoga (per reconcile) | Manual (component returns lines) | Yoga (cached, recomputed on structural change) |
| Update strategy | Reconciler diffs fiber tree -> full re-render | Line-level diff of previous vs current output | Mutation-driven: text node setter -> ANSI for that region |
| Reactivity | `useState`/`useEffect` hooks | Imperative `requestRender()` | Svelte 5 runes (`$state`, `$derived`, `$effect`) |
| Dependencies | react, react-reconciler, scheduler, yoga, chalk, ~20 more | chalk, marked, yoga (lean) | svelte, yoga (that's it) |

## Components

### `<Box>`

Flexbox container. All layout props map to Yoga.

```svelte
<script>
  import { Box } from 'toner/components/Box.svelte';
</script>

<Box flexDirection="row" gap={1} padding={1} borderStyle="round">
  <Box flexGrow={1}><span>Left</span></Box>
  <Box><span>Right</span></Box>
</Box>
```

**Props:** `flexDirection`, `flexGrow`, `flexShrink`, `justifyContent`, `alignItems`, `width`, `height`, `minWidth`, `minHeight`, `padding`, `paddingX`, `paddingY`, `margin`, `marginX`, `marginY`, `marginTop`, `gap`, `display`, `overflow`, `borderStyle` (`round` | `single` | `double` | `bold`), `borderColor`, `style` (ANSI style string).

### `<Text>`

Inline styled text.

```svelte
<script>
  import Text from 'toner/components/Text.svelte';
</script>

<Text style="bold;cyan">Hello world</Text>
```

### `<Input>`

Text input with cursor, multiline, paste collapsing.

```svelte
<script>
  import Input from 'toner/components/Input.svelte';
</script>

<Input placeholder="Type here..." maxHeight={4} />
```

**Exports:** `insert()`, `backspace()`, `deleteForward()`, `moveLeft()`, `moveRight()`, `moveUp()`, `moveDown()`, `wordLeft()`, `wordRight()`, `home()`, `end()`, `clear()`, `paste()`, `newline()`, `wordBackspace()`, `killToEnd()`, `clearLine()`, `getExpandedValue()`, `isAtFirstLine()`, `isAtLastLine()`.

### `<Select>`

Scrollable selection list with keyboard navigation.

```svelte
<script>
  import Select from 'toner/components/Select.svelte';
  let items = ['Option A', 'Option B', 'Option C'];
</script>

<Select {items} onSelect={(item, i) => console.log(item)} />
```

### `<List>`

Virtualized scrollable list. Only visible items are rendered.

```svelte
<script>
  import List from 'toner/components/List.svelte';
  let logs = $state([]);
</script>

<List items={logs} height={10} follow>
  {#snippet children(item, index)}
    <span>{item}</span>
  {/snippet}
</List>
```

### `<Spinner>`

Braille spinner. All spinners share one global clock so they stay in phase.

```svelte
<script>
  import Spinner from 'toner/components/Spinner.svelte';
</script>

<Spinner style="yellow" label="Loading..." />
```

### `<ProgressBar>`

```svelte
<script>
  import ProgressBar from 'toner/components/ProgressBar.svelte';
</script>

<ProgressBar value={42} max={100} width={40} style="green" />
```

### `<Tabs>`

```svelte
<script>
  import Tabs from 'toner/components/Tabs.svelte';
</script>

<Tabs items={['Files', 'Search', 'Settings']} />
```

### `<Stream>`

Append-only text stream (useful for LLM token streaming).

```svelte
<script>
  import Stream from 'toner/components/Stream.svelte';
</script>

<Stream bind:text />
```

### `<Overlay>`

Padded container with optional title, for dialogs/modals.

## Styles

Toner uses `data-style` attributes for ANSI styling. Combine with `;`:

```svelte
<span data-style="bold;red">Error</span>
<span data-style="#ff6600">Hex color</span>
<span data-style="bgBlue;white">Inverted</span>
```

**Supported:** `bold`, `dim`, `italic`, `underline`, `inverse`, `strikethrough`, named colors (`red`, `green`, `blue`, `cyan`, `magenta`, `yellow`, `white`, `gray`), bright variants (`redBright`, etc.), background variants (`bgRed`, etc.), hex (`#rrggbb`), `rgb(r,g,b)`, `ansi256(n)`.

## Render API

```ts
import { render } from 'toner';

const app = render(MyComponent, { someProp: 'value' });

app.component;        // Svelte component instance
app.target;           // Root TuiElement
app.renderToString(); // ANSI string (80x24 default)
app.layout(80, 24);   // Cached Yoga layout renderer
app.unmount();        // Clean up
```

## Input handling

```ts
import { parseKeys, enterRawMode, exitRawMode } from 'toner';

enterRawMode();
const events = parseKeys(stdinBytes);
// events: { type: 'char', char: 'a' }, { type: 'enter' }, { type: 'ctrl_c' }, ...
exitRawMode();
```

## Focus system

Stack-based focus for routing keystrokes to the right component.

```ts
import { registerFocusable, focus, dispatch, pushFocus, popFocus } from 'toner';

registerFocusable('input', (event) => { /* handle key */ return true; });
registerFocusable('modal', (event) => { /* handle key */ return true; });

focus('input');       // input gets keystrokes
pushFocus('modal');   // modal on top, gets keystrokes
popFocus();           // back to input
```

## Render loop

Event-driven, zero CPU when idle. Uses DEC 2026 synchronized output to prevent tearing.

```ts
import { createRenderLoop } from 'toner';

const loop = createRenderLoop(root, cols, rows, (frame) => process.stdout.write(frame));
loop.start();   // listens for DOM mutations, schedules frames
loop.resize(newCols, newRows);
loop.stop();
```

## Syntax highlighting

```ts
import { highlightSync } from 'toner';

const lines = highlightSync('const x = 42;', 'typescript');
// Returns array of ANSI-colored strings
```

## Benchmarks

The `bench/` directory contains a headless keystroke-to-render latency benchmark. It measures Toner's own render path (state mutation -> Svelte effect flush -> ANSI output). It is not a comparative benchmark against other frameworks.

```sh
bun run bench           # full results
bun run bench:ci        # pass/fail with p99 threshold
bun run bench:json      # JSON output
```

## Development

```sh
bun install
bun test                # 119 tests
bun run dev             # interactive demo
bun run bench           # keystroke latency benchmark
bun run typecheck
bun run lint
bun run check           # lint + format + test
```

## License

MIT - James Jackson
