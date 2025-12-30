import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Calendar as CalendarIcon, Clock, Repeat } from 'lucide-react';
import { format, addDays, isBefore, startOfDay } from 'date-fns';

interface RideSchedulingCalendarProps {
    onSchedule: (scheduledTime: Date, isRecurring: boolean, recurringDays?: string[]) => void;
    minDate?: Date;
}

const TIME_SLOTS = [
    '00:00', '00:30', '01:00', '01:30', '02:00', '02:30',
    '03:00', '03:30', '04:00', '04:30', '05:00', '05:30',
    '06:00', '06:30', '07:00', '07:30', '08:00', '08:30',
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
    '18:00', '18:30', '19:00', '19:30', '20:00', '20:30',
    '21:00', '21:30', '22:00', '22:30', '23:00', '23:30',
];

const DAYS_OF_WEEK = [
    { value: 'monday', label: 'Monday' },
    { value: 'tuesday', label: 'Tuesday' },
    { value: 'wednesday', label: 'Wednesday' },
    { value: 'thursday', label: 'Thursday' },
    { value: 'friday', label: 'Friday' },
    { value: 'saturday', label: 'Saturday' },
    { value: 'sunday', label: 'Sunday' },
];

export function RideSchedulingCalendar({
    onSchedule,
    minDate = new Date(),
}: RideSchedulingCalendarProps) {
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
    const [selectedTime, setSelectedTime] = useState<string>('09:00');
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurringDays, setRecurringDays] = useState<string[]>([]);

    const handleDateSelect = (date: Date | undefined) => {
        if (date) {
            setSelectedDate(date);
        }
    };

    const toggleRecurringDay = (day: string) => {
        setRecurringDays((prev) =>
            prev.includes(day)
                ? prev.filter((d) => d !== day)
                : [...prev, day]
        );
    };

    const handleSchedule = () => {
        if (!selectedDate || !selectedTime) return;

        const [hours, minutes] = selectedTime.split(':').map(Number);
        const scheduledDateTime = new Date(selectedDate);
        scheduledDateTime.setHours(hours, minutes, 0, 0);

        onSchedule(scheduledDateTime, isRecurring, isRecurring ? recurringDays : undefined);
    };

    const isScheduleValid = () => {
        if (!selectedDate || !selectedTime) return false;
        if (isRecurring && recurringDays.length === 0) return false;

        const [hours, minutes] = selectedTime.split(':').map(Number);
        const scheduledDateTime = new Date(selectedDate);
        scheduledDateTime.setHours(hours, minutes, 0, 0);

        return !isBefore(scheduledDateTime, new Date());
    };

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5" />
                    Schedule Your Ride
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Calendar */}
                <div className="flex justify-center">
                    <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={handleDateSelect}
                        disabled={(date) =>
                            isBefore(startOfDay(date), startOfDay(minDate))
                        }
                        className="rounded-md border"
                        initialFocus
                    />
                </div>

                {/* Time Selection */}
                <div className="space-y-2">
                    <Label htmlFor="time-select" className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Select Time
                    </Label>
                    <Select value={selectedTime} onValueChange={setSelectedTime}>
                        <SelectTrigger id="time-select">
                            <SelectValue placeholder="Select time" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                            {TIME_SLOTS.map((time) => (
                                <SelectItem key={time} value={time}>
                                    {time}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Recurring Ride Option */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="recurring" className="flex items-center gap-2">
                            <Repeat className="h-4 w-4" />
                            Recurring Ride
                        </Label>
                        <Switch
                            id="recurring"
                            checked={isRecurring}
                            onCheckedChange={setIsRecurring}
                        />
                    </div>

                    {isRecurring && (
                        <div className="space-y-2">
                            <Label className="text-sm text-muted-foreground">
                                Select days to repeat
                            </Label>
                            <div className="grid grid-cols-2 gap-2">
                                {DAYS_OF_WEEK.map((day) => (
                                    <Button
                                        key={day.value}
                                        type="button"
                                        variant={
                                            recurringDays.includes(day.value)
                                                ? 'default'
                                                : 'outline'
                                        }
                                        size="sm"
                                        onClick={() => toggleRecurringDay(day.value)}
                                        className="justify-start"
                                    >
                                        {day.label}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Selected Schedule Summary */}
                {selectedDate && selectedTime && (
                    <div className="p-4 bg-accent rounded-lg space-y-2">
                        <p className="text-sm font-medium">Scheduled for:</p>
                        <p className="text-lg font-semibold">
                            {format(selectedDate, 'EEEE, MMMM d, yyyy')} at {selectedTime}
                        </p>
                        {isRecurring && recurringDays.length > 0 && (
                            <p className="text-sm text-muted-foreground">
                                Repeats every: {recurringDays.map(day =>
                                    DAYS_OF_WEEK.find(d => d.value === day)?.label
                                ).join(', ')}
                            </p>
                        )}
                    </div>
                )}

                {/* Schedule Button */}
                <Button
                    onClick={handleSchedule}
                    disabled={!isScheduleValid()}
                    className="w-full"
                    size="lg"
                >
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {isRecurring ? 'Schedule Recurring Ride' : 'Schedule Ride'}
                </Button>
            </CardContent>
        </Card>
    );
}
