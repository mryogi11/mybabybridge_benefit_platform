import React from 'react';
import { Box, Typography, Link as MuiLink, Container, Paper, Divider, CardMedia } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import NextLink from 'next/link';

// Must match API response structure and listing page definition
interface FeedItem {
  title: string;
  link: string;
  pubDate: string;
  content?: string;
  contentSnippet?: string;
  guid: string;
  imageUrl?: string;
  creator?: string;
}

// Define the structure of the API response item more comprehensively
interface RssParserItem {
    title: string;
    link: string;
    pubDate: string;
    content?: string;
    'content:encoded'?: string;
    contentSnippet?: string;
    guid: string;
    enclosure?: { url: string; [key: string]: any };
    'media:content'?: { $: { url: string; [key: string]: any }; [key: string]: any };
    creator?: string;
    'dc:creator'?: string;
    [key: string]: any; // Allow other properties
}

// Matching API response structure
interface ApiResponse {
  items: RssParserItem[];
  title?: string;
  description?: string;
  link?: string;
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
  return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
}

// Helper function to strip HTML links, keeping their text content
function stripHtmlLinks(htmlContent?: string): string {
  if (!htmlContent) return '';
  return htmlContent.replace(/<a\b[^>]*>(.*?)<\/a>/gi, '$1');
}

async function getFeedItemBySlugFromApi(slug: string, searchParams?: { [key: string]: string | string[] | undefined }): Promise<FeedItem | null> {
  const baseUrl = getBaseUrl();
  const apiUrl = `${baseUrl}/api/rss-proxy`;
  console.log(`[EducationDetailPage] Fetching feed from API: ${apiUrl} to find slug: ${slug}`);

  const passedImageUrl = searchParams?.imageUrl as string || undefined;

  try {
    const response = await fetch(apiUrl, {
      next: { revalidate: 3600 }, // Cache for an hour
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[EducationDetailPage] API Error (${response.status}): ${errorBody}`);
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data: ApiResponse = await response.json();
    const decodedSlug = decodeURIComponent(slug);

    const foundItem = data.items.find(item => {
      if (!item.guid) return false;
      const itemSlug = createSlug(item.guid); // createSlug needs to be available
      return itemSlug === decodedSlug;
    });

    if (foundItem) {
      console.log('[EducationDetailPage] Found item:', JSON.stringify(foundItem, null, 2)); // Log the found item
      
      let finalImageUrl = passedImageUrl;
      if (!finalImageUrl) {
        finalImageUrl = foundItem.enclosure?.url || 
                        foundItem['media:content']?.$?.url || 
                        extractFirstImageUrl(foundItem['content:encoded'] || foundItem.content) || 
                        '/images/blog_placeholder.jpg'; // Fallback to placeholder
      }

      return {
        title: foundItem.title!,
        link: foundItem.link!,
        pubDate: foundItem.pubDate!,
        content: foundItem['content:encoded'] || foundItem.content || foundItem.contentSnippet,
        contentSnippet: foundItem.contentSnippet,
        guid: foundItem.guid!,
        imageUrl: finalImageUrl,
        creator: foundItem.creator || foundItem['dc:creator'] || undefined,
      };
    }
    return null;

  } catch (error) {
    console.error("[EducationDetailPage] Failed to fetch or parse feed from API for slug:", error);
    return null;
  }
}

// Duplicating slug creation logic. Refactor candidate.
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

interface EducationDetailPageProps {
  params: {
    id: string; // This is the slug
  };
  searchParams?: { // Added searchParams for query parameters
    imageUrl?: string;
  };
}

export default async function EducationDetailPage({ params, searchParams }: EducationDetailPageProps) {
  const item = await getFeedItemBySlugFromApi(params.id, searchParams); // Pass searchParams

  if (!item) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h5" color="error">
          Resource not found.
        </Typography>
        <MuiLink component={NextLink} href="/dashboard/education" sx={{ display: 'flex', alignItems: 'center', mt: 2, textDecoration: 'none', color: 'inherit' }}>
            <ArrowBackIcon sx={{ mr: 1 }} />
            Back to Resources
        </MuiLink>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: { xs: 2, md: 4 } }}>
        <MuiLink component={NextLink} href="/dashboard/education" sx={{ display: 'flex', alignItems: 'center', mb: 2, textDecoration: 'none', color: 'inherit' }}>
            <ArrowBackIcon sx={{ mr: 1 }} />
            Back to Resources
        </MuiLink>

        {/* Display Image if available */}
        {item.imageUrl && (
          <CardMedia
            component="img"
            height="300" // Consider a different height for detail page
            image={item.imageUrl}
            alt={item.title}
            sx={{ width: '100%', objectFit: 'cover', mb: 3, borderRadius: 1 }}
          />
        )}

        <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 'bold', mb: 1 }}>
          {item.title}
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary', mb: 2 }}>
          {item.creator && (
            <Typography variant="subtitle2" component="span" sx={{ mr: 1 }}>
              By {item.creator}
            </Typography>
          )}
          {item.creator && item.pubDate && (
            <Typography variant="subtitle2" component="span" sx={{ mr: 1 }}>
              •
            </Typography>
          )}
          {item.pubDate && (
            <Typography variant="subtitle2" component="span">
              {new Date(item.pubDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </Typography>
          )}
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Render HTML content if available, otherwise show snippet */}
        {item.content ? (
          <Box
            dangerouslySetInnerHTML={{ __html: stripHtmlLinks(item.content) }}
            sx={{
              '& img': { maxWidth: '100%', height: 'auto', my: 2, borderRadius: '4px' },
              '& p': { lineHeight: 1.7, mb: 2, fontSize: '1rem' },
              '& h1, & h2, & h3, & h4, & h5, & h6': { my: 2.5, lineHeight: 1.3, fontWeight: 'bold' },
              lineHeight: 1.7, // General line height for content not in P tags
              fontSize: '1rem' // General font size
            }}
          />
        ) : item.contentSnippet ? (
          <Typography paragraph>{item.contentSnippet}</Typography>
        ) : (
          <Typography>No detailed content available for this item.</Typography>
        )}
      </Paper>
    </Container>
  );
}

// generateStaticParams might also need to use the API route now, or be removed if content is too dynamic
// export async function generateStaticParams() {
//   // ... fetch from /api/rss-proxy ...
// } 