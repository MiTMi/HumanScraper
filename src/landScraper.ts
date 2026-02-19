import { HumanScraper } from './scraper';
import { randomDelay, simulateHumanInteraction } from './utils';

export class LandScraper extends HumanScraper {

    async navigateHome() {
        await this.launch(false);
        if (!this.page) throw new Error('Browser not launched');

        console.log('Navigating to Land.gov.il...');
        await this.page.goto('https://apps.land.gov.il/MichrazimSite/#/homePage');
        await this.page.waitForLoadState('networkidle');
        await randomDelay(200, 500);
    }

    async selectActiveTenders() {
        console.log('Selecting "Tender Results"...');
        const buttons = await this.page?.$$('button.button-enter');
        if (buttons && buttons.length > 1) {
            await buttons[1].click();
            await randomDelay(200, 500);
        } else {
            throw new Error('Could not find Tender Results button');
        }
    }

    async openAdvancedSearch() {
        console.log('Opening Advanced Search...');
        await this.click('.advanced-search');
        await randomDelay(50, 100);
    }

    async applyFilters() {
        console.log('Applying filters quickly...');

        // 1. District: Jerusalem
        console.log('Setting District: Jerusalem');
        await this.click('#Merchav_id .p-multiselect-label-container');
        await this.click('li.p-multiselect-item:has-text("ירושלים")');
        await this.page?.keyboard.press('Escape');
        await randomDelay(50, 100);

        // 2. Purpose: Low rise AND Saturated
        console.log('Setting Purpose: Low rise & Saturated');
        await this.click('#YeudMichraz_id .p-multiselect-label-container');
        await this.click('li.p-multiselect-item:has-text("בנייה נמוכה/צמודת קרקע")');
        await this.click('li.p-multiselect-item:has-text("בנייה רוויה")');
        await this.page?.keyboard.press('Escape');
        await randomDelay(50, 100);

        // 3. Status: Discussed in Committee
        console.log('Setting Status: Committee Discussed');
        await this.click('#StatusMichraz_id .p-multiselect-label-container');
        await this.click('li:has-text("נדון בוועדת מכרזים")');
        await this.page?.keyboard.press('Escape');
        await randomDelay(100, 100);

        // 4. Date (Committee Date): 01/07/2025
        console.log('Setting Date: 01/07/2025 via UI Picker (Carousel)');
        await this.selectDateFromPickerUI('01/07/2025');
        await this.page?.keyboard.press('Tab');
    }

    async selectDateFromPickerUI(dateStr: string) {
        console.log(`Picking date ${dateStr} from UI...`);
        const [day, month, year] = dateStr.split('/');
        const months = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
        const targetMonthName = months[parseInt(month) - 1];

        // 1. Open Picker via Golden Selector
        const buttonSelector = 'button[aria-label="ועדת מכרזים מתאריך - פתיחת תאריכון"]';
        console.log(`Clicking date picker button: ${buttonSelector}`);

        let pickerOpened = false;
        if (await this.page?.isVisible(buttonSelector)) {
            await this.click(buttonSelector);
            pickerOpened = true;
        } else {
            console.warn('Buttons with aria-label not found? Trying contains match...');
            const approxBtn = 'button[aria-label*="ועדת מכרזים מתאריך"]';
            if (await this.page?.isVisible(approxBtn)) {
                await this.click(approxBtn);
                pickerOpened = true;
            }
        }

        if (!pickerOpened) {
            console.warn('Fallback: Nth(2)...');
            await this.page?.click('input[placeholder="מתאריך"]:nth-of-type(2)').catch(async () => {
                await this.page?.click('input[placeholder="מתאריך"]');
            });
        }

        // 2. Wait for panel (Day View initially)
        const panelSelector = '.p-datepicker';
        try {
            await this.page?.waitForSelector(panelSelector, { timeout: 10000 });
        } catch (e) {
            throw new Error('Date picker UI failed to open');
        }
        await randomDelay(100, 200);

        // 3. Handle Year/Month State Transition
        await this.page?.waitForSelector('.p-datepicker-year', { state: 'visible', timeout: 5000 });
        const currentYear = await this.page?.$eval('.p-datepicker-year', el => el.textContent?.trim());
        const currentMonth = await this.page?.$eval('.p-datepicker-month', el => el.textContent?.trim());

        if (currentYear !== year) {
            console.log(`Switching Year ${currentYear} -> ${year}`);
            await this.page?.click('.p-datepicker-year');
            await this.page?.waitForSelector('.p-yearpicker', { timeout: 3000 });
            await this.page?.click(`.p-yearpicker span:has-text("${year}")`);

            console.log(`Year selected. Now picking month ${targetMonthName} from Month View...`);
            await this.page?.waitForSelector('.p-monthpicker', { timeout: 3000 });
            await this.page?.click(`.p-monthpicker span:has-text("${targetMonthName}")`);

        } else if (currentMonth !== targetMonthName) {
            console.log(`Switching Month ${currentMonth} -> ${targetMonthName}`);
            await this.page?.click('.p-datepicker-month');
            await this.page?.waitForSelector('.p-monthpicker', { timeout: 3000 });
            await this.page?.click(`.p-monthpicker span:has-text("${targetMonthName}")`);
        }

        await randomDelay(100, 200);

        // 4. Select Day
        const dayNum = parseInt(day).toString();
        // Remove leading zero if necessary? parseInt does that.
        console.log(`Clicking Day ${dayNum}`);
        await this.page?.evaluate((d) => {
            const cells = Array.from(document.querySelectorAll('.p-datepicker-calendar td:not(.p-datepicker-other-month) span'));
            const target = cells.find(el => el.textContent?.trim() === d);
            if (target) (target as HTMLElement).click();
        }, dayNum);

        await randomDelay(200, 500);
        if (await this.page?.isVisible(panelSelector)) await this.page?.keyboard.press('Escape');
    }

