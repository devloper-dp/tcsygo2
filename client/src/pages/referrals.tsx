import { Navbar } from '@/components/Navbar';
import { ReferralProgram } from '@/components/ReferralProgram';

export default function Referrals() {
    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <div className="container mx-auto px-6 py-8">
                <ReferralProgram />
            </div>
        </div>
    );
}
