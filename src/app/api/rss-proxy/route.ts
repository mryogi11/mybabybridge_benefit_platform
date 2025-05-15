import { NextResponse } from 'next/server';
import { fetchAndParseRssFeed, RssParserFeed } from '@/lib/rssUtils'; // Adjusted import path

// const FEED_URL = 'https://rss.sciencedaily.com/health_medicine/fertility.xml'; // Previous feed

const FEED_URL = 'https://www.sheknows.com/health-and-wellness/reproductive-health/feed/'; // User provided feed

export async function GET() {
  try {
    const feed: RssParserFeed = await fetchAndParseRssFeed();
    return NextResponse.json(feed);
  } catch (error: any) {
    console.error('[API RSS PROXY ERROR]', error);
    // Attempt to parse a more specific status code from the error message if it was one from the fetchAndParseRssFeed
    let statusCode = 500;
    // This logic might need adjustment if fetchAndParseRssFeed standardizes its error messages or types
    if (error.message && error.message.includes('Status code')) { // This check might become less relevant
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