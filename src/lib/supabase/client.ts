import { createBrowserClient } from '@supabase/ssr';
import { Database } from '@/types/supabase'; // Assuming your Database type definition

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL')
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

// Create a singleton instance of the Supabase client for the browser
// Note: This pattern assumes you import `supabase` directly where needed.
// If you use a context provider, initialize it there.
let supabaseSingleton: ReturnType<typeof createBrowserClient<Database>> | null = null;

function getSupabaseBrowserClient() {
  if (supabaseSingleton) {
    return supabaseSingleton;
  }

  supabaseSingleton = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  return supabaseSingleton;
}

// Export the function to get the client instance
export const supabase = getSupabaseBrowserClient();

// You might also export the function itself if needed elsewhere
// export { getSupabaseBrowserClient }; 