import { useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';

interface ReviewsListProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    userName: string;
}

export function ReviewsList({ isOpen, onClose, userId, userName }: ReviewsListProps) {
    const { data: reviews, isLoading } = useQuery({
        queryKey: ['user-reviews', userId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('ratings')
                .select('*, from:users(*)')
                .eq('to_user_id', userId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data;
        },
        enabled: isOpen,
    });

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md h-[80vh] flex flex-col p-0">
                <DialogHeader className="p-6 pb-4 border-b">
                    <DialogTitle>Reviews for {userName}</DialogTitle>
                </DialogHeader>

                <ScrollArea className="flex-1 p-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-40">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : reviews && reviews.length > 0 ? (
                        <div className="space-y-6">
                            {reviews.map((review: any) => (
                                <div key={review.id} className="border-b last:border-0 pb-6 last:pb-0">
                                    <div className="flex items-start gap-3 mb-2">
                                        <Avatar className="w-8 h-8">
                                            <AvatarImage src={review.from?.profile_photo} />
                                            <AvatarFallback>{review.from?.full_name?.charAt(0) || 'U'}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between">
                                                <span className="font-semibold text-sm">{review.from?.full_name || 'Anonymous'}</span>
                                                <span className="text-xs text-muted-foreground">{format(new Date(review.created_at), 'MMM dd, yyyy')}</span>
                                            </div>
                                            <div className="flex items-center gap-1 my-1">
                                                {[...Array(5)].map((_, i) => (
                                                    <Star
                                                        key={i}
                                                        className={`w-3 h-3 ${i < review.rating ? 'fill-warning text-warning' : 'text-muted-foreground/30'}`}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-sm text-foreground/80 pl-11">{review.review || "No comment provided."}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center text-muted-foreground py-10">
                            No reviews yet.
                        </div>
                    )}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
