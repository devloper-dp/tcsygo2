import { Navbar } from '@/components/Navbar';
import { Card } from '@/components/ui/card';

export default function Terms() {
    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <div className="container mx-auto px-6 py-12 max-w-4xl">
                <h1 className="text-4xl font-display font-bold mb-8">Terms of Service</h1>
                <Card className="p-8 prose dark:prose-invert max-w-none">
                    <h2>1. Acceptance of Terms</h2>
                    <p>
                        By accessing and using TCSYGO, you accept and agree to be bound by the terms and provision of this agreement.
                    </p>

                    <h2>2. Description of Service</h2>
                    <p>
                        TCSYGO provides a platform for carpooling and ride-sharing services. We connect drivers with empty seats to passengers looking for a ride.
                    </p>

                    <h2>3. User Responsibilities</h2>
                    <p>
                        Users are responsible for maintaining the confidentiality of their account information and for all activities that occur under their account.
                    </p>

                    <h2>4. Driver Obligations</h2>
                    <p>
                        Drivers must possess a valid driver's license and insurance. Drivers are responsible for the safety and maintenance of their vehicle.
                    </p>

                    <h2>5. Passenger Obligations</h2>
                    <p>
                        Passengers must be respectful to drivers and other passengers. Passengers must pay the agreed-upon contribution for the ride.
                    </p>

                    <h2>6. Cancellations and Refunds</h2>
                    <p>
                        Cancellation policies are set by the platform. Refunds are processed according to the specific circumstances of the cancellation.
                    </p>

                    <h2>7. Limitation of Liability</h2>
                    <p>
                        TCSYGO is not liable for any direct, indirect, incidental, or consequential damages arising out of the use of the service.
                    </p>

                    <p className="text-sm text-muted-foreground mt-8">
                        Last updated: December 2024
                    </p>
                </Card>
            </div>
        </div>
    );
}
