import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { Database } from '@/types/supabase';
import { createActivityLog } from '@/lib/actions/loggingActions';

export async function POST(request: Request) {
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
        actionType: 'PAYMENT_METHOD_SET_DEFAULT_UNAUTHORIZED',
        status: 'FAILURE',
        description: 'Unauthorized attempt to set default payment method.',
        details: { error: userError }
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { payment_method_id, customer_id } = await request.json();

    // API call to Stripe would go here in a real implementation
    // For now, we'll just return a success message
    
    await createActivityLog({
      userId: user.id,
      userEmail: user.email,
      actionType: 'PAYMENT_METHOD_SET_DEFAULT',
      status: 'SUCCESS',
      description: `Set default payment method for user ${user.email}.`,
      details: { userId: user.id, payment_method_id, customer_id }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error setting default payment method:', error);
    await createActivityLog({
      actionType: 'PAYMENT_METHOD_SET_DEFAULT_FAILURE',
      status: 'FAILURE',
      description: `Error setting default payment method. Error: ${error}`,
      details: { error }
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 