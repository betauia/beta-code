#!/bin/sh
set -eu

rm -f /sandbox/main /sandbox/results.json /sandbox/compile_stderr.txt /sandbox/run_stderr.txt
mkdir -p /sandbox/outs

# Compile
if ! g++ /sandbox/main.cpp -std=c++20 -O2 -pipe -o /sandbox/main 2> /sandbox/compile_stderr.txt; then
  printf '{ "verdict": "CE" }\n' > /sandbox/results.json
  exit 0
fi

# Find tests
set +e
tests=$(ls /sandbox/tests/*.in 2>/dev/null)
set -e

if [ -z "${tests:-}" ]; then
  printf '{ "verdict": "NO_TESTS" }\n' > /sandbox/results.json
  exit 0
fi

json='{"verdict":"OK","tests":['
first=1

for infile in $tests; do
  name=$(basename "$infile" .in)
  outfile="/sandbox/outs/$name.out"

  # Copy per-test input files (e.g. JSON) into /sandbox/ if they exist
  testdata_dir="/sandbox/testdata/$name"
  if [ -d "$testdata_dir" ]; then
    cp "$testdata_dir"/* /sandbox/ 2>/dev/null || true
  fi

  set +e
  timeout 2s /sandbox/main < "$infile" > "$outfile" 2> /sandbox/run_stderr.txt
  code=$?
  set -e

  # Clean up per-test files so they don't leak into the next test
  if [ -d "$testdata_dir" ]; then
    for f in "$testdata_dir"/*; do
      rm -f "/sandbox/$(basename "$f")" 2>/dev/null || true
    done
  fi

  status="OK"
  if [ "$code" -ne 0 ]; then
    if [ "$code" -eq 124 ]; then status="TLE"; else status="RE"; fi
  fi

  if [ $first -eq 0 ]; then json="$json,"; fi
  first=0
  json="$json{\"name\":\"$name\",\"status\":\"$status\"}"

  if [ "$status" != "OK" ]; then
    json="$json]}"
    printf '%s\n' "$json" > /sandbox/results.json
    exit 0
  fi
done

json="$json]}"
printf '%s\n' "$json" > /sandbox/results.json
exit 0
