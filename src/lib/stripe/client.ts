import { loadStripe, Stripe } from '@stripe/stripe-js';

let stripePromise: Promise<Stripe | null>;

export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
  }
  return stripePromise;
};

// This function needs to be used with Stripe Elements
// For direct API calls, use the server-side API
export const createPaymentMethod = async (elements: any, stripe: Stripe | null) => {
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