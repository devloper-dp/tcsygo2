-- Create a function to calculate total revenue
CREATE OR REPLACE FUNCTION get_total_revenue()
RETURNS numeric
LANGUAGE sql
AS $$
  SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'success';
$$;
