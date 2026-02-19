import { HumanScraper } from './scraper';

(async () => {
    const scraper = new HumanScraper();

    try {
        console.log('Starting HumanScraper...');
        // Launch non-headless to see the action
        await scraper.launch(false);

        // simple example: navigate to a safe test site
        const testUrl = 'https://example.com';
        await scraper.scrape(testUrl);

        // Demonstrate interaction (even though example.com is simple)
        const headerText = await scraper.getText('h1');
        console.log(`Header found: ${headerText}`);

        // If you had a login:
        // await scraper.login('https://site.com/login', { user: '#user', pass: '#pass', submit: '#btn' }, { user: 'me', pass: '123' });

    } catch (error) {
        console.error('An error occurred:', error);
    } finally {
        console.log('Closing browser...');
        await scraper.close();
    }
})();
