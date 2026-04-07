import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { FareBreakdown } from './FareBreakdown';
import { FareBreakdown as FareBreakdownType } from '@/lib/fareCalculator';
import { Button } from './ui/button';

interface FareBreakdownModalProps {
    isOpen: boolean;
    onClose: () => void;
    fare: FareBreakdownType | null;
}

export function FareBreakdownModal({
    isOpen,
    onClose,
    fare,
}: FareBreakdownModalProps) {
    if (!fare) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Fare Breakdown</DialogTitle>
                    <DialogDescription>
                        Detailed breakdown of your estimated ride fare
                    </DialogDescription>
                </DialogHeader>
                
                <FareBreakdown
                    baseFare={fare.baseFare}
                    distanceCharge={fare.distanceCharge}
                    timeCharge={fare.timeCharge}
                    surgePricing={fare.surgePricing}
                    platformFee={fare.platformFee}
                    gst={fare.gst}
                    discount={fare.discount}
                    totalFare={fare.totalFare}
                    className="border-0 shadow-none p-0"
                />

                <div className="mt-6">
                    <Button onClick={onClose} className="w-full">
                        Got it
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
