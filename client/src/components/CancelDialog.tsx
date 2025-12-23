import { useState } from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface CancelDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (reason: string, details?: string) => void;
    type: 'trip' | 'booking';
    loading?: boolean;
}

const CANCELLATION_REASONS = {
    trip: [
        'Vehicle breakdown',
        'Personal emergency',
        'Weather conditions',
        'Change of plans',
        'Other',
    ],
    booking: [
        'Found alternative transport',
        'Change of plans',
        'Emergency',
        'Driver not responsive',
        'Other',
    ],
};

export function CancelDialog({ isOpen, onClose, onConfirm, type, loading }: CancelDialogProps) {
    const [selectedReason, setSelectedReason] = useState('');
    const [details, setDetails] = useState('');

    const handleConfirm = () => {
        if (!selectedReason) return;
        onConfirm(selectedReason, details);
        setSelectedReason('');
        setDetails('');
    };

    const reasons = CANCELLATION_REASONS[type];

    return (
        <AlertDialog open={isOpen} onOpenChange={onClose}>
            <AlertDialogContent className="max-w-md">
                <AlertDialogHeader>
                    <AlertDialogTitle>
                        Cancel {type === 'trip' ? 'Trip' : 'Booking'}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        {type === 'trip'
                            ? 'Cancelling this trip will notify all passengers and process refunds according to the cancellation policy.'
                            : 'Cancellation policy: Full refund if cancelled 24+ hours before departure, 50% refund if 6-24 hours, no refund if less than 6 hours.'}
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <div className="space-y-4 py-4">
                    <div>
                        <Label className="mb-3 block">Reason for cancellation</Label>
                        <RadioGroup value={selectedReason} onValueChange={setSelectedReason}>
                            {reasons.map((reason) => (
                                <div key={reason} className="flex items-center space-x-2">
                                    <RadioGroupItem value={reason} id={reason} />
                                    <Label htmlFor={reason} className="font-normal cursor-pointer">
                                        {reason}
                                    </Label>
                                </div>
                            ))}
                        </RadioGroup>
                    </div>

                    {selectedReason && (
                        <div>
                            <Label htmlFor="details">Additional details (optional)</Label>
                            <Textarea
                                id="details"
                                value={details}
                                onChange={(e) => setDetails(e.target.value)}
                                placeholder="Provide more information..."
                                rows={3}
                                className="mt-2"
                            />
                        </div>
                    )}
                </div>

                <AlertDialogFooter>
                    <AlertDialogCancel disabled={loading}>Keep {type === 'trip' ? 'Trip' : 'Booking'}</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleConfirm}
                        disabled={!selectedReason || loading}
                        className="bg-destructive hover:bg-destructive/90"
                    >
                        {loading ? 'Cancelling...' : 'Confirm Cancellation'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