    async performSearch() {
        console.log('Clicking Search...');
        const selectors = ['button:has-text("חפש")', '.icon-search', 'button.search-btn', 'button[type="submit"]'];
        for (const s of selectors) {
            if (await this.page?.isVisible(s)) {
                await this.click(s);
                break;
            }
        }
        await randomDelay(1000, 2000);
    }

    async restartBrowser() {
        console.log('Restarting browser...');
        await this.close();
        await this.launch(false);
    }

    async extractResults() {
        console.log('Starting Aggressive Scroll & Search...');

        try {
            // Scroll loop
            for (let i = 0; i < 5; i++) {
                console.log(`Scroll attempt ${i + 1}/5...`);
                await this.page?.evaluate(() => window.scrollBy(0, 1000));
                await randomDelay(800, 1500);

                // Check if text exists
                const textVisible = await this.page?.evaluate(() => document.body.innerText.includes('474/2024'));
                if (textVisible) {
                    console.log('Found "474/2024" in page text!');
                    break;
                }
            }

            // Find specific element
            console.log('Locating target tender element...');
            const cardHandle = await this.page?.evaluateHandle(() => {
                const elements = Array.from(document.querySelectorAll('*'));
                // Find smallest element containing text
                const el = elements.find(e => e.children.length === 0 && (e as HTMLElement).innerText && (e as HTMLElement).innerText.includes('474/2024'));
                if (!el) return null;

                // Traverse up to find clickable container (Michraz Card)
                let parent = el.parentElement;
                while (parent && parent !== document.body) {
                    if (parent.tagName.includes('APP-MICHRAZ') || parent.className.includes('card')) return parent;
                    parent = parent.parentElement;
                }
                return el; // Fallback to text element
            });

            if (cardHandle) {
                const element = cardHandle.asElement();
                if (element) {
                    console.log('Found card. Clicking to expand details...');
                    await element.evaluate(el => {
                        const link = el.querySelector('.michraz-link, .title, a, h2');
                        if (link) (link as HTMLElement).click();
                        else (el as HTMLElement).click();
                    });

                    await randomDelay(4000, 6000);

                    // Parse Data from Text (Lots)
                    const pageText = (await this.page?.evaluate(() => document.body.innerText)) || '';
                    if (!pageText) { return []; }

                    const lots = [];
                    const parts = pageText.split('מספר מתחם:');

                    // Skip parts[0]
                    for (let i = 1; i < parts.length; i++) {
                        const chunk = parts[i];
                        const getVal = (label: string) => {
                            // Match label, optional colon, capture rest of line (or up to next newline)
                            const regex = new RegExp(`${label}\\s*[:]?\\s*([\\d,.]+|[^\\n]+)`);
                            const match = chunk.match(regex);
                            return match ? match[1].trim() : null;
                        };

                        const lotNum = chunk.match(/^[\s\n]*(\d+)/)?.[1] || '';

                        // Extract specific fields
                        const expenses = getVal('הוצאות פיתוח ב₪');
                        const price = getVal('מחיר סופי ב₪');
                        const winner = getVal('שם זוכה');

                        lots.push({
                            tenderNumber: '474/2024',
                            lotNumber: lotNum,
                            developmentExpenses: expenses || 'Not found',
                            winningOffer: price || 'Not found',
                            winnerName: winner || 'Not found'
                        });
                    }

                    console.log('--- EXTRACTION RESULTS ---');
                    console.log(JSON.stringify(lots, null, 2));

                    if (lots.length === 0) {
                        console.log('Parsed 0 lots. Dumping snippet for debug:');
                        console.log(pageText.substring(0, 2000));
                    }

                    return lots;
                }
            } else {
                console.log('Element 474/2024 not found in DOM.');
            }
        } catch (e) {
            console.error('Extraction error:', e);
        }
        return [];
    }
}
