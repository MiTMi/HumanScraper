import { Page } from 'playwright';

/**
 * Pauses execution for a random amount of time between min and max milliseconds.
 * Mimics human thinking/reading time.
 */
export async function randomDelay(min: number = 500, max: number = 2000): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1) + min);
    await new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Simulates human-like mouse movements and scrolling to avoid bot detection.
 */
export async function simulateHumanInteraction(page: Page): Promise<void> {
    // Random small mouse movement
    const x = Math.floor(Math.random() * 500);
    const y = Math.floor(Math.random() * 500);
    await page.mouse.move(x, y);

    // Random short delay
    await randomDelay(200, 600);

    // Slight scroll
    await page.mouse.wheel(0, Math.floor(Math.random() * 100));
}
