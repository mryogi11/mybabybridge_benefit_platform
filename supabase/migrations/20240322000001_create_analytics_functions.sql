-- Function to get provider revenue
CREATE OR REPLACE FUNCTION get_provider_revenue(
  provider_id UUID,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE (
  date DATE,
  amount DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE_TRUNC('day', a.date)::DATE as date,
    COALESCE(SUM(p.price), 0) as amount
  FROM appointments a
  LEFT JOIN patient_packages pp ON a.patient_id = pp.patient_id
  LEFT JOIN packages p ON pp.package_id = p.id
  WHERE a.provider_id = $1
    AND a.date >= $2
    AND a.date <= $3
    AND a.status = 'completed'
  GROUP BY DATE_TRUNC('day', a.date)::DATE
  ORDER BY date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get treatment success rates
CREATE OR REPLACE FUNCTION get_treatment_success_rates(
  provider_id UUID,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE (
  status TEXT,
  count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tm.status::TEXT,
    COUNT(*)::BIGINT
  FROM treatment_milestones tm
  JOIN treatment_plans tp ON tm.treatment_plan_id = tp.id
  WHERE tp.provider_id = $1
    AND tm.created_at >= $2
    AND tm.created_at <= $3
  GROUP BY tm.status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get patient progress
CREATE OR REPLACE FUNCTION get_patient_progress(
  provider_id UUID,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE (
  month DATE,
  completed BIGINT,
  in_progress BIGINT,
  pending BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH monthly_stats AS (
    SELECT 
      DATE_TRUNC('month', tm.created_at)::DATE as month,
      COUNT(*) FILTER (WHERE tm.status = 'completed') as completed,
      COUNT(*) FILTER (WHERE tm.status = 'in_progress') as in_progress,
      COUNT(*) FILTER (WHERE tm.status = 'pending') as pending
    FROM treatment_milestones tm
    JOIN treatment_plans tp ON tm.treatment_plan_id = tp.id
    WHERE tp.provider_id = $1
      AND tm.created_at >= $2
      AND tm.created_at <= $3
    GROUP BY DATE_TRUNC('month', tm.created_at)::DATE
  )
  SELECT 
    month,
    COALESCE(completed, 0)::BIGINT,
    COALESCE(in_progress, 0)::BIGINT,
    COALESCE(pending, 0)::BIGINT
  FROM monthly_stats
  ORDER BY month;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get appointment statistics
CREATE OR REPLACE FUNCTION get_appointment_stats(
  provider_id UUID,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE (
  status TEXT,
  count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.status::TEXT,
    COUNT(*)::BIGINT
  FROM appointments a
  WHERE a.provider_id = $1
    AND a.date >= $2
    AND a.date <= $3
  GROUP BY a.status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add RLS policies for analytics functions
ALTER FUNCTION get_provider_revenue(UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) SET search_path = public;
ALTER FUNCTION get_treatment_success_rates(UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) SET search_path = public;
ALTER FUNCTION get_patient_progress(UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) SET search_path = public;
ALTER FUNCTION get_appointment_stats(UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) SET search_path = public;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_provider_revenue(UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_treatment_success_rates(UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_patient_progress(UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_appointment_stats(UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) TO authenticated; 