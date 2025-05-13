import { NextResponse } from 'next/server';
import RssParser from 'rss-parser';

// const FEED_URL = 'https://rss.sciencedaily.com/health_medicine/fertility.xml'; // Previous feed

const FEED_URL = 'https://www.sheknows.com/health-and-wellness/reproductive-health/feed/'; // User provided feed

export async function GET() {
  try {
    const parser = new RssParser({
      requestOptions: {
        headers: {
          // Using a more generic User-Agent, sometimes less specific is better for avoiding blocks
          'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
          // It's good practice to also accept what the server might send
          'Accept': 'application/rss+xml, application/xml, text/xml, text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        }
      },
      // Timeout in milliseconds (e.g., 10 seconds)
      timeout: 10000,
    });

    const feed = await parser.parseURL(FEED_URL);
    return NextResponse.json(feed);

  } catch (error: any) {
    console.error('[API RSS PROXY ERROR]', error);
    // Determine a more specific status code if possible
    let statusCode = 500;
    if (error.message && error.message.includes('Status code')) {
      const match = error.message.match(/Status code (\d+)/);
      if (match && match[1]) {
        statusCode = parseInt(match[1], 10);
      }
    }
    return NextResponse.json(
      { error: 'Failed to fetch RSS feed', details: error.message },
      { status: statusCode }
    );
  }
} 