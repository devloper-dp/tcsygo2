import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { MapPin } from 'lucide-react';
import { Coordinates } from '@/lib/mapbox';
import { MAPBOX_TOKEN } from '@/lib/mapbox';

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string, coords?: Coordinates) => void;
  placeholder?: string;
  className?: string;
  testId?: string;
}

interface Suggestion {
  id: string;
  place_name: string;
  center: [number, number];
}

export function LocationAutocomplete({
  value,
  onChange,
  placeholder = 'Enter location',
  className,
  testId
}: LocationAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!value || value.length < 3) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(value)}.json?access_token=${MAPBOX_TOKEN}&limit=5`
        );
        const data = await response.json();
        setSuggestions(data.features || []);
        setShowSuggestions(true);
      } catch (error) {
        console.error('Error fetching suggestions:', error);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [value]);

  const handleSelectSuggestion = (suggestion: Suggestion) => {
    onChange(suggestion.place_name, {
      lat: suggestion.center[1],
      lng: suggestion.center[0]
    });
    setSuggestions([]);
    setShowSuggestions(false);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`pl-10 ${className}`}
          data-testid={testId}
        />
      </div>
      
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-popover-border rounded-lg shadow-lg overflow-hidden">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.id}
              onClick={() => handleSelectSuggestion(suggestion)}
              className="w-full px-4 py-3 text-left hover-elevate active-elevate-2 flex items-start gap-2 border-b border-border last:border-b-0"
              data-testid={`suggestion-${suggestion.id}`}
            >
              <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <span className="text-sm">{suggestion.place_name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
