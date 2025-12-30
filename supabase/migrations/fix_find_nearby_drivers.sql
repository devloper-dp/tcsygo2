-- ============================================
-- Fix find_nearby_drivers Function Type Mismatch
-- Description: Fix return type mismatch in find_nearby_drivers function
-- ============================================

-- Drop and recreate the function with correct types
DROP FUNCTION IF EXISTS public.find_nearby_drivers(NUMERIC, NUMERIC, INTEGER, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.find_nearby_drivers(
  p_lat NUMERIC,
  p_lng NUMERIC,
  p_radius INTEGER DEFAULT 5000,
  p_vehicle_type TEXT DEFAULT NULL,
  p_organization TEXT DEFAULT NULL
)
RETURNS TABLE (
  driver_id UUID,
  distance_meters DOUBLE PRECISION,
  driver_name TEXT,
  driver_rating NUMERIC,
  vehicle_info TEXT,
  current_lat NUMERIC,
  current_lng NUMERIC,
  organization TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id AS driver_id,
    (
      6371000 * acos(
        cos(radians(p_lat)) * cos(radians(da.current_lat)) *
        cos(radians(da.current_lng) - radians(p_lng)) +
        sin(radians(p_lat)) * sin(radians(da.current_lat))
      )
    )::DOUBLE PRECISION AS distance_meters,
    u.full_name AS driver_name,
    d.rating AS driver_rating,
    d.vehicle_make || ' ' || d.vehicle_model AS vehicle_info,
    da.current_lat,
    da.current_lng,
    u.organization
  FROM public.drivers d
  JOIN public.driver_availability da ON da.driver_id = d.id
  JOIN public.users u ON u.id = d.user_id
  WHERE da.is_online = true
    AND da.is_available = true
    AND (p_vehicle_type IS NULL OR d.vehicle_type = p_vehicle_type)
    AND (p_organization IS NULL OR u.organization = p_organization)
    AND (
      6371000 * acos(
        cos(radians(p_lat)) * cos(radians(da.current_lat)) *
        cos(radians(da.current_lng) - radians(p_lng)) +
        sin(radians(p_lat)) * sin(radians(da.current_lat))
      )
    ) <= p_radius
  ORDER BY distance_meters ASC
  LIMIT 10;
END;
$$;

-- ============================================
-- COMPLETION
-- ============================================
DO $$
BEGIN
  RAISE NOTICE 'find_nearby_drivers function fixed successfully.';
END $$;
