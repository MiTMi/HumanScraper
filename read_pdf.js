const fs = require('fs');
const pdf = require('pdf-parse');

const filename = process.argv[2] || 'Scrape_instructions.pdf';
const dataBuffer = fs.readFileSync(filename);

pdf(dataBuffer).then(function (data) {
    console.log(data.text);
});
