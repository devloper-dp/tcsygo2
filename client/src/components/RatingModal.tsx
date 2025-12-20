import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface RatingModalProps {
    isOpen: boolean;
    onClose: () => void;
    tripId: string;
    driverId: string;
    driverName: string;
}

export function RatingModal({ isOpen, onClose, tripId, driverId, driverName }: RatingModalProps) {
    const { toast } = useToast();
    const [rating, setRating] = useState(0);
    const [review, setReview] = useState('');

    const submitRatingMutation = useMutation({
        mutationFn: async () => {
            return await apiRequest('POST', '/api/ratings', {
                tripId,
                toUserId: driverId, // We rate the driver (user)
                rating,
                review
            });
        },
        onSuccess: () => {
            toast({
                title: 'Rating submitted',
                description: 'Thank you for your feedback!',
            });
            queryClient.invalidateQueries({ queryKey: ['/api/ratings'] });
            onClose();
        },
        onError: (error: any) => {
            toast({
                title: 'Submission failed',
                description: error.message || 'Please try again',
                variant: 'destructive',
            });
        }
    });

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Rate your trip with {driverName}</DialogTitle>
                    <DialogDescription>
                        How was your experience? Your feedback helps us improve.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col items-center gap-4 py-4">
                    <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                onClick={() => setRating(star)}
                                className="focus:outline-none transition-transform hover:scale-110"
                            >
                                <Star
                                    className={`w-8 h-8 ${star <= rating ? 'fill-warning text-warning' : 'text-muted-foreground'}`}
                                />
                            </button>
                        ))}
                    </div>
                    {rating > 0 && (
                        <span className="text-sm font-medium text-warning">
                            {rating === 5 ? 'Excellent!' : rating >= 4 ? 'Good' : rating >= 3 ? 'Average' : 'Poor'}
                        </span>
                    )}

                    <Textarea
                        placeholder="Write a review (optional)"
                        value={review}
                        onChange={(e) => setReview(e.target.value)}
                        rows={3}
                        className="w-full"
                    />
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button
                        onClick={() => submitRatingMutation.mutate()}
                        disabled={rating === 0 || submitRatingMutation.isPending}
                    >
                        {submitRatingMutation.isPending ? 'Submitting...' : 'Submit Rating'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
