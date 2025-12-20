
import {
    User, Driver, Trip, Booking, Payment, LiveLocation, SOSAlert,
    UserRole, TripStatus, BookingStatus, PaymentStatus, VerificationStatus
} from '@shared/schema';

// Mock Data Store
const STORAGE_KEY = 'tcsygo_mock_store';

const defaultStore = {
    users: [] as User[],
    drivers: [] as Driver[],
    trips: [] as Trip[],
    bookings: [] as Booking[],
    payments: [] as Payment[],
    liveLocations: [] as LiveLocation[],
    sosAlerts: [] as SOSAlert[],
    notifications: [] as any[],
    currentUserId: null as string | null,
};

// Load from storage or use default
let store = defaultStore;
try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        store = JSON.parse(saved, (key, value) => {
            // Revive dates
            if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
                return new Date(value);
            }
            return value;
        });
        // Date strings need to be converted back to Date objects
        // Simplified: We'll handle dates on read or just let them be strings (which fails schema validation potentially)
        // A robust solution would be reviving dates. For now, let's trust the app handles string dates mostly, 
        // or we perform a quick fix for dates if needed.
        // Actually, let's just use the demo data if storage is empty, creating a fresh start.
    }
} catch (e) {
    console.error('Failed to load mock store', e);
}

const saveStore = () => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch (e) {
        console.error('Failed to save mock store', e);
    }
};

// Initialize with some data
const demoUser: User = {
    id: 'demo-user-id',
    email: 'demo@example.com',
    fullName: 'Demo User',
    phone: '1234567890',
    profilePhoto: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    role: UserRole.PASSENGER,
    bio: 'Love traveling!',
    verificationStatus: VerificationStatus.VERIFIED,
    createdAt: new Date(),
    updatedAt: new Date()
};
store.users.push(demoUser);
if (!store.users.find(u => u.id === demoUser.id)) {
    store.users.push(demoUser);
}

const demoDriverUser: User = {
    id: 'demo-driver-user-id',
    email: 'driver@example.com',
    fullName: 'John Driver',
    phone: '9876543210',
    profilePhoto: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    role: UserRole.DRIVER,
    bio: 'Professional driver',
    verificationStatus: VerificationStatus.VERIFIED,
    createdAt: new Date(),
    updatedAt: new Date()
};
if (!store.users.find(u => u.id === demoDriverUser.id)) {
    store.users.push(demoDriverUser);
}

const demoDriver: Driver = {
    id: 'demo-driver-id',
    userId: demoDriverUser.id,
    licenseNumber: 'DL-123456789',
    licensePhoto: 'https://placehold.co/600x400',
    vehicleMake: 'Toyota',
    vehicleModel: 'Camry',
    vehicleYear: 2022,
    vehicleColor: 'White',
    vehiclePlate: 'KA-01-AB-1234',
    vehiclePhotos: ['https://placehold.co/600x400'],
    isAvailable: true,
    rating: '4.8',
    totalTrips: 150,
    verificationStatus: VerificationStatus.VERIFIED,
    documents: [],
    createdAt: new Date(),
    updatedAt: new Date()
};
if (!store.drivers.find(d => d.id === demoDriver.id)) {
    store.drivers.push(demoDriver);
}

// Add some trips
if (!store.trips.find(t => t.id === 'trip-1')) {
    store.trips.push({
        id: 'trip-1',
        driverId: demoDriver.id,
        pickupLocation: 'Whitefield, Bengaluru',
        pickupLat: '12.9698',
        pickupLng: '77.7500',
        dropLocation: 'Indiranagar, Bengaluru',
        dropLat: '12.9716',
        dropLng: '77.6412',
        departureTime: new Date(Date.now() + 86400000), // Tomorrow
        distance: '15.5',
        duration: 45,
        pricePerSeat: '150.00',
        availableSeats: 3,
        totalSeats: 4,
        status: TripStatus.UPCOMING,
        route: [],
        preferences: { smoking: false, pets: false, music: true },
        createdAt: new Date(),
        updatedAt: new Date()
    });
}
saveStore(); // Initial save

