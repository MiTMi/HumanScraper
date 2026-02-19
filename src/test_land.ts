import { LandScraper } from './landScraper';
import inquirer = require('inquirer');
import { createObjectCsvWriter } from 'csv-writer';

(async () => {
    const scraper = new LandScraper();

    try {
        console.log('--- Land.gov.il Interactive Scraper ---');

        const answers = await inquirer.prompt([
            {
                type: 'list',
                name: 'merchav',
                message: 'Select Merchav (District) - Use Arrow Keys:',
                choices: [
                    'ירושלים',
                    'תל אביב',
                    'חיפה',
                    'מרכז',
                    'צפון',
                    'דרום',
                    'יו"ש',
                    'מכרז ארצי'
                ],
                pageSize: 8
            },
            {
                type: 'input',
                name: 'date',
                message: 'Enter Committee Date (DD/MM/YYYY):',
                default: '01/07/2025',
                validate: (input: string) => {
                    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(input)) return 'Format must be DD/MM/YYYY';
                    return true;
                }
            }
        ]);

        console.log(`\n🚀 Starting scraper for: ${answers.merchav} on ${answers.date}...\n`);

        await scraper.navigateHome();
        await scraper.selectActiveTenders();
        await scraper.openAdvancedSearch();

        // Use user inputs
        await scraper.applyFilters(answers.merchav, answers.date);

        await scraper.performSearch();

        console.log('Extracting results...');
        const results = await scraper.extractResults();

        if (results.length > 0) {
            console.log('✅ Results Found:', JSON.stringify(results, null, 2));

            const saveAnswer = await inquirer.prompt([{
                type: 'confirm',
                name: 'saveCsv',
                message: 'Do you want to save these results to a CSV file?',
                default: true
            }]);

            if (saveAnswer.saveCsv) {
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const filename = `land_results_${answers.date.replace(/\//g, '-')}_${timestamp}.csv`;
                const csvWriter = createObjectCsvWriter({
                    path: filename,
                    header: [
                        { id: 'tenderNumber', title: 'Tender Number' },
                        { id: 'lotNumber', title: 'Lot Number' },
                        { id: 'winnerName', title: 'Winner' },
                        { id: 'winningOffer', title: 'Winning Offer' },
                        { id: 'developmentExpenses', title: 'Dev Expenses' }
                    ]
                });
                await csvWriter.writeRecords(results);
                console.log(`\n💾 Saved successfully to: ${filename}`);
            }

        } else {
            console.log('❌ No results found with these filters.');
        }

    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        console.log('\nDone. Keeping browser open for inspection.');
    }
})();
