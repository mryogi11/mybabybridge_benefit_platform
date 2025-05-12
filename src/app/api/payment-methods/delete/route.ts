import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { Database } from '@/types/supabase';
import { activityLogs } from '@/lib/db/schema/activityLog';
import { createActivityLog } from '@/lib/actions/loggingActions';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  let userId: string | undefined = undefined;
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
    userId = user?.id;

    if (userError || !user) {
      if (userId) {
         await createActivityLog({
            userId: userId,
            actionType: 'delete_payment_method_attempt',
            status: 'FAILURE',
            details: { error: 'Unauthorized' },
        });
      }
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { paymentMethodId } = await request.json();

    if (!paymentMethodId) {
        await createActivityLog({
            userId: user.id,
            actionType: 'delete_payment_method',
            status: 'FAILURE',
            details: { error: 'Missing paymentMethodId' },
        });
        return NextResponse.json({ error: 'Missing paymentMethodId' }, { status: 400 });
    }

    await createActivityLog({
        userId: user.id,
        actionType: 'delete_payment_method',
        status: 'SUCCESS',
        details: { paymentMethodId: paymentMethodId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting payment method:', error);
    await createActivityLog({
        userId: userId || 'unknown',
        actionType: 'delete_payment_method',
        status: 'FAILURE',
        details: { error: error instanceof Error ? error.message : String(error) },
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 