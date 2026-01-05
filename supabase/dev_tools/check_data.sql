-- Check if any upcoming trips exist
SELECT 
    COUNT(*) as total_upcoming_trips 
FROM 
    public.trips 
WHERE 
    status = 'upcoming';

-- Check if any drivers exist
SELECT 
    COUNT(*) as total_drivers 
FROM 
    public.drivers;

-- Check a sample join (simulating the search query)
SELECT 
    t.id as trip_id, 
    t.status, 
    t.available_seats,
    d.id as driver_id,
    u.full_name as driver_name
FROM 
    public.trips t
LEFT JOIN 
    public.drivers d ON t.driver_id = d.id
LEFT JOIN 
    public.users u ON d.user_id = u.id
WHERE 
    t.status = 'upcoming'
LIMIT 5;
