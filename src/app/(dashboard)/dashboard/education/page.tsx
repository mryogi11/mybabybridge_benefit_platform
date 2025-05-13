import React from 'react';
// Remove RssParser import as it's handled by the API route
// import RssParser, { Item as RssItem } from 'rss-parser';
import { Box, Card, CardContent, Typography, Link as MuiLink, Grid, Container, CardMedia } from '@mui/material';
import NextLink from 'next/link';

// Define the structure of a feed item (must match API response structure)
interface FeedItem {
  title: string;
  link: string;
  pubDate: string;
  contentSnippet?: string;
  guid: string;
  imageUrl?: string;
}

// Define the structure of the API response (matching what RssParser output)
interface RssParserItem {
    title: string;
    link: string;
    pubDate: string;
    contentSnippet?: string;
    guid: string;
    enclosure?: { url: string; [key: string]: any };
    'media:content'?: { $: { url: string; [key: string]: any }; [key: string]: any };
    content?: string; // Added for flexibility
    'content:encoded'?: string; // Added for flexibility
    [key: string]: any; // Allow other properties
}

interface ApiResponse {
  items: RssParserItem[];
  // Add other top-level feed properties if needed (title, description, etc.)
}

// Helper function to extract the first image URL from an HTML string
function extractFirstImageUrl(htmlContent?: string): string | undefined {
  if (!htmlContent) return undefined;
  const match = htmlContent.match(/<img[^>]+src\s*=\s*['\"]([^'\"]+)['\"]/i);
  return match ? match[1] : undefined;
}

// Helper function to get the base URL (important for server-side fetch)
function getBaseUrl() {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  // Use localhost for development
  return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'; 
}

async function getFeedItemsFromApi(): Promise<FeedItem[]> {
  const baseUrl = getBaseUrl();
  const apiUrl = `${baseUrl}/api/rss-proxy`;
  console.log(`[EducationPage] Fetching feed from API: ${apiUrl}`); 

  try {
    const response = await fetch(apiUrl, {
      next: { revalidate: 3600 }, 
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[EducationPage] API Error (${response.status}): ${errorBody}`);
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data: ApiResponse = await response.json();
    
    const allItems = data.items.filter(item => item.title && item.link && item.pubDate && item.guid).map(item => {
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

    // Sort by date (most recent first) and take the top 9
    const sortedItems = allItems.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
    return sortedItems.slice(0, 9);

  } catch (error) {
    console.error("[EducationPage] Failed to fetch or parse feed from API:", error);
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
  const items = await getFeedItemsFromApi(); // Fetch from internal API

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

// Remove the previous direct revalidate as it's handled by fetch now
// export const revalidate = 3600; 