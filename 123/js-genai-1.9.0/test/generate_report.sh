#  @license
#  Copyright 2025 Google LLC
#  SPDX-License-Identifier: Apache-2.0

#!/bin/bash
set -x
# The directory of the script.
DIR=$(dirname "${BASH_SOURCE[0]}")

# The temp directory used, within $DIR omit the -p parameter to create a
# temporary directory in the default location
WORK_DIR=`mktemp -d -p "$DIR"`
DEFAULT_NYC_OUTPUT_DIR="${PWD}/.nyc_output/"

# Check if tmp dir was created.
if [[ ! "$WORK_DIR" || ! -d "$WORK_DIR" ]]; then
  echo "Could not create temp dir"
  exit 1
fi

# Deletes the temp directory.
function cleanup {
  echo "Cleaning up temp working directory $WORK_DIR" and default output directory for nyc $DEFAULT_NYC_OUTPUT_DIR
  rm -rf "$WORK_DIR"
  rm -Rf DEFAULT_NYC_OUTPUT_DIR
  echo "Deleted temp working directory $WORK_DIR"
}

# Register the cleanup function to be called on the EXIT signal.
trap cleanup EXIT


UNIT=coverage-unit-test
TABLE=coverage-table-test

# TODO(b/398045499): Add live tests back to the coverage report.
ALL_TESTS_IN_UNIT_EXCEPT_LIVE_TESTS=$(find test/unit/ -type f -name "*_test.ts" ! -name "live_test.ts" )

# Generate the reports for each test suite separately to avoid covering each
# other.
nyc --reporter=json --report-dir=./${WORK_DIR}/${UNIT} --require ts-node/register jasmine dist/test/unit/**/*_test.js ${ALL_TESTS_IN_UNIT_EXCEPT_LIVE_TESTS}
nyc --reporter=json --report-dir=./${WORK_DIR}/${TABLE} --require ts-node/register jasmine test/g3/table_test.ts

# Move all the generated coverage reports to the same directory to merge reports.
mv ./${WORK_DIR}/${UNIT}/coverage-final.json  ./${WORK_DIR}/${UNIT}-coverage-report.json
mv ./${WORK_DIR}/${TABLE}/coverage-final.json  ./${WORK_DIR}/${TABLE}-coverage-report.json

# Clean up the directory to avoid contamination, nyc will generate this
# directory everytime.
rm -Rf DEFAULT_NYC_OUTPUT_DIR || true

# Merge the reports into one file.
nyc merge ./${WORK_DIR} --output-file=${DEFAULT_NYC_OUTPUT_DIR}/coverage-report.json

# Convert and present the merged report in ./.nyc_output
nyc report --reporter=text --reporter=lcov --report-dir=${DEFAULT_NYC_OUTPUT_DIR}

