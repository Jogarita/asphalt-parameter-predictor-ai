
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const xlsx = require('xlsx');
const fs = require('fs');

const workbook = xlsx.readFile('Predicted_Measured VMA.xlsm');

const sheetNames = workbook.SheetNames;
console.log('Sheets:', sheetNames);

const data = {};

sheetNames.forEach(name => {
    const sheet = workbook.Sheets[name];
    // Dump the first 50 rows and 20 columns to see the structure
    // We expect coefficients to be in specific cells.
    // For now, let's just get the raw JSON to inspect where the data is.
    data[name] = xlsx.utils.sheet_to_json(sheet, { header: 1 }).slice(0, 50);
});

fs.writeFileSync('excel_dump.json', JSON.stringify(data, null, 2));
console.log('Dumped excel content to excel_dump.json');
