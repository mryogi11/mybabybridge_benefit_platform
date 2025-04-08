-- Migration to create tables for provider availability

-- Table for recurring weekly schedules
CREATE TABLE public.provider_weekly_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
    -- Day of the week (e.g., 0 for Sunday, 1 for Monday, ..., 6 for Saturday)
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time TIME WITHOUT TIME ZONE NOT NULL,
    end_time TIME WITHOUT TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    -- Ensure a provider doesn't have overlapping schedules for the same day
    CONSTRAINT unique_provider_day_time UNIQUE (provider_id, day_of_week, start_time, end_time),
    -- Ensure end time is after start time
    CONSTRAINT check_schedule_times CHECK (end_time > start_time)
);

-- Add index for faster lookups by provider and day
CREATE INDEX idx_provider_weekly_schedules_provider_day ON public.provider_weekly_schedules(provider_id, day_of_week);

-- Table for specific time blocks (overrides/unavailability)
CREATE TABLE public.provider_time_blocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
    start_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    end_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    reason TEXT, -- Optional reason (e.g., 'Lunch', 'Vacation', 'Meeting')
    is_unavailable BOOLEAN DEFAULT TRUE NOT NULL, -- Could potentially use this for specific available blocks too
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    -- Ensure end datetime is after start datetime
    CONSTRAINT check_block_times CHECK (end_datetime > start_datetime)
);

-- Add index for faster lookups by provider and time range
CREATE INDEX idx_provider_time_blocks_provider_time ON public.provider_time_blocks(provider_id, start_datetime, end_datetime);

-- RLS Policies (Examples - Adjust as needed)

-- provider_weekly_schedules
ALTER TABLE public.provider_weekly_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers can manage their own weekly schedules" 
ON public.provider_weekly_schedules
FOR ALL
USING ( (SELECT p.user_id FROM public.providers p WHERE p.id = provider_id) = auth.uid() )
WITH CHECK ( (SELECT p.user_id FROM public.providers p WHERE p.id = provider_id) = auth.uid() );

-- Patients might need to read schedules indirectly via a function, or allow broader read access if needed
-- CREATE POLICY "Allow authenticated read access to schedules" 
-- ON public.provider_weekly_schedules
-- FOR SELECT USING (auth.role() = 'authenticated');

-- provider_time_blocks
ALTER TABLE public.provider_time_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers can manage their own time blocks" 
ON public.provider_time_blocks
FOR ALL
USING ( (SELECT p.user_id FROM public.providers p WHERE p.id = provider_id) = auth.uid() )
WITH CHECK ( (SELECT p.user_id FROM public.providers p WHERE p.id = provider_id) = auth.uid() );

-- CREATE POLICY "Allow authenticated read access to time blocks" 
-- ON public.provider_time_blocks
-- FOR SELECT USING (auth.role() = 'authenticated');

-- Trigger for updated_at on provider_weekly_schedules
-- Ensure the function exists (it's likely created in another migration)
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_updated_at') AND NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'handle_weekly_schedules_updated_at' AND tgrelid = 'public.provider_weekly_schedules'::regclass
    ) THEN
        CREATE TRIGGER handle_weekly_schedules_updated_at
            BEFORE UPDATE ON public.provider_weekly_schedules
            FOR EACH ROW
            EXECUTE FUNCTION public.handle_updated_at();
    END IF;
END $$;
