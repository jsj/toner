#!/usr/bin/env bash
# Generate all README PNG assets from toner demo components.
# Pipeline: bun render -> ANSI -> aha (HTML) -> Chrome headless (PNG @ 2x)
#
# Usage:
#   bash .readme/record.sh            # all demos
#   bash .readme/record.sh select     # single demo

set -euo pipefail
cd "$(dirname "$0")/.."

DEMOS=(box-layout input-demo select-demo spinner-demo progress-demo tabs-demo hero-demo)

if [ $# -gt 0 ]; then
	echo "Recording $1..."
	bun run .readme/demos/ansi-to-png.ts "$1"
else
	for demo in "${DEMOS[@]}"; do
		echo "Recording $demo..."
		bun run .readme/demos/ansi-to-png.ts "$demo"
	done
	echo ""
	echo "All assets:"
	ls -la .readme/*.png
fi
