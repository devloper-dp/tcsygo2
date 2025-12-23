import { useState } from 'react';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { SlidersHorizontal, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export interface SearchFilters {
    priceRange: [number, number];
    minRating: number;
    departureTimeRange: string;
    vehicleTypes: string[];
    preferences: {
        smoking: boolean | null;
        pets: boolean | null;
        music: boolean | null;
    };
    sortBy: 'price' | 'rating' | 'departure' | 'distance';
}

interface SearchFiltersProps {
    filters: SearchFilters;
    onFiltersChange: (filters: SearchFilters) => void;
}

const DEFAULT_FILTERS: SearchFilters = {
    priceRange: [0, 1000],
    minRating: 0,
    departureTimeRange: 'any',
    vehicleTypes: [],
    preferences: {
        smoking: null,
        pets: null,
        music: null,
    },
    sortBy: 'departure',
};

export function SearchFiltersSheet({ filters, onFiltersChange }: SearchFiltersProps) {
    const [localFilters, setLocalFilters] = useState(filters);
    const [isOpen, setIsOpen] = useState(false);

    const handleApply = () => {
        onFiltersChange(localFilters);
        setIsOpen(false);
    };

    const handleReset = () => {
        setLocalFilters(DEFAULT_FILTERS);
        onFiltersChange(DEFAULT_FILTERS);
    };

    const activeFilterCount = [
        localFilters.priceRange[0] > 0 || localFilters.priceRange[1] < 1000,
        localFilters.minRating > 0,
        localFilters.departureTimeRange !== 'any',
        localFilters.vehicleTypes.length > 0,
        localFilters.preferences.smoking !== null ||
        localFilters.preferences.pets !== null ||
        localFilters.preferences.music !== null,
    ].filter(Boolean).length;

    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <SlidersHorizontal className="w-4 h-4" />
                    Filters
                    {activeFilterCount > 0 && (
                        <Badge variant="secondary" className="ml-1">
                            {activeFilterCount}
                        </Badge>
                    )}
                </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-md overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>Filter Trips</SheetTitle>
                </SheetHeader>

                <div className="space-y-6 py-6">
                    {/* Price Range */}
                    <div>
                        <Label className="mb-3 block">
                            Price Range: ₹{localFilters.priceRange[0]} - ₹{localFilters.priceRange[1]}
                        </Label>
                        <Slider
                            min={0}
                            max={1000}
                            step={50}
                            value={localFilters.priceRange}
                            onValueChange={(value) =>
                                setLocalFilters({ ...localFilters, priceRange: value as [number, number] })
                            }
                        />
                    </div>

                    {/* Minimum Rating */}
                    <div>
                        <Label className="mb-3 block">Minimum Driver Rating</Label>
                        <RadioGroup
                            value={localFilters.minRating.toString()}
                            onValueChange={(value) =>
                                setLocalFilters({ ...localFilters, minRating: parseFloat(value) })
                            }
                        >
                            {[0, 3, 4, 4.5].map((rating) => (
                                <div key={rating} className="flex items-center space-x-2">
                                    <RadioGroupItem value={rating.toString()} id={`rating-${rating}`} />
                                    <Label htmlFor={`rating-${rating}`} className="font-normal cursor-pointer">
                                        {rating === 0 ? 'Any rating' : `${rating}+ stars`}
                                    </Label>
                                </div>
                            ))}
                        </RadioGroup>
                    </div>

                    {/* Departure Time */}
                    <div>
                        <Label className="mb-3 block">Departure Time</Label>
                        <RadioGroup
                            value={localFilters.departureTimeRange}
                            onValueChange={(value) =>
                                setLocalFilters({ ...localFilters, departureTimeRange: value })
                            }
                        >
                            {[
                                { value: 'any', label: 'Any time' },
                                { value: 'morning', label: 'Morning (6 AM - 12 PM)' },
                                { value: 'afternoon', label: 'Afternoon (12 PM - 6 PM)' },
                                { value: 'evening', label: 'Evening (6 PM - 12 AM)' },
                                { value: 'night', label: 'Night (12 AM - 6 AM)' },
                            ].map((option) => (
                                <div key={option.value} className="flex items-center space-x-2">
                                    <RadioGroupItem value={option.value} id={`time-${option.value}`} />
                                    <Label htmlFor={`time-${option.value}`} className="font-normal cursor-pointer">
                                        {option.label}
                                    </Label>
                                </div>
                            ))}
                        </RadioGroup>
                    </div>

                    {/* Trip Preferences */}
                    <div>
                        <Label className="mb-3 block">Trip Preferences</Label>
                        <div className="space-y-3">
                            {[
                                { key: 'smoking', label: 'Smoking allowed' },
                                { key: 'pets', label: 'Pets allowed' },
                                { key: 'music', label: 'Music allowed' },
                            ].map((pref) => (
                                <div key={pref.key} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={pref.key}
                                        checked={localFilters.preferences[pref.key as keyof typeof localFilters.preferences] === true}
                                        onCheckedChange={(checked) =>
                                            setLocalFilters({
                                                ...localFilters,
                                                preferences: {
                                                    ...localFilters.preferences,
                                                    [pref.key]: checked ? true : null,
                                                },
                                            })
                                        }
                                    />
                                    <Label htmlFor={pref.key} className="font-normal cursor-pointer">
                                        {pref.label}
                                    </Label>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Sort By */}
                    <div>
                        <Label className="mb-3 block">Sort By</Label>
                        <RadioGroup
                            value={localFilters.sortBy}
                            onValueChange={(value) =>
                                setLocalFilters({ ...localFilters, sortBy: value as any })
                            }
                        >
                            {[
                                { value: 'price', label: 'Lowest Price' },
                                { value: 'rating', label: 'Highest Rating' },
                                { value: 'departure', label: 'Earliest Departure' },
                                { value: 'distance', label: 'Shortest Distance' },
                            ].map((option) => (
                                <div key={option.value} className="flex items-center space-x-2">
                                    <RadioGroupItem value={option.value} id={`sort-${option.value}`} />
                                    <Label htmlFor={`sort-${option.value}`} className="font-normal cursor-pointer">
                                        {option.label}
                                    </Label>
                                </div>
                            ))}
                        </RadioGroup>
                    </div>
                </div>

                <div className="flex gap-2 pt-4 border-t">
                    <Button variant="outline" className="flex-1" onClick={handleReset}>
                        Reset
                    </Button>
                    <Button className="flex-1" onClick={handleApply}>
                        Apply Filters
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}
