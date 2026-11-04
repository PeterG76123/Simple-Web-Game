#!/bin/sh
# Checks every level, one difficulty-and-group per process, four at a time.
# Prints any failures and a final verdict. Usage: sh tools/check-all.sh
cd "$(dirname "$0")/.."
out=$(mktemp -d)
for t in 0 1 2; do for g in 0 1 2 3 4; do echo "$t $g"; done; done | \
  xargs -P 4 -n 2 sh -c 'node --max-old-space-size=3000 tools/check-levels.js --tier=$0 --group=$1 > '"$out"'/$0-$1.log 2>&1'
grep -h "FAIL" "$out"/*.log
if grep -q "FAIL\|Error" "$out"/*.log; then echo "Some levels failed"; exit 1; else echo "All levels OK"; fi
