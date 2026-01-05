DO $$
DECLARE
  pub_name TEXT := 'supabase_realtime';
  tables TEXT[] := ARRAY['public.live_locations', 'public.bookings', 'public.trips', 'public.ride_requests', 'public.messages', 'public.notifications'];
  tbl TEXT;
BEGIN
  -- Ensure publication exists
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = pub_name) THEN
    EXECUTE 'CREATE PUBLICATION ' || pub_name;
  END IF;

  FOREACH tbl IN ARRAY tables LOOP
    BEGIN
      EXECUTE 'ALTER PUBLICATION ' || pub_name || ' ADD TABLE ' || tbl;
    EXCEPTION WHEN duplicate_object THEN
      -- Table already in publication, ignore
      RAISE NOTICE 'Table % already in publication', tbl;
    WHEN OTHERS THEN
       -- Handle other errors possibly (e.g. table doesn't exist)
       RAISE NOTICE 'Error adding % to publication: %', tbl, SQLERRM;
    END;
  END LOOP;
END $$;
