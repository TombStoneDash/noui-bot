#!/bin/sh
set -eu
output_dir=$(mktemp -d "${TMPDIR:-/tmp}/bazaar-sdk-test.XXXXXX")
trap 'rm -rf "$output_dir"' EXIT HUP INT TERM
./node_modules/.bin/tsc --target es2020 --module commonjs --moduleResolution node --esModuleInterop --skipLibCheck --outDir "$output_dir" src/index.ts src/index.test.ts
node --test "$output_dir/index.test.js"
