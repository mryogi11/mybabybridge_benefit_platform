### Environment Variables

Copy the `.env.example` file to `.env.local` and populate it with your Supabase project URL and anon key.

```bash
cp .env.example .env.local
```

Fill in the following variables in `.env.local`:

*   `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL.
*   `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase project anon key.
*   `SUPABASE_SERVICE_ROLE_KEY`: (Optional, needed for specific admin actions like user sync API) Your Supabase service role key.

#### Google Analytics (Optional)

To enable Google Analytics tracking:

1.  Create a Google Analytics 4 property and obtain your Measurement ID (e.g., `G-XXXXXXXXXX`).
2.  Add the Measurement ID to your `.env.local` file:

    ```
    NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX 
    ```

    *(Replace `G-XXXXXXXXXX` with your actual ID. The `NEXT_PUBLIC_` prefix is required.)*

3.  Refer to `docs/ANALYTICS_SETUP.md` for detailed implementation steps.

### Key Features

*   **Patient Dashboard:** View benefits, package progress, appointments, and educational resources.
*   **Benefit Verification:** Step-by-step flow to verify employer/plan benefits.
*   **Educational Resources:** Access to articles and news on fertility and wellness. Sourced via RSS feed (`/api/rss-proxy`). Features include:
    *   Listing page (`/dashboard/education`) with clickable cards displaying title, snippet, and image (or placeholder).
    *   Detail page (`/dashboard/education/[slug]`) showing the full article content (hyperlinks removed) with a loading indicator during navigation.
    *   Images extracted from feed metadata or content; uses `public/images/blog_placeholder.jpg` as a fallback.
*   **Admin Module:** Manage users, organizations, packages, providers, and view basic analytics/logs.
*   **Provider Module:** Manage profile, availability, appointments, and patient communication.

### Database Setup 