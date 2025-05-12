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
        actionType: 'PAYMENT_METHOD_ATTACH_UNAUTHORIZED',
        status: 'FAILURE',
        description: 'Unauthorized attempt to attach payment method.',
        details: { error: userError }
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { paymentMethodId, customerId } = await request.json();

    // In a real implementation, we would attach the payment method to the customer in Stripe
    // For now, we'll just return a success message
    
    await createActivityLog({
      userId: user.id,
      userEmail: user.email,
      actionType: 'PAYMENT_METHOD_ATTACH',
      status: 'SUCCESS',
      description: `Payment method attached for user ${user.email}.`,
      details: { userId: user.id, paymentMethodId, customerId }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error attaching payment method:', error);
    await createActivityLog({
      actionType: 'PAYMENT_METHOD_ATTACH_FAILURE',
      status: 'FAILURE',
      description: `Error attaching payment method. Error: ${error}`,
      details: { error }
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 