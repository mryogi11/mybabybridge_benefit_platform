import React from 'react';
// Remove RssParser import as it's handled by the API route
// import RssParser, { Item as RssItem } from 'rss-parser';
import { Box, Card, CardContent, Typography, Link as MuiLink, Grid, Container, CardMedia } from '@mui/material';
import NextLink from 'next/link';
import { fetchAndParseRssFeed, RssParserItem as ApiRssParserItem } from '@/lib/rssUtils'; // Import the direct fetch function

// Define the structure of a feed item for the page component
interface FeedItem {
  title: string;
  link: string;
  pubDate: string;
  contentSnippet?: string;
  guid: string;
  imageUrl?: string;
}

// Helper function to extract the first image URL from an HTML string
function extractFirstImageUrl(htmlContent?: string): string | undefined {
  if (!htmlContent) return undefined;
  const match = htmlContent.match(/<img[^>]+src\s*=\s*['\"]([^'\"]+)['\"]/i);
  return match ? match[1] : undefined;
}

async function getProcessedFeedItems(): Promise<FeedItem[]> {
  console.log('[EducationPage] Fetching feed items directly using rssUtils...');
  try {
    // No need for fetch() or revalidate here, as revalidation is handled by Next.js for the page itself if needed
    // or by the nature of Server Components re-rendering.
    // If this page is fully static or ISR, Next.js handles its revalidation based on page-level config or defaults.
    const feedData = await fetchAndParseRssFeed(); // Call the utility function directly

    const allItems = feedData.items.filter(item => item.title && item.link && item.pubDate && item.guid).map((item: ApiRssParserItem) => {
      const imageUrlFromMeta = item.enclosure?.url || item['media:content']?.$?.url;
      const imageUrlFromContent = extractFirstImageUrl(item['content:encoded'] || item.content);
      
      return {
        title: item.title,
        link: item.link,
        pubDate: item.pubDate,
        contentSnippet: item.contentSnippet,
        guid: item.guid,
        imageUrl: imageUrlFromMeta || imageUrlFromContent || '/images/blog_placeholder.jpg',
      };
    });

    const sortedItems = allItems.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
    return sortedItems.slice(0, 9);

  } catch (error) {
    console.error("[EducationPage] Failed to fetch or parse feed directly:", error);
    return []; // Return empty array on error
  }
}

// Helper to create a slug from the guid or link (Keep this local or move to shared util)
function createSlug(guid: string): string {
    try {
        const url = new URL(guid);
        let path = url.pathname;
        path = path.replace(/^\/+|\/+$/g, '');
        const parts = path.split('/');
        const slugPart = parts[parts.length - 1] || 'default-slug';
        return slugPart.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase();
    } catch (e) {
        return guid.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase();
    }
}

export default async function EducationPage() {
  const items = await getProcessedFeedItems(); // Fetch directly using the new function

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom component="h1">
        Fertility News & Resources
      </Typography>
      <Grid container spacing={3}>
        {items.length > 0 ? (
          items.map((item) => {
            const slug = createSlug(item.guid);
            return (
              <Grid item xs={12} sm={6} md={4} key={item.guid}>
                <NextLink 
                  href={`/dashboard/education/${encodeURIComponent(slug)}?imageUrl=${encodeURIComponent(item.imageUrl || '')}`} 
                  style={{ textDecoration: 'none', display: 'block', height: '100%' }}
                >
                  <Card sx={{ display: 'flex', flexDirection: 'column', height: '100%', '&:hover': { boxShadow: 6 }, cursor: 'pointer' }}>
                    {item.imageUrl && (
                      <CardMedia
                        component="img"
                        height="140"
                        image={item.imageUrl}
                        alt={item.title}
                        sx={{ objectFit: 'cover' }}
                      />
                    )}
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Typography gutterBottom variant="h6" component="h2">
                        {item.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {new Date(item.pubDate).toLocaleDateString()}
                      </Typography>
                      <Typography variant="body2" paragraph sx={{
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          mb: 2,
                      }}>
                        {item.contentSnippet || 'No description available.'}
                      </Typography>
                    </CardContent>
                  </Card>
                </NextLink>
              </Grid>
            );
          })
        ) : (
          <Grid item xs={12}>
            <Typography>Could not load educational resources at this time.</Typography>
          </Grid>
        )}
      </Grid>
    </Container>
  );
}

// The page itself can have revalidation settings if it's intended for ISR
// For Server Components, data fetching is tied to component rendering. 
// Revalidation for Server Components that are part of a statically generated page occurs when the page is revalidated.
export const revalidate = 3600; // Revalidate the page every hour 