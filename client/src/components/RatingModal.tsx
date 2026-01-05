import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, ThumbsUp, Medal } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface RatingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (rating: number, feedback: string, tags: string[]) => void;
    tripDetails: {
        driverName: string;
        driverPhoto?: string;
        amount: number;
        pickup: string;
        drop: string;
    };
    isDriver?: boolean; // If true, we are rating the passenger
}

export function RatingModal({ isOpen, onClose, onSubmit, tripDetails, isDriver = false }: RatingModalProps) {
    const [rating, setRating] = useState(0);
    const [feedback, setFeedback] = useState('');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);

    const driverTags = ["Polite", "Safe Driving", "Clean Car", "Good Music", "Conversation"];
    const passengerTags = ["Polite", "Punctual", "Respectful", "Tipped"];

    const tags = isDriver ? passengerTags : driverTags;

    const toggleTag = (tag: string) => {
        if (selectedTags.includes(tag)) {
            setSelectedTags(selectedTags.filter(t => t !== tag));
        } else {
            setSelectedTags([...selectedTags, tag]);
        }
    };

    const handleRating = (value: number) => {
        setRating(value);
    };

    const handleSubmit = () => {
        onSubmit(rating, feedback, selectedTags);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader className="text-center items-center">
                    <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mb-2">
                        <Medal className="w-8 h-8 text-success" />
                    </div>
                    <DialogTitle className="text-xl">
                        {isDriver ? 'Rate Passenger' : 'How was your ride?'}
                    </DialogTitle>
                    <DialogDescription>
                        Help us improve by rating your experience with {tripDetails.driverName}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col items-center gap-6 py-4">
                    {/* User Info */}
                    <div className="flex flex-col items-center gap-2">
                        <Avatar className="w-20 h-20 border-4 border-background shadow-lg">
                            <AvatarImage src={tripDetails.driverPhoto} />
                            <AvatarFallback className="text-lg">{tripDetails.driverName.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="text-center">
                            <p className="font-semibold text-lg">{tripDetails.driverName}</p>
                            <p className="font-bold text-2xl text-primary">₹{tripDetails.amount}</p>
                        </div>
                    </div>

                    {/* Stars */}
                    <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                type="button"
                                className={`transition-all hover:scale-110 focus:outline-none ${rating >= star ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
                                    }`}
                                onClick={() => handleRating(star)}
                            >
                                <Star className={`w-8 h-8 ${rating >= star ? 'fill-current' : ''}`} />
                            </button>
                        ))}
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap justify-center gap-2">
                        {tags.map((tag) => (
                            <Button
                                key={tag}
                                variant={selectedTags.includes(tag) ? "default" : "outline"}
                                size="sm"
                                onClick={() => toggleTag(tag)}
                                className={`rounded-full transition-all ${selectedTags.includes(tag) ? 'bg-primary text-primary-foreground' : 'hover:border-primary/50'
                                    }`}
                            >
                                {selectedTags.includes(tag) && <ThumbsUp className="w-3 h-3 mr-1" />}
                                {tag}
                            </Button>
                        ))}
                    </div>

                    {/* Feedback */}
                    <Textarea
                        placeholder="Additional comments (optional)..."
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        className="w-full resize-none"
                        rows={3}
                    />
                </div>

                <DialogFooter className="sm:justify-between gap-2">
                    <Button variant="ghost" className="w-full sm:w-auto" onClick={onClose}>
                        Skip
                    </Button>
                    <Button
                        className="w-full sm:w-auto"
                        onClick={handleSubmit}
                        disabled={rating === 0}
                    >
                        Submit Feedback
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
