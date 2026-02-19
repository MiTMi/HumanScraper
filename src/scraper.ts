import { Browser, BrowserContext, chromium, Page } from 'playwright';
import { randomDelay, simulateHumanInteraction } from './utils';

export class HumanScraper {
    protected browser: Browser | null = null;
    protected context: BrowserContext | null = null;
    protected page: Page | null = null;

    async launch(headless: boolean = false) {
        // Strict NO CACHE launch
        this.browser = await chromium.launch({
            headless,
            args: [
                '--disable-blink-features=AutomationControlled',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-web-security',
                '--disable-features=IsolateOrigins,site-per-process',
                '--disable-back-forward-cache',
                '--aggressive-cache-discard',
                '--disk-cache-size=0',
                '--disable-application-cache',
                '--media-cache-size=0'
            ]
        });

        // New Context = New Incognito Session
        this.context = await this.browser.newContext({
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewport: { width: 1280, height: 800 },
            ignoreHTTPSErrors: true,
            permissions: ['geolocation'],
            geolocation: { latitude: 31.7683, longitude: 35.2137 },
            locale: 'he-IL',
            timezoneId: 'Asia/Jerusalem'
        });

        // Explicitly clear everything
        await this.context.clearCookies();
        await this.context.addInitScript(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            localStorage.clear();
            sessionStorage.clear();
        });

        this.page = await this.context.newPage();

        // Safety: Close browser on process termination (Ctrl+C)
        const cleanup = async () => {
            console.log('\nClosing browser safely...');
            if (this.browser) await this.browser.close();
            process.exit();
        };
        process.on('SIGINT', cleanup);
        process.on('SIGTERM', cleanup);
    }

    async login(url: string, selectors: { user: string, pass: string, submit: string }, credentials: { user: string, pass: string }) {
        if (!this.page) throw new Error('Browser not launched');

        await this.page.goto(url);
        // Minimal delay
        await randomDelay(100, 300);

        await this.page.type(selectors.user, credentials.user, { delay: 10 });
        await randomDelay(50, 100);

        await this.page.type(selectors.pass, credentials.pass, { delay: 10 });
        await randomDelay(50, 100);

        await Promise.all([
            this.page.waitForNavigation(),
            this.page.click(selectors.submit)
        ]);
    }

    async click(selector: string) {
        if (!this.page) throw new Error('Browser not launched');
        try {
            await this.page.waitForSelector(selector, { state: 'visible', timeout: 5000 });
            // simulateHumanInteraction(this.page); // Removed for speed
            await this.page.click(selector);
            await randomDelay(100, 300); // 0.1s delay
        } catch (e) {
            console.error(`Error clicking ${selector}: ${e}`);
            throw e; // Rethrow to fail fast
        }
    }

    async type(selector: string, text: string) {
        if (!this.page) throw new Error('Browser not launched');
        try {
            await this.page.waitForSelector(selector, { state: 'visible' });
            await this.page.type(selector, text, { delay: 10 }); // Fast type
            await randomDelay(50, 150);
        } catch (e) {
            console.error(`Error typing in ${selector}: ${e}`);
        }
    }

    async getText(selector: string): Promise<string | null> {
        if (!this.page) return null;
        try {
            await this.page.waitForSelector(selector, { timeout: 3000 });
            return await this.page.textContent(selector);
        } catch (e) {
            return null;
        }
    }

    async scrape(url: string) {
        if (!this.page) throw new Error('Browser not launched');
        console.log(`Navigating to ${url}...`);
        await this.page.goto(url);
        await randomDelay(1000, 2000); // Only initial load wait

        const title = await this.page.title();
        console.log(`Page title: ${title}`);

        return { title };
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
        }
    }
}
