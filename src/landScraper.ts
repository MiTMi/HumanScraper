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

    async applyFilters(merchav: string, dateStr: string) {
        console.log(`Applying filters... Merchav: "${merchav}", Date: "${dateStr}"`);

        // 1. District
        console.log(`Setting District: ${merchav}`);
        await this.click('#Merchav_id .p-multiselect-label-container');
        // Handle "Select All" or "My Location"? No, just specific text match
        // Note: The text might be partial match so strict check is better if list is known
        const merchavSelector = `li.p-multiselect-item:has-text("${merchav}")`;
        if (await this.page?.isVisible(merchavSelector)) {
            await this.click(merchavSelector);
        } else {
            console.warn(`Merchav option "${merchav}" not found in dropdown!`);
        }
        await this.page?.keyboard.press('Escape');
        await randomDelay(50, 100);

        // 2. Purpose: Low rise AND Saturated (Fixed)
        console.log('Setting Purpose: Low rise & Saturated');
        await this.click('#YeudMichraz_id .p-multiselect-label-container');
        await this.click('li.p-multiselect-item:has-text("בנייה נמוכה/צמודת קרקע")');
        await this.click('li.p-multiselect-item:has-text("בנייה רוויה")');
        await this.page?.keyboard.press('Escape');
        await randomDelay(50, 100);

        // 3. Status: Discussed in Committee (Fixed)
        console.log('Setting Status: Committee Discussed');
        await this.click('#StatusMichraz_id .p-multiselect-label-container');
        await this.click('li:has-text("נדון בוועדת מכרזים")');
        await this.page?.keyboard.press('Escape');
        await randomDelay(100, 100);

        // 4. Date (Committee Date)
        console.log(`Setting Date: ${dateStr} via UI Picker (Carousel)`);
        await this.selectDateFromPickerUI(dateStr);
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
            }

            // 1. Scan page text to find all Tender IDs
            const tenderIds = await this.page?.evaluate(() => {
                const text = document.body.innerText;
                const matches = text.matchAll(/(\d+\/\d+)\s+מכרז/g);
                const ids = new Set<string>();
                for (const match of matches) {
                    if (match[1]) ids.add(match[1]);
                }
                if (ids.size === 0) {
                    const fallback = text.matchAll(/(\d+\/\d+)\s+מחיר מטרה/g);
                    for (const match of fallback) { if (match[1]) ids.add(match[1]); }
                }
                return Array.from(ids);
            });

            console.log(`Found ${tenderIds?.length || 0} tender IDs:`, tenderIds);

            if (!tenderIds || tenderIds.length === 0) {
                console.log('No tender IDs found.');
                // Logging page text for debug
                const text = await this.page?.evaluate(() => document.body.innerText.substring(0, 2000));
                console.log('--- Page Text Dump ---');
                console.log(text);
                return [];
            }

            const allResults: any[] = [];
            // Limit to first 5
            const limit = 5;
            const idsToProcess = tenderIds.slice(0, limit);

            // 2. Sequential Processing
            for (const id of idsToProcess) {
                console.log(`Processing Tender ${id}...`);

                // Locate & Click (Expand)
                const clicked = await this.page?.evaluate((tid) => {
                    const els = Array.from(document.querySelectorAll('*'));
                    // Find element starting with ID (title header)
                    const el = els.find(e => e.children.length === 0 && (e as HTMLElement).innerText?.trim().startsWith(tid));
                    if (el) {
                        // Try to click a clickable parent or the element itself
                        let clickable = el;
                        // Traverse up to button or link?
                        // Or looks for .michraz-link sibling?
                        // Usually clicking the text works if it's in the header.
                        (clickable as HTMLElement).click();
                        return true;
                    }
                    return false;
                }, id);

                if (!clicked) {
                    console.log(`Could not locate/click element for ${id}`);
                    continue;
                }

                await randomDelay(2000, 3000); // Wait for expansion

                // 3. Extract Data for THIS Tender
                const fullText = (await this.page?.evaluate(() => document.body.innerText)) || '';

                // Find the block for this ID
                const startIdx = fullText.indexOf(id);
                if (startIdx === -1) {
                    console.log(`Text for ${id} not found in body?`);
                    continue;
                }

                // We grab a chunk after the ID.
                // If sequential, maybe identifying the END is hard.
                // We'll take 3000 chars.
                const chunk = fullText.substring(startIdx, startIdx + 3000);

                // Check if it's Multi-Lot ("מספר מתחם:")
                const parts = chunk.split('מספר מתחם:');

                if (parts.length > 1) {
                    // Parse Lots
                    for (let i = 1; i < parts.length; i++) {
                        // Safety: stop if we hit another Tender ID in this part
                        let sub = parts[i];
                        // Simple check: does it look like start of new tender? e.g. "Result 3..."
                        // Actually, just rely on regex not matching if structure is lost.

                        const getVal = (label: string) => {
                            const regex = new RegExp(`${label}\\s*[:]?\\s*([\\d,.]+|[^\\n]+)`);
                            const match = sub.match(regex);
                            return match ? match[1].trim() : null;
                        };

                        const lotNum = sub.match(/^[\s\n]*(\d+)/)?.[1] || '';
                        const expenses = getVal('הוצאות פיתוח ב₪');
                        const price = getVal('מחיר סופי ב₪');
                        const winner = getVal('שם זוכה');

                        // Only add if we found something useful (or if lotNum exists)
                        if (lotNum || expenses || price) {
                            allResults.push({
                                tenderNumber: id,
                                lotNumber: lotNum,
                                developmentExpenses: expenses || 'Not found',
                                winningOffer: price || 'Not found',
                                winnerName: winner || 'Not found'
                            });
                        }
                    }
                } else {
                    // Single Lot? Or Data Missing?
                    const getVal = (label: string) => {
                        const regex = new RegExp(`${label}\\s*[:]?\\s*([\\d,.]+|[^\\n]+)`);
                        const match = chunk.match(regex);
                        return match ? match[1].trim() : null;
                    };
                    const expenses = getVal('הוצאות פיתוח ב₪');
                    const price = getVal('מחיר סופי ב₪');
                    const winner = getVal('שם זוכה');

                    if (expenses || price || winner) {
                        allResults.push({
                            tenderNumber: id,
                            lotNumber: 'Single/Global',
                            developmentExpenses: expenses || 'Not found',
                            winningOffer: price || 'Not found',
                            winnerName: winner || 'Not found'
                        });
                    } else {
                        // If we found nothing, maybe it's just a status listing with no winners yet
                        // But we should record we saw it.
                        allResults.push({
                            tenderNumber: id,
                            lotNumber: '-',
                            developmentExpenses: 'Not published',
                            winningOffer: 'Not published',
                            winnerName: 'Not published'
                        });
                    }
                }

                // Go Back to Results List
                console.log('Returning to results list...');
                await this.page?.goBack();
                await randomDelay(2000, 3000); // Wait for list to reload

                // Wait for the next item to be visible?
                // Or just wait for "Results Found" text?
                try {
                    await this.page?.waitForSelector('.p-scroller, app-michraz-card, .results-title', { timeout: 10000 });
                } catch (e) {
                    console.log('Warning: Timeout waiting for results list after back navigation.');
                }

                // Optional: Close it back to reduce clutter? 
                // await this.clickTender(id); 
            }

            return allResults;

        } catch (e) {
            console.error('Extraction error:', e);
        }
        return [];
    }
}
