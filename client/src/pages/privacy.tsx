import { Navbar } from '@/components/Navbar';
import { Card } from '@/components/ui/card';

export default function Privacy() {
    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <div className="container mx-auto px-6 py-12 max-w-4xl">
                <h1 className="text-4xl font-display font-bold mb-8">Privacy Policy</h1>
                <Card className="p-8 prose dark:prose-invert max-w-none">
                    <h2>1. Information We Collect</h2>
                    <p>
                        We collect information you provide directly to us, such as when you create or modify your account, request on-demand services, contact customer support, or otherwise communicate with us.
                    </p>

                    <h2>2. How We Use Your Information</h2>
                    <p>
                        We use the information we collect to provide, maintain, and improve our services, including to facilitate payments, send receipts, provide products and services you request (and send related information), develop new features, provide customer support to Users and Drivers, and send product updates and administrative messages.
                    </p>

                    <h2>3. Sharing of Information</h2>
                    <p>
                        We may share the information we collect about you as described in this Statement or as described at the time of collection or sharing, including with other Users to enable them to provide the Services you request.
                    </p>

                    <h2>4. Location Information</h2>
                    <p>
                        When you use the Services for transportation or delivery, we collect precise location data about the trip from the TCSYGO app used by the Driver.
                    </p>

                    <h2>5. Contact Information</h2>
                    <p>
                        If you have any questions about this Privacy Policy, please contact us at privacy@tcsygo.com.
                    </p>

                    <p className="text-sm text-muted-foreground mt-8">
                        Last updated: December 2024
                    </p>
                </Card>
            </div>
        </div>
    );
}
