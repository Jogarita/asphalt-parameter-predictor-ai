
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const xlsx = require('xlsx');

const workbook = xlsx.readFile('Predicted_Measured VMA.xlsm', { cellFormula: true });
const sheet = workbook.Sheets['VMA-First Model'];

// Helper to get cell
const getCell = (addr) => sheet[addr] ? (sheet[addr].f || sheet[addr].v) : 'undefined';

// Rows are 0-indexed in code but Excel uses 1-based.
// Based on JSON dump, "New CA ratio" is around row 12.
// Let's print B10 to B20 formulas and values.

console.log('Checking formulas for VMA-First Model (Col B):');
for (let r = 10; r <= 20; r++) {
    const addr = 'B' + r;
    console.log(`${addr}:`, getCell(addr));
}
