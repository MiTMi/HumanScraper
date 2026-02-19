import { LandScraper } from './landScraper';

(async () => {
    const scraper = new LandScraper();

    try {
        let attempts = 0;
        let success = false;

        while (attempts < 2 && !success) {
            attempts++;
            console.log(`\n--- Attempt ${attempts} ---`);

            if (attempts > 1) {
                await scraper.restartBrowser();
            }

            try {
                await scraper.navigateHome();
                await scraper.selectActiveTenders();
                await scraper.openAdvancedSearch();

                await scraper.applyFilters();
                await scraper.performSearch();
                const results = await scraper.extractResults();

                if (results && results.length > 0) {
                    console.log('Results:', JSON.stringify(results, null, 2));
                    success = true;
                } else {
                    console.log('No results found. Retrying...');
                }
            } catch (innerError) {
                console.error(`Attempt ${attempts} failed:`, innerError);
            }
        }

        if (!success) {
            console.error('Failed to scrape results after multiple attempts.');
        }

        console.log('Navigation test complete. Keeping browser open for inspection.');
        // Keep open for manual checking
        await new Promise(() => { });
    } catch (error) {
        console.error('Fatal Error:', error);
        await scraper.close();
    }
})();
