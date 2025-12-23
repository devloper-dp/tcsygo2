import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SlidersHorizontal, X } from 'lucide-react';
import { useSearchStore } from '@/lib/search-store';

interface AdvancedFiltersProps {
    onApply?: () => void;
}

export function AdvancedFilters({ onApply }: AdvancedFiltersProps) {
    const { filters, setFilters, resetFilters } = useSearchStore();
    const [isOpen, setIsOpen] = useState(false);

    const handleApply = () => {
        setIsOpen(false);
        onApply?.();
    };

    const handleReset = () => {
        resetFilters();
        onApply?.();
    };

    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="relative">
                    <SlidersHorizontal className="w-4 h-4" />
                    {(filters.minPrice || filters.maxPrice || filters.minSeats || Object.values(filters.preferences || {}).some(Boolean)) && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
                    )}
                </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-md overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>Advanced Filters</SheetTitle>
                </SheetHeader>

                <div className="space-y-6 py-6">
                    {/* Price Range */}
                    <div className="space-y-3">
                        <Label className="text-base font-semibold">Price Range</Label>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="minPrice" className="text-sm">Min Price (₹)</Label>
                                <Input
                                    id="minPrice"
                                    type="number"
                                    placeholder="0"
                                    value={filters.minPrice || ''}
                                    onChange={(e) => setFilters({ minPrice: e.target.value ? Number(e.target.value) : undefined })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="maxPrice" className="text-sm">Max Price (₹)</Label>
                                <Input
                                    id="maxPrice"
                                    type="number"
                                    placeholder="1000"
                                    value={filters.maxPrice || ''}
                                    onChange={(e) => setFilters({ maxPrice: e.target.value ? Number(e.target.value) : undefined })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Departure Time */}
                    <div className="space-y-3">
                        <Label className="text-base font-semibold">Departure Time</Label>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="startTime" className="text-sm">From</Label>
                                <Input
                                    id="startTime"
                                    type="time"
                                    value={filters.departureTimeStart || ''}
                                    onChange={(e) => setFilters({ departureTimeStart: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="endTime" className="text-sm">To</Label>
                                <Input
                                    id="endTime"
                                    type="time"
                                    value={filters.departureTimeEnd || ''}
                                    onChange={(e) => setFilters({ departureTimeEnd: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Minimum Seats */}
                    <div className="space-y-3">
                        <Label htmlFor="minSeats" className="text-base font-semibold">
                            Minimum Seats: {filters.minSeats || 1}
                        </Label>
                        <Slider
                            id="minSeats"
                            min={1}
                            max={7}
                            step={1}
                            value={[filters.minSeats || 1]}
                            onValueChange={([value]) => setFilters({ minSeats: value })}
                            className="w-full"
                        />
                    </div>

                    {/* Preferences */}
                    <div className="space-y-3">
                        <Label className="text-base font-semibold">Preferences</Label>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="smoking" className="text-sm font-normal">Smoking Allowed</Label>
                                <Switch
                                    id="smoking"
                                    checked={filters.preferences?.smoking || false}
                                    onCheckedChange={(checked) =>
                                        setFilters({
                                            preferences: { ...filters.preferences, smoking: checked },
                                        })
                                    }
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <Label htmlFor="pets" className="text-sm font-normal">Pets Allowed</Label>
                                <Switch
                                    id="pets"
                                    checked={filters.preferences?.pets || false}
                                    onCheckedChange={(checked) =>
                                        setFilters({
                                            preferences: { ...filters.preferences, pets: checked },
                                        })
                                    }
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <Label htmlFor="music" className="text-sm font-normal">Music Allowed</Label>
                                <Switch
                                    id="music"
                                    checked={filters.preferences?.music || false}
                                    onCheckedChange={(checked) =>
                                        setFilters({
                                            preferences: { ...filters.preferences, music: checked },
                                        })
                                    }
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <Label htmlFor="luggage" className="text-sm font-normal">Extra Luggage</Label>
                                <Switch
                                    id="luggage"
                                    checked={filters.preferences?.luggage || false}
                                    onCheckedChange={(checked) =>
                                        setFilters({
                                            preferences: { ...filters.preferences, luggage: checked },
                                        })
                                    }
                                />
                            </div>
                        </div>
                    </div>

                    {/* Sort By */}
                    <div className="space-y-3">
                        <Label htmlFor="sortBy" className="text-base font-semibold">Sort By</Label>
                        <Select
                            value={filters.sortBy || 'departure'}
                            onValueChange={(value: any) => setFilters({ sortBy: value })}
                        >
                            <SelectTrigger id="sortBy">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="price">Price</SelectItem>
                                <SelectItem value="departure">Departure Time</SelectItem>
                                <SelectItem value="duration">Duration</SelectItem>
                                <SelectItem value="rating">Driver Rating</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Sort Order */}
                    <div className="space-y-3">
                        <Label htmlFor="sortOrder" className="text-base font-semibold">Order</Label>
                        <Select
                            value={filters.sortOrder || 'asc'}
                            onValueChange={(value: any) => setFilters({ sortOrder: value })}
                        >
                            <SelectTrigger id="sortOrder">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="asc">Ascending</SelectItem>
                                <SelectItem value="desc">Descending</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="flex gap-3 pt-6 border-t">
                    <Button variant="outline" onClick={handleReset} className="flex-1">
                        <X className="w-4 h-4 mr-2" />
                        Reset
                    </Button>
                    <Button onClick={handleApply} className="flex-1">
                        Apply Filters
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}
