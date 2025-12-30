import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Clock, Calendar as CalendarIcon } from 'lucide-react';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { format } from 'date-fns';

interface RideSchedulerProps {
    onSchedule?: (date: Date, time: string) => void;
    className?: string;
}

export function RideScheduler({ onSchedule, className = '' }: RideSchedulerProps) {
    const { t } = useTranslation();
    const [selectedDate, setSelectedDate] = useState<Date>();
    const [selectedTime, setSelectedTime] = useState('');
    const [isOpen, setIsOpen] = useState(false);

    // Generate time slots (every 30 minutes)
    const generateTimeSlots = () => {
        const slots: string[] = [];
        for (let hour = 0; hour < 24; hour++) {
            for (let minute = 0; minute < 60; minute += 30) {
                const timeString = `${hour.toString().padStart(2, '0')}:${minute
                    .toString()
                    .padStart(2, '0')}`;
                slots.push(timeString);
            }
        }
        return slots;
    };

    const timeSlots = generateTimeSlots();

    const handleSchedule = () => {
        if (selectedDate && selectedTime) {
            const [hours, minutes] = selectedTime.split(':');
            const scheduledDateTime = new Date(selectedDate);
            scheduledDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

            if (onSchedule) {
                onSchedule(scheduledDateTime, selectedTime);
            }
            setIsOpen(false);
        }
    };

    const isValidDateTime = () => {
        if (!selectedDate || !selectedTime) return false;

        const [hours, minutes] = selectedTime.split(':');
        const scheduledDateTime = new Date(selectedDate);
        scheduledDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

        // Must be at least 30 minutes in the future
        const minTime = new Date();
        minTime.setMinutes(minTime.getMinutes() + 30);

        return scheduledDateTime >= minTime;
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" className={className}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate && selectedTime
                        ? `${format(selectedDate, 'PPP')} at ${selectedTime}`
                        : t('booking.scheduleForLater')}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Card className="border-0">
                    <div className="p-4 space-y-4">
                        <div>
                            <Label className="text-sm font-semibold mb-2 block">Select Date</Label>
                            <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={setSelectedDate}
                                disabled={(date) => {
                                    const today = new Date();
                                    today.setHours(0, 0, 0, 0);
                                    const maxDate = new Date();
                                    maxDate.setDate(maxDate.getDate() + 7); // Max 7 days in advance
                                    return date < today || date > maxDate;
                                }}
                                initialFocus
                            />
                        </div>

                        {selectedDate && (
                            <div>
                                <Label className="text-sm font-semibold mb-2 block flex items-center gap-2">
                                    <Clock className="w-4 h-4" />
                                    Select Time
                                </Label>
                                <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto p-2">
                                    {timeSlots.map((time) => {
                                        const [hours, minutes] = time.split(':');
                                        const testDateTime = new Date(selectedDate);
                                        testDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

                                        const minTime = new Date();
                                        minTime.setMinutes(minTime.getMinutes() + 30);

                                        const isDisabled = testDateTime < minTime;

                                        return (
                                            <Button
                                                key={time}
                                                variant={selectedTime === time ? 'default' : 'outline'}
                                                size="sm"
                                                onClick={() => setSelectedTime(time)}
                                                disabled={isDisabled}
                                                className="text-xs"
                                            >
                                                {time}
                                            </Button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <div className="flex gap-2 pt-2">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setSelectedDate(undefined);
                                    setSelectedTime('');
                                    setIsOpen(false);
                                }}
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSchedule}
                                disabled={!isValidDateTime()}
                                className="flex-1"
                            >
                                Schedule Ride
                            </Button>
                        </div>

                        {selectedDate && selectedTime && !isValidDateTime() && (
                            <p className="text-xs text-destructive text-center">
                                Please select a time at least 30 minutes from now
                            </p>
                        )}
                    </div>
                </Card>
            </PopoverContent>
        </Popover>
    );
}
