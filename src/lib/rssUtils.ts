import RssParser from 'rss-parser';

// Define the structure of the API response (matching what RssParser output)
// This is useful if the calling code expects this structure
export interface RssParserFeed {
  items: RssParserItem[];
  [key: string]: any; // To accommodate other feed-level properties like title, description, etc.
}
export interface RssParserItem {
    title: string;
    link: string;
    pubDate: string;
    contentSnippet?: string;
    guid: string;
    enclosure?: { url: string; [key: string]: any };
    'media:content'?: { $: { url: string; [key: string]: any }; [key: string]: any };
    content?: string;
    'content:encoded'?: string;
    [key: string]: any;
}

const FEED_URL = 'https://www.sheknows.com/health-and-wellness/reproductive-health/feed/';

export async function fetchAndParseRssFeed(): Promise<RssParserFeed> {
  console.log(`[rssUtils] Fetching feed from: ${FEED_URL}`);
  try {
    const parser = new RssParser({
      requestOptions: {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
          'Accept': 'application/rss+xml, application/xml, text/xml, text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        }
      },
      timeout: 10000,
    });

    const feed = await parser.parseURL(FEED_URL) as RssParserFeed; // Cast to our defined type
    console.log(`[rssUtils] Successfully fetched and parsed feed. Found ${feed.items?.length || 0} items.`);
    return feed;

  } catch (error: any) {
    console.error('[rssUtils] Error fetching or parsing RSS feed:', error);
    // Re-throw a more specific error or return a structured error object
    // For now, re-throwing the original error to be handled by the caller.
    // Or, to ensure an empty list of items on error similar to the original API:
    // return { items: [] }; 
    // However, throwing allows the caller to know a failure occurred.
    throw new Error(`Failed to fetch or parse RSS feed: ${error.message}`);
  }
} 