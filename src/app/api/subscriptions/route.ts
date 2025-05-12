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
            actionType: 'create_subscription_attempt',
            status: 'FAILURE',
            details: { error: 'Unauthorized' },
        });
      }
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { priceId, customerId } = await request.json();

    if (!priceId || !customerId) {
      const missingFields = [];
      if (!priceId) missingFields.push('priceId');
      if (!customerId) missingFields.push('customerId');
      const errorDetail = `Missing required fields: ${missingFields.join(', ')}`;
      await createActivityLog({
          userId: user.id,
          actionType: 'create_subscription',
          status: 'FAILURE',
          details: { error: errorDetail, requestBody: { priceId, customerId } },
      });
      return NextResponse.json({ error: errorDetail }, { status: 400 });
    }

    const mockSubscriptionId = 'sub_mock_' + Date.now();
    const mockSubscriptionEndTime = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;

    await createActivityLog({
        userId: user.id,
        actionType: 'create_subscription',
        status: 'SUCCESS',
        details: { 
          priceId: priceId, 
          customerId: customerId,
          mockSubscriptionId: mockSubscriptionId,
          mockSubscriptionEndTime: mockSubscriptionEndTime
        },
        targetEntityType: 'Subscription',
        targetEntityId: mockSubscriptionId
    });
    
    return NextResponse.json({ 
      success: true,
      subscription: {
        id: mockSubscriptionId,
        status: 'active',
        current_period_end: mockSubscriptionEndTime
      }
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    await createActivityLog({
        userId: userId || 'unknown',
        actionType: 'create_subscription',
        status: 'FAILURE',
        details: { error: error instanceof Error ? error.message : String(error) },
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 