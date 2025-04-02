-- Create payment methods table
CREATE TABLE payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    provider_id UUID REFERENCES providers(id),
    stripe_payment_method_id TEXT NOT NULL,
    card_brand TEXT,
    last4 TEXT,
    exp_month INTEGER,
    exp_year INTEGER,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create subscriptions table
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id),
    provider_id UUID REFERENCES providers(id),
    stripe_subscription_id TEXT NOT NULL,
    stripe_customer_id TEXT NOT NULL,
    status TEXT CHECK (status IN ('active', 'canceled', 'past_due', 'unpaid')),
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create subscription plans table
CREATE TABLE subscription_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    stripe_price_id TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'usd',
    interval TEXT CHECK (interval IN ('month', 'year')),
    features JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create transactions table
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subscription_id UUID REFERENCES subscriptions(id),
    patient_id UUID REFERENCES patients(id),
    provider_id UUID REFERENCES providers(id),
    stripe_transaction_id TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'usd',
    status TEXT CHECK (status IN ('succeeded', 'failed', 'pending', 'refunded')),
    payment_method_id UUID REFERENCES payment_methods(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create invoices table
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subscription_id UUID REFERENCES subscriptions(id),
    patient_id UUID REFERENCES patients(id),
    provider_id UUID REFERENCES providers(id),
    stripe_invoice_id TEXT NOT NULL,
    amount_due DECIMAL(10,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'usd',
    status TEXT CHECK (status IN ('draft', 'open', 'paid', 'uncollectible', 'void')),
    due_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create insurance information table
CREATE TABLE insurance_information (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id),
    provider_id UUID REFERENCES providers(id),
    insurance_provider TEXT NOT NULL,
    policy_number TEXT NOT NULL,
    group_number TEXT,
    policy_holder_name TEXT NOT NULL,
    policy_holder_dob DATE NOT NULL,
    policy_holder_ssn TEXT,
    coverage_start_date DATE NOT NULL,
    coverage_end_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_payment_methods_user ON payment_methods(user_id);
CREATE INDEX idx_payment_methods_provider ON payment_methods(provider_id);
CREATE INDEX idx_subscriptions_patient ON subscriptions(patient_id);
CREATE INDEX idx_subscriptions_provider ON subscriptions(provider_id);
CREATE INDEX idx_transactions_subscription ON transactions(subscription_id);
CREATE INDEX idx_transactions_patient ON transactions(patient_id);
CREATE INDEX idx_transactions_provider ON transactions(provider_id);
CREATE INDEX idx_invoices_subscription ON invoices(subscription_id);
CREATE INDEX idx_invoices_patient ON invoices(patient_id);
CREATE INDEX idx_invoices_provider ON invoices(provider_id);
CREATE INDEX idx_insurance_patient ON insurance_information(patient_id);
CREATE INDEX idx_insurance_provider ON insurance_information(provider_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers
CREATE TRIGGER update_payment_methods_updated_at
    BEFORE UPDATE ON payment_methods
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscription_plans_updated_at
    BEFORE UPDATE ON subscription_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_insurance_information_updated_at
    BEFORE UPDATE ON insurance_information
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create RLS policies
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_information ENABLE ROW LEVEL SECURITY;

-- Payment methods policies
CREATE POLICY "Users can view their own payment methods"
    ON payment_methods FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM providers
            WHERE providers.id = payment_methods.provider_id
            AND providers.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage their own payment methods"
    ON payment_methods FOR ALL
    TO authenticated
    USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM providers
            WHERE providers.id = payment_methods.provider_id
            AND providers.user_id = auth.uid()
        )
    );

-- Subscriptions policies
CREATE POLICY "Users can view their own subscriptions"
    ON subscriptions FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM patients
            WHERE patients.id = subscriptions.patient_id
            AND patients.user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM providers
            WHERE providers.id = subscriptions.provider_id
            AND providers.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage their own subscriptions"
    ON subscriptions FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM patients
            WHERE patients.id = subscriptions.patient_id
            AND patients.user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM providers
            WHERE providers.id = subscriptions.provider_id
            AND providers.user_id = auth.uid()
        )
    );

-- Subscription plans policies
CREATE POLICY "Anyone can view subscription plans"
    ON subscription_plans FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Only providers can manage subscription plans"
    ON subscription_plans FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM providers
            WHERE providers.user_id = auth.uid()
        )
    );

-- Transactions policies
CREATE POLICY "Users can view their own transactions"
    ON transactions FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM patients
            WHERE patients.id = transactions.patient_id
            AND patients.user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM providers
            WHERE providers.id = transactions.provider_id
            AND providers.user_id = auth.uid()
        )
    );

-- Invoices policies
CREATE POLICY "Users can view their own invoices"
    ON invoices FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM patients
            WHERE patients.id = invoices.patient_id
            AND patients.user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM providers
            WHERE providers.id = invoices.provider_id
            AND providers.user_id = auth.uid()
        )
    );

-- Insurance information policies
CREATE POLICY "Users can view their own insurance information"
    ON insurance_information FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM patients
            WHERE patients.id = insurance_information.patient_id
            AND patients.user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM providers
            WHERE providers.id = insurance_information.provider_id
            AND providers.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage their own insurance information"
    ON insurance_information FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM patients
            WHERE patients.id = insurance_information.patient_id
            AND patients.user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM providers
            WHERE providers.id = insurance_information.provider_id
            AND providers.user_id = auth.uid()
        )
    ); 