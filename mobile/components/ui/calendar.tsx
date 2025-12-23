import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Calendar as RNCalendar, CalendarProps as RNCalendarProps, DateData } from 'react-native-calendars';
import { cn } from '@/lib/utils';

export interface CalendarProps extends Partial<RNCalendarProps> {
    selected?: Date;
    onSelect?: (date: Date) => void;
    className?: string;
    minDate?: Date;
    maxDate?: Date;
}

export function Calendar({
    selected,
    onSelect,
    className,
    minDate,
    maxDate,
    ...props
}: CalendarProps) {
    const formatDate = (date: Date) => {
        return date.toISOString().split('T')[0];
    };

    const handleDayPress = (day: DateData) => {
        if (onSelect) {
            onSelect(new Date(day.timestamp));
        }
    };

    const markedDates = selected
        ? {
            [formatDate(selected)]: {
                selected: true,
                selectedColor: '#3b82f6',
            },
        }
        : {};

    return (
        <View className={className}>
            <RNCalendar
                onDayPress={handleDayPress}
                markedDates={markedDates}
                minDate={minDate ? formatDate(minDate) : undefined}
                maxDate={maxDate ? formatDate(maxDate) : undefined}
                theme={{
                    backgroundColor: '#ffffff',
                    calendarBackground: '#ffffff',
                    textSectionTitleColor: '#6b7280',
                    selectedDayBackgroundColor: '#3b82f6',
                    selectedDayTextColor: '#ffffff',
                    todayTextColor: '#3b82f6',
                    dayTextColor: '#1f2937',
                    textDisabledColor: '#d1d5db',
                    dotColor: '#3b82f6',
                    selectedDotColor: '#ffffff',
                    arrowColor: '#3b82f6',
                    monthTextColor: '#1f2937',
                    textDayFontFamily: 'System',
                    textMonthFontFamily: 'System',
                    textDayHeaderFontFamily: 'System',
                    textDayFontWeight: '400',
                    textMonthFontWeight: '600',
                    textDayHeaderFontWeight: '500',
                    textDayFontSize: 14,
                    textMonthFontSize: 16,
                    textDayHeaderFontSize: 12,
                }}
                {...props}
            />
        </View>
    );
}
