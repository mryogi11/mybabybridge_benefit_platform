// import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { Database } from '@/types/supabase';
import { createActivityLog } from '@/lib/actions/loggingActions';

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value;
                },
                set(name: string, value: string, options: any) {
                    cookieStore.set({ name, value, ...options });
                },
                remove(name: string, options: any) {
                    cookieStore.set({ name, value: '', ...options });
                },
            },
        }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      await createActivityLog({
        actionType: 'PAYMENT_METHODS_FETCH_UNAUTHORIZED',
        status: 'FAILURE',
        description: 'Unauthorized attempt to fetch payment methods.',
        details: { error: userError }
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // In a real implementation, we would fetch payment methods from Stripe
    // For now, we'll return dummy data
    await createActivityLog({
      userId: user.id,
      userEmail: user.email,
      actionType: 'PAYMENT_METHODS_FETCH',
      status: 'SUCCESS',
      description: `Fetched payment methods for user ${user.email}.`,
      details: { userId: user.id }
    });
    return NextResponse.json({ 
      data: [
        {
          id: 'pm_mock_1',
          card: {
            brand: 'visa',
            last4: '4242',
            exp_month: 12,
            exp_year: 2025
          },
          billing_details: {
            name: 'Test User'
          },
          created: new Date().getTime() / 1000,
          is_default: true
        }
      ] 
    });
  } catch (error) {
    await createActivityLog({
      actionType: 'PAYMENT_METHODS_FETCH_FAILURE',
      status: 'FAILURE',
      description: `Error fetching payment methods. Error: ${error}`,
      details: { error }
    });
    console.error('Error fetching payment methods:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 