'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  Button,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  IconButton,
  Divider,
  ListItem,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import { supabase } from '@/lib/supabase/client';
import { format } from 'date-fns';

interface PaymentMethod {
  id: string;
  user_id: string;
  provider_id: string;
  type: 'credit_card' | 'debit_card' | 'bank_account';
  last_four: string;
  expiry_month?: number;
  expiry_year?: number;
  is_default: boolean;
}

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  description: string;
  created_at: string;
  patient_id: string | null;
  provider_id: string | null;
  patient: {
    first_name: string;
    last_name: string;
  } | null;
}

interface Subscription {
  id: string;
  status: 'active' | 'cancelled' | 'expired' | 'pending';
  start_date: string;
  end_date: string | null;
  billing_cycle: 'monthly' | 'quarterly' | 'yearly';
  next_billing_date: string | null;
  patient_id: string | null;
  provider_id: string | null;
  patient: {
    first_name: string;
    last_name: string;
  } | null;
}

export default function ProviderPaymentsPage() {
  const [loading, setLoading] = useState(true);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [addPaymentMethodDialog, setAddPaymentMethodDialog] = useState(false);
  const [newPaymentMethod, setNewPaymentMethod] = useState({
    type: 'credit_card',
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
  });

  useEffect(() => {
    fetchPaymentData();
  }, []);

  const fetchPaymentData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch provider details
    const { data: providerData, error: providerError } = await supabase
      .from('providers')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (providerError) {
      console.error('Error fetching provider:', providerError);
      return;
    }

    // Fetch payments
    const { data: paymentsData, error: paymentsError } = await supabase
      .from('payments' as any)
      .select(`
        *,
        patient:patient_id (
          first_name,
          last_name
        )
      `)
      .eq('provider_id', providerData.id)
      .order('created_at', { ascending: false });

    if (paymentsError) {
      console.error('Error fetching payments:', paymentsError);
      return;
    }

    setPayments(paymentsData as any);

    // Fetch subscriptions
    const { data: subscriptionsData, error: subscriptionsError } = await supabase
      .from('subscriptions' as any)
      .select(`
        *,
        patient:patient_id (
          first_name,
          last_name
        )
      `)
      .eq('provider_id', providerData.id)
      .order('created_at', { ascending: false });

    if (subscriptionsError) {
      console.error('Error fetching subscriptions:', subscriptionsError);
      return;
    }

    setSubscriptions(subscriptionsData as any);
    setLoading(false);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Stack spacing={3}>
        <Typography variant="h4">Payment Management</Typography>

        {/* Payment Methods */}
        <Card>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Payment Methods</Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setAddPaymentMethodDialog(true)}
              >
                Add Payment Method
              </Button>
            </Stack>
            <Stack spacing={2}>
              {paymentMethods.map((method) => (
                <ListItem
                  key={method.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                  }}
                >
                  <Stack direction="row" spacing={2} alignItems="center">
                    <CreditCardIcon />
                    <Box>
                      <Typography variant="subtitle1">
                        {method.type === 'credit_card' ? 'Credit Card' : 'Debit Card'} ending in {method.last_four}
                      </Typography>
                      {method.is_default && (
                        <Chip label="Default" size="small" sx={{ ml: 1 }} />
                      )}
                    </Box>
                  </Stack>
                  <Stack direction="row">
                    {/* {!method.is_default && (
                      <Button
                        size="small"
                        onClick={() => handleSetDefaultPaymentMethod(method.id)}
                      >
                        Set as Default
                      </Button>
                    )} */}
                    {/* <IconButton onClick={() => handleDeletePaymentMethod(method.id)}>
                      <DeleteIcon />
                    </IconButton> */}
                  </Stack>
                </ListItem>
              ))}
            </Stack>
          </CardContent>
        </Card>

        {/* Active Subscriptions */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Active Subscriptions
            </Typography>
            <Stack spacing={2}>
              {subscriptions.map((subscription) => (
                <Box
                  key={subscription.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                  }}
                >
                  <Box>
                    <Typography variant="subtitle1">
                      {subscription.patient?.first_name} {subscription.patient?.last_name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {subscription.billing_cycle.charAt(0).toUpperCase() + subscription.billing_cycle.slice(1)} Subscription
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Next billing date: {format(new Date(subscription.next_billing_date || ''), 'MMM d, yyyy')}
                    </Typography>
                  </Box>
                  <Chip
                    label={subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                    color={subscription.status === 'active' ? 'success' : 'default'}
                  />
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>

        {/* Payment History */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Payment History
            </Typography>
            <Stack spacing={2}>
              {payments.map((payment) => (
                <Box
                  key={payment.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                  }}
                >
                  <Box>
                    <Typography variant="subtitle1">
                      {payment.patient?.first_name} {payment.patient?.last_name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {payment.description}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {format(new Date(payment.created_at), 'MMM d, yyyy')}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Typography variant="subtitle1">
                      ${payment.amount.toFixed(2)} {payment.currency}
                    </Typography>
                    <Chip
                      label={payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                      color={
                        payment.status === 'completed' ? 'success' :
                        payment.status === 'failed' ? 'error' :
                        payment.status === 'refunded' ? 'warning' : 'default'
                      }
                    />
                  </Stack>
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
      </Stack>

      {/* Add Payment Method Dialog */}
      <Dialog open={addPaymentMethodDialog} onClose={() => setAddPaymentMethodDialog(false)}>
        <DialogTitle>Add Payment Method</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <TextField
              label="Card Number"
              fullWidth
              value={newPaymentMethod.cardNumber}
              onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, cardNumber: e.target.value })}
            />
            <Stack direction="row" spacing={2}>
              <TextField
                label="Expiry Month"
                fullWidth
                value={newPaymentMethod.expiryMonth}
                onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, expiryMonth: e.target.value })}
              />
              <TextField
                label="Expiry Year"
                fullWidth
                value={newPaymentMethod.expiryYear}
                onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, expiryYear: e.target.value })}
              />
            </Stack>
            <TextField
              label="CVV"
              fullWidth
              value={newPaymentMethod.cvv}
              onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, cvv: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddPaymentMethodDialog(false)}>Cancel</Button>
          {/* <Button onClick={handleAddPaymentMethod} variant="contained">
            Add Method
          </Button> */}
        </DialogActions>
      </Dialog>
    </Box>
  );
} 