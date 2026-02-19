import { LandScraper } from './landScraper';

(async () => {
    // Dynamic import for ESM module in CJS project environment
    const { default: inquirer } = await import('inquirer');

    const scraper = new LandScraper();

    try {
        console.log('--- Land.gov.il Interactive Scraper ---');

        const answers = await inquirer.prompt([
            {
                type: 'list',
                name: 'merchav',
                message: 'Select Merchav (District):',
                choices: [
                    'ירושלים',
                    'תל אביב',
                    'חיפה',
                    'מרכז',
                    'צפון',
                    'דרום',
                    'יו"ש',
                    'מכרז ארצי'
                ]
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

        console.log('Attempting to extract results (Note: logic still looks for 474/2024 specifically)...');
        const results = await scraper.extractResults();

        if (results.length > 0) {
            console.log('✅ Results Found:', JSON.stringify(results, null, 2));
        } else {
            console.log('❌ No results found for tender 474/2024 with these filters.');
        }

    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        console.log('\nDone. Keeping browser open for inspection.');
    }
})();
