
import "dotenv/config";
import { db } from "../server/db.ts";
import { users, drivers, trips, bookings, UserRole, TripStatus } from "../shared/schema.ts";
import { sql } from "drizzle-orm";
import fs from "fs";
import path from "path";

async function seed() {
    console.log("Seeding mock data with manual migration...");

    // Manual Migration
    try {
        const migrationFile = fs.readdirSync("./migrations").find(f => f.endsWith(".sql"));
        if (migrationFile) {
            console.log(`Executing migration: ${migrationFile}`);
            const content = fs.readFileSync(path.join("./migrations", migrationFile), "utf-8");

            // Split by semi-colon to run statements locally? 
            // Drizzle execute might handle multiple statements if supported by driver. 
            // Pglite supports multi-statement exec.
            await db.execute(sql.raw(content));
            console.log("Migration executed.");
        } else {
            console.log("No migration file found.");
        }
    } catch (e: any) {
        console.error("Migration/Setup failed:", e);
        // Continue? If tables overlap, it might be fine or error.
    }

    // clear existing data
    console.log("Cleaning up old data...");
    try {
        // Delete in order
        await db.delete(bookings).catch(e => console.log("Del bookings err", e.message));
        await db.delete(trips).catch(e => console.log("Del trips err", e.message));
        await db.delete(drivers).catch(e => console.log("Del drivers err", e.message));
        await db.delete(users).catch(e => console.log("Del users err", e.message));
    } catch (e) {
        // ignore
    }

    // Create Users (Drivers)
    const driverUsers = [];
    for (let i = 1; i <= 5; i++) {
        const [user] = await db.insert(users).values({
            id: `driver-${i}`,
            email: `driver${i}@example.com`,
            fullName: `Driver ${i}`,
            role: UserRole.DRIVER,
            phone: `+91987654321${i}`,
            verificationStatus: "verified"
        }).returning();
        driverUsers.push(user);
    }

    // Create Users (Passengers)
    const passengerUsers = [];
    for (let i = 1; i <= 5; i++) {
        const [user] = await db.insert(users).values({
            id: `passenger-${i}`,
            email: `passenger${i}@example.com`,
            fullName: `Passenger ${i}`,
            role: UserRole.PASSENGER,
            phone: `+91987654321${i + 5}`,
            verificationStatus: "verified"
        }).returning();
        passengerUsers.push(user);
    }

    // Create Drivers Profiles
    const driverProfiles = [];
    for (const driverUser of driverUsers) {
        const [driver] = await db.insert(drivers).values({
            userId: driverUser.id,
            licenseNumber: `DL-MOCK-${driverUser.id}`,
            vehicleMake: "Toyota",
            vehicleModel: "Innova",
            vehicleYear: 2022,
            vehicleColor: "White",
            vehiclePlate: `MH-02-AB-${Math.floor(Math.random() * 1000)}`,
            isAvailable: true,
            verificationStatus: "verified",
            totalTrips: 10,
            rating: "4.5"
        }).returning();
        driverProfiles.push(driver);
    }

    // Create Trips
    const startLat = 19.0760;
    const startLng = 72.8777;

    for (const driver of driverProfiles) {
        for (let j = 0; j < 2; j++) {
            const isMorning = j === 0;
            await db.insert(trips).values({
                driverId: driver.id,
                pickupLocation: "Andheri Station",
                pickupLat: (startLat + 0.01 + (j * 0.01)).toString(),
                pickupLng: (startLng + 0.01 + (j * 0.01)).toString(),
                dropLocation: "TCS Gateway Park",
                dropLat: (startLat + 0.05).toString(),
                dropLng: (startLng + 0.05).toString(),
                departureTime: new Date(Date.now() + (isMorning ? 3600000 : 86400000)).toISOString(),
                distance: "15.5",
                duration: 45,
                pricePerSeat: "150.00",
                availableSeats: 3,
                totalSeats: 4,
                status: TripStatus.UPCOMING
            });
        }
    }

    console.log("Seeding complete!");
    process.exit(0);
}

seed().catch((err) => {
    console.error("Seeding failed:", err);
    process.exit(1);
});