// Helper to delay response
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to generate ID
const genId = () => Math.random().toString(36).substr(2, 9);

export async function mockRequest(method: string, url: string, body?: any): Promise<Response> {
    console.log(`[Mock API] ${method} ${url}`, body);
    await delay(500); // Simulate network latency

    // Parse URL to get path and params
    const urlObj = new URL(url, 'http://localhost');
    const path = urlObj.pathname;
    const searchParams = urlObj.searchParams;

    // --- Auth Routes ---
    if (path === '/api/auth/login' && method === 'POST') {
        const user = store.users.find(u => u.email === body.email);
        if (user) {
            store.currentUserId = user.id;
            saveStore();
            return new Response(JSON.stringify({
                user: { id: user.id, email: user.email, user_metadata: {} },
                session: { access_token: 'mock-token-' + user.id }
            }), { status: 200 });
        }
        return new Response(JSON.stringify({ message: 'Invalid credentials' }), { status: 401 });
    }

    if (path === '/api/auth/signup' && method === 'POST') {
        const newUser: User = {
            id: genId(),
            email: body.email,
            fullName: body.fullName,
            role: UserRole.PASSENGER,
            verificationStatus: VerificationStatus.PENDING,
            createdAt: new Date(),
            updatedAt: new Date(),
            phone: null,
            profilePhoto: null,
            bio: null
        };
        store.users.push(newUser);
        store.currentUserId = newUser.id;
        saveStore();
        return new Response(JSON.stringify({
            user: { id: newUser.id, email: newUser.email, user_metadata: {} },
            session: { access_token: 'mock-token-' + newUser.id }
        }), { status: 200 });
    }

    if (path === '/api/auth/logout' && method === 'POST') {
        store.currentUserId = null;
        saveStore();
        return new Response(JSON.stringify({ message: 'Logged out' }), { status: 200 });
    }

    if (path === '/api/auth/me' && method === 'GET') {
        // Check mock token from localStorage to find user
        // In real app, we decode token. Here we assume the token IS the userId prefixed or we use store.currentUserId
        // But since this is stateless per request mostly, we should rely on "Authorization" header if we were strict.
        // For simplicity, if we have store.currentUserId (set by login), we use it. 
        // BUT checking localStorage in `mockRequest` is tricky if it runs in different context, but it runs in browser.

        // Let's assume the auth provider calls this. 
        // Helper to extract user ID from mock token
        const authHeader = body?._headers?.['authorization'] || '';
        // Note: fetch polyfill or mock implementation depends on how headers are passed in `mockRequest`
        // In queryClient.ts: `mockRequest(method, url, data)` 
        // `queryClient` doesn't pass headers to `mockRequest`. We need to fix that or rely on memory + localStorage fallback.

        // Since `queryClient.ts` does NOT pass headers to `mockRequest`, we can't read the Authorization header directly from arguments.
        // But we are in the browser! We can read localStorage directly here.
        const token = localStorage.getItem('auth_token');
        if (token && token.startsWith('mock-token-')) {
            const userId = token.replace('mock-token-', '');
            // Update store current user just in case
            store.currentUserId = userId;
            const user = store.users.find(u => u.id === userId);
            if (user) {
                return new Response(JSON.stringify({ id: user.id, email: user.email, user_metadata: {} }), { status: 200 });
            }
        }

        if (store.currentUserId) {
            const user = store.users.find(u => u.id === store.currentUserId);
            if (user) {
                return new Response(JSON.stringify({ id: user.id, email: user.email, user_metadata: {} }), { status: 200 });
            }
        }
        // Fallback: Check if there's a demo user logged in via "token" convention
        return new Response(JSON.stringify(null), { status: 401 });
    }

    // --- User Routes ---
    if (path.match(/^\/api\/users\/[^/]+$/) && method === 'GET') {
        const id = path.split('/').pop();
        const user = store.users.find(u => u.id === id);
        if (user) return new Response(JSON.stringify(user), { status: 200 });
        return new Response('User not found', { status: 404 });
    }

    if (path.match(/^\/api\/users\/[^/]+$/) && method === 'PUT') {
        const id = path.split('/').pop();
        const userIndex = store.users.findIndex(u => u.id === id);
        if (userIndex > -1) {
            store.users[userIndex] = { ...store.users[userIndex], ...body, updatedAt: new Date() };
            saveStore();
            return new Response(JSON.stringify(store.users[userIndex]), { status: 200 });
        }
    }

    if (path.match(/^\/api\/users\/[^/]+\/role$/) && method === 'PUT') {
        const id = path.split('/')[3];
        const userIndex = store.users.findIndex(u => u.id === id);
        if (userIndex > -1) {
            store.users[userIndex].role = body.role;
            saveStore();
            return new Response(JSON.stringify(store.users[userIndex]), { status: 200 });
        }
    }

    // --- Driver Routes ---
    if (path === '/api/drivers' && method === 'POST') {
        const newDriver: Driver = {
            id: genId(),
            userId: body.userId,
            ...body,
            isAvailable: false,
            rating: '0.00',
            totalTrips: 0,
            verificationStatus: VerificationStatus.PENDING,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        store.drivers.push(newDriver);
        saveStore();
        return new Response(JSON.stringify(newDriver), { status: 200 });
    }

    if (path === '/api/drivers/my-profile' && method === 'GET') {
        if (!store.currentUserId) return new Response('Unauthorized', { status: 401 });
        const driver = store.drivers.find(d => d.userId === store.currentUserId);
        // Return null if not found (expected by frontend)
        if (!driver) return new Response(JSON.stringify(null), { status: 200 });
        return new Response(JSON.stringify(driver), { status: 200 });
    }

    if (path.match(/^\/api\/drivers\/[^/]+\/verify$/) && method === 'PUT') {
        const id = path.split('/')[3];
        const driverIndex = store.drivers.findIndex(d => d.id === id);
        if (driverIndex > -1) {
            store.drivers[driverIndex].verificationStatus = body.status;
            saveStore();
            return new Response(JSON.stringify(store.drivers[driverIndex]), { status: 200 });
        }
    }

    // --- Trip Routes ---
    if (path === '/api/trips' && method === 'POST') {
        const newTrip: Trip = {
            id: genId(),
            ...body,
            status: TripStatus.UPCOMING,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        store.trips.push(newTrip);
        saveStore();
        return new Response(JSON.stringify(newTrip), { status: 200 });
    }

    if (path === '/api/trips/search' && method === 'GET') {
        const pickup = searchParams.get('pickup')?.toLowerCase();
        const drop = searchParams.get('drop')?.toLowerCase();
        const date = searchParams.get('date');

        let results = store.trips.map(trip => {
            const driver = store.drivers.find(d => d.id === trip.driverId);
            const user = driver ? store.users.find(u => u.id === driver?.userId) : null;
            return { ...trip, driver: { ...driver, user } };
        });

        if (pickup) {
            results = results.filter(t => t.pickupLocation.toLowerCase().includes(pickup));
        }
        if (drop) {
            results = results.filter(t => t.dropLocation.toLowerCase().includes(drop));
        }
        if (date) {
            // Simple date match (just checking if same day)
            results = results.filter(t => {
                const tripDate = new Date(t.departureTime).toISOString().split('T')[0];
                return tripDate === date;
            });
        }

        return new Response(JSON.stringify(results), { status: 200 });
    }

    if (path === '/api/trips/my-trips' && method === 'GET') {
        if (!store.currentUserId) return new Response('Unauthorized', { status: 401 });
        const driver = store.drivers.find(d => d.userId === store.currentUserId);
        if (!driver) return new Response(JSON.stringify([]), { status: 200 });

        const trips = store.trips.filter(t => t.driverId === driver.id)
            .map(trip => ({
                ...trip,
                driver: { ...driver, user: store.users.find(u => u.id === driver.userId) }
            }));
        return new Response(JSON.stringify(trips), { status: 200 });
    }

    if (path.match(/^\/api\/trips\/[^/]+$/) && method === 'GET') {
        const id = path.split('/').pop();
        const trip = store.trips.find(t => t.id === id);
        if (trip) {
            const driver = store.drivers.find(d => d.id === trip.driverId);
            const user = driver ? store.users.find(u => u.id === driver?.userId) : null;
            return new Response(JSON.stringify({ ...trip, driver: { ...driver, user } }), { status: 200 });
        }
        return new Response('Not found', { status: 404 });
    }

    if (path.match(/^\/api\/trips\/[^/]+\/status$/) && method === 'PUT') {
        const id = path.split('/')[3];
        const tripIndex = store.trips.findIndex(t => t.id === id);
        if (tripIndex > -1) {
            store.trips[tripIndex].status = body.status;
            saveStore();
            return new Response(JSON.stringify(store.trips[tripIndex]), { status: 200 });
        }
        return new Response('Not found', { status: 404 });
    }

    // --- Booking Routes ---
    if (path === '/api/bookings' && method === 'POST') {
        const newBooking: Booking = {
            id: genId(),
            passengerId: store.currentUserId!,
            tripId: body.tripId,
            seatsBooked: body.seatsBooked,
            totalAmount: body.totalAmount,
            status: BookingStatus.PENDING,
            pickupLocation: body.pickupLocation,
            dropLocation: body.dropLocation,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        store.bookings.push(newBooking);
        saveStore();
        return new Response(JSON.stringify(newBooking), { status: 200 });
    }

    if (path === '/api/bookings/my-bookings' && method === 'GET') {
        if (!store.currentUserId) return new Response('Unauthorized', { status: 401 });
        const userBookings = store.bookings.filter(b => b.passengerId === store.currentUserId);

        const detailed = userBookings.map(b => {
            const trip = store.trips.find(t => t.id === b.tripId);
            const driver = trip ? store.drivers.find(d => d.id === trip.driverId) : null;
            const driverUser = driver ? store.users.find(u => u.id === driver.userId) : null;
            const passenger = store.users.find(u => u.id === b.passengerId);

            return {
                ...b,
                trip: { ...trip, driver: { ...driver, user: driverUser } },
                passenger
            };
        });
        return new Response(JSON.stringify(detailed), { status: 200 });
    }

    if (path.match(/^\/api\/bookings\/[^/]+\/cancel$/) && method === 'PUT') {
        const id = path.split('/')[3];
        const bookingIndex = store.bookings.findIndex(b => b.id === id);
        if (bookingIndex > -1) {
            store.bookings[bookingIndex].status = 'cancelled';

            // Also increase available seats in ticket
            const tripIndex = store.trips.findIndex(t => t.id === store.bookings[bookingIndex].tripId);
            if (tripIndex > -1) {
                store.trips[tripIndex].availableSeats += store.bookings[bookingIndex].seatsBooked;
            }

            saveStore();
            return new Response(JSON.stringify(store.bookings[bookingIndex]), { status: 200 });
        }
        return new Response('Booking not found', { status: 404 });
    }

    // --- Stats / Admin ---
    if (path === '/api/admin/stats' && method === 'GET') {
        return new Response(JSON.stringify({
            totalUsers: store.users.length,
            totalDrivers: store.drivers.length,
            totalTrips: store.trips.length,
            totalRevenue: 5000,
            pendingVerifications: store.drivers.filter(d => d.verificationStatus === VerificationStatus.PENDING).length
        }), { status: 200 });
    }

    if (path === '/api/admin/drivers/pending' && method === 'GET') {
        const pending = store.drivers
            .filter(d => d.verificationStatus === VerificationStatus.PENDING)
            .map(d => ({ ...d, user: store.users.find(u => u.id === d.userId) }));
        return new Response(JSON.stringify(pending), { status: 200 });
    }


    // --- Payment Routes ---
    if (path === '/api/payments/create-order' && method === 'POST') {
        return new Response(JSON.stringify({
            id: "order_" + genId(),
            amount: body.amount,
            currency: "INR"
        }), { status: 200 });
    }

    if (path === '/api/payments/verify' && method === 'POST') {
        // Simulate successful payment verification
        return new Response(JSON.stringify({ status: "success" }), { status: 200 });
    }

    // --- SOS & Location Routes ---
    if (path === '/api/sos' && method === 'POST') {
        const alert: SOSAlert = {
            id: genId(),
            tripId: body.tripId,
            reporterId: store.currentUserId || 'unknown',
            lat: body.lat,
            lng: body.lng,
            status: 'triggered',
            createdAt: new Date(),
            resolvedAt: null
        };
        store.sosAlerts.push(alert);
        saveStore();
        return new Response(JSON.stringify(alert), { status: 200 });
    }

    if (path === '/api/locations' && method === 'POST') {
        const loc: LiveLocation = {
            id: genId(),
            tripId: body.tripId,
            driverId: body.driverId,
            lat: body.lat,
            lng: body.lng,
            heading: body.heading,
            speed: body.speed,
            updatedAt: new Date()
        };
        store.liveLocations.push(loc);
        saveStore();
        return new Response(JSON.stringify(loc), { status: 200 });
    }

    if (path === '/api/admin/sos' && method === 'GET') {
        // Join reporter
        const alerts = store.sosAlerts.map(a => ({
            ...a,
            reporter: store.users.find(u => u.id === a.reporterId)
        }));
        return new Response(JSON.stringify(alerts), { status: 200 });
    }

    if (path === '/api/admin/payments' && method === 'GET') {
        return new Response(JSON.stringify(store.payments), { status: 200 });
    }

    if (path === '/api/admin/trips' && method === 'GET') {
        const results = store.trips.map(trip => {
            const driver = store.drivers.find(d => d.id === trip.driverId);
            const user = driver ? store.users.find(u => u.id === driver?.userId) : null;
            return { ...trip, driver: { ...driver, user } };
        });
        return new Response(JSON.stringify(results), { status: 200 });
    }

    if (path === '/api/admin/bookings' && method === 'GET') {
        const results = store.bookings.map(b => {
            const trip = store.trips.find(t => t.id === b.tripId);
            const driver = trip ? store.drivers.find(d => d.id === trip.driverId) : null;
            const driverUser = driver ? store.users.find(u => u.id === driver.userId) : null;
            const passenger = store.users.find(u => u.id === b.passengerId);

            return {
                ...b,
                trip: { ...trip, driver: { ...driver, user: driverUser } },
                passenger
            };
        });
        return new Response(JSON.stringify(results), { status: 200 });
    }


    // --- Notification Routes ---
    if (path === '/api/notifications' && method === 'GET') {
        // Return dummy notifications to verify UI
        if (store.notifications.length === 0) {
            store.notifications.push({
                id: 'notif-1',
                userId: store.currentUserId,
                title: 'Welcome to TCSYGO',
                message: 'Thanks for joining our community!',
                type: 'system',
                isRead: false,
                createdAt: new Date().toISOString()
            });
            saveStore();
        }
        return new Response(JSON.stringify(store.notifications), { status: 200 });
    }

    if (path.match(/^\/api\/notifications\/[^/]+\/read$/) && method === 'PUT') {
        const id = path.split('/')[3];
        const n = store.notifications.find(n => n.id === id);
        if (n) {
            n.isRead = true;
            saveStore();
            return new Response(JSON.stringify(n), { status: 200 });
        }
    }

    if (path === '/api/notifications/read-all' && method === 'PUT') {
        store.notifications.forEach(n => n.isRead = true);
        saveStore();
        return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    return new Response('Not Found', { status: 404 });
}


