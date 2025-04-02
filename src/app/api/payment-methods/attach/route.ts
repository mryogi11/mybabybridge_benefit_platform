import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { paymentMethodId, customerId } = await request.json();

    // In a real implementation, we would attach the payment method to the customer in Stripe
    // For now, we'll just return a success message
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error attaching payment method:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 