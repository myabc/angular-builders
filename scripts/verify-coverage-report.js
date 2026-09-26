#!/usr/bin/env node
// Verifies that `ng test --coverage` wrote a coverage report. Used by the
// `vitest-builder-coverage` integration test for #2420: with the unit-test builder
// forwarding the CLI's filled-in `coverageReporters: []`, Vitest ran no reporter and
// the directory stayed empty.
//
// Usage: node scripts/verify-coverage-report.js <coverageDir>

const fs = require('fs');
const path = require('path');

const [, , coverageArg] = process.argv;
if (!coverageArg) {
  console.error('Usage: verify-coverage-report.js <coverageDir>');
  process.exit(2);
}

const coverageDir = path.resolve(process.cwd(), coverageArg);

if (!fs.existsSync(coverageDir)) {
  console.error(`FAIL: coverage directory ${coverageDir} was not created.`);
  process.exit(1);
}

const entries = fs.readdirSync(coverageDir);
if (entries.length === 0) {
  console.error(`FAIL: coverage directory ${coverageDir} is empty (no reporter ran).`);
  process.exit(1);
}

console.log(`PASS: coverage report written to ${coverageDir} (${entries.join(', ')}).`);
