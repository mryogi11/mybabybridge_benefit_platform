import { loadStripe, Stripe as StripeJs } from '@stripe/stripe-js';

let stripeJsPromise: Promise<StripeJs | null>;

// Frontend Stripe Client Loader
export const getStripe = (): Promise<StripeJs | null> => {
  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    throw new Error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is missing from environment variables.');
  }
  if (!stripeJsPromise) {
    stripeJsPromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
  }
  return stripeJsPromise;
};

// This function needs to be used with Stripe Elements
// For direct API calls, use the server-side API
export const createPaymentMethod = async (elements: any, stripe: StripeJs | null) => {
  if (!stripe || !elements) throw new Error('Stripe not initialized or Elements not available');

  const cardElement = elements.getElement('card');
  
  return await stripe.createPaymentMethod({
    type: 'card',
    card: cardElement,
  });
};

// Function to create a subscription
export async function createSubscription(customerId: string, priceId: string) {
  try {
    const response = await fetch('/api/stripe/create-subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customerId,
        priceId,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create subscription');
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating subscription:', error);
    throw error;
  }
}

// Function to attach payment method to customer
export async function attachPaymentMethodToCustomer(
  paymentMethodId: string,
  customerId: string
) {
  const response = await fetch('/api/payment-methods/attach', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      paymentMethodId,
      customerId,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  return response.json();
}

// Function to set default payment method
export async function setDefaultPaymentMethod(
  paymentMethodId: string,
  customerId: string
) {
  const response = await fetch('/api/payment-methods/default', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      paymentMethodId,
      customerId,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  return response.json();
}

// Function to delete payment method
export async function deletePaymentMethod(paymentMethodId: string) {
  const response = await fetch('/api/payment-methods/delete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      paymentMethodId,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  return response.json();
} 