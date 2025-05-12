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

### Database Setup 