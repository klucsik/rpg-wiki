import puppeteer, { Browser } from 'puppeteer';

let browserInstance: Browser | null = null;

/**
 * Get or create a persistent browser instance for rendering
 * Reuses the same browser to avoid startup overhead
 */
async function getBrowser(): Promise<Browser> {
  if (!browserInstance || !browserInstance.connected) {
    browserInstance = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
  }
  return browserInstance;
}

/**
 * Render draw.io XML to SVG using headless browser
 * @param base64Xml - Base64-encoded draw.io XML
 * @returns SVG string
 */
export async function renderDrawioToSvg(base64Xml: string): Promise<string> {
  if (!base64Xml || base64Xml.trim() === '') {
    return '<svg><text x="10" y="20">Empty diagram</text></svg>';
  }

  try {
    const xml = Buffer.from(base64Xml, 'base64').toString('utf-8');
    const browser = await getBrowser();
    const page = await browser.newPage();

    page.on('console', (msg) => {
      console.log('[Puppeteer Console]', msg.text());
    });

    // Load our intermediate renderer page
    await page.goto('http://localhost:3000/drawio-renderer.html', {
      waitUntil: 'networkidle2',
      timeout: 10000,
    });

    // Wait for the renderer page to be ready
    await page.waitForFunction(() => typeof (window as any).loadDiagramXml === 'function', {
      timeout: 5000,
    });

    console.log('Renderer page loaded, loading diagram XML');

    // Load the XML
    await page.evaluate((xmlContent: string) => {
      (window as any).loadDiagramXml(xmlContent);
    }, xml);

    // Wait for SVG export
    console.log('Waiting for SVG export...');
    const svg = await page.evaluate(() => {
      return (window as any).waitForSvgExport();
    });

    await page.close();
    
    console.log('SVG received, length:', svg?.length);
    return svg;
  } catch (error) {
    console.error('Error rendering draw.io diagram:', error);
    return `<svg width="400" height="100"><text x="10" y="20" fill="red">Failed to render diagram: ${error instanceof Error ? error.message : 'Unknown error'}</text></svg>`;
  }
}

/**
 * Cleanup function to close the browser instance
 * Should be called on application shutdown
 */
export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}
