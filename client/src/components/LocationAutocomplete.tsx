import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { MapPin } from 'lucide-react';
import { Coordinates, searchLocations } from '@/lib/maps';

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string, coords?: Coordinates) => void;
  placeholder?: string;
  className?: string;
  testId?: string;
}

interface Suggestion {
  name: string;
  coordinates: Coordinates;
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
  const [loading, setLoading] = useState(false);
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
    if (!value || value.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const results = await searchLocations(value);
        setSuggestions(results);
        setShowSuggestions(true);
      } catch (error) {
        console.error('Error fetching suggestions:', error);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 500); // Increased debounce slightly to reduce API calls

    return () => {
      clearTimeout(timer);
      setLoading(false);
    };
  }, [value]);

  const handleSelectSuggestion = (suggestion: Suggestion) => {
    onChange(suggestion.name, suggestion.coordinates);
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
          className={`pl-10 pr-10 ${className}`} // Added pr-10 for loader space
          data-testid={testId}
          onFocus={() => {
            if (value.length >= 2 && suggestions.length > 0) setShowSuggestions(true);
          }}
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        )}
      </div>

      {showSuggestions && value.length >= 2 && (
        <div className="absolute z-[100] w-full mt-1 bg-popover border border-popover-border rounded-lg shadow-lg overflow-hidden">
          {suggestions.length > 0 ? (
            suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSelectSuggestion(suggestion)}
                className="w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors flex items-start gap-2 border-b border-border last:border-b-0"
                data-testid={`suggestion-${index}`}
              >
                <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <span className="text-sm line-clamp-2">{suggestion.name}</span>
              </button>
            ))
          ) : (
            !loading && (
              <div className="p-4 text-sm text-muted-foreground text-center">
                No locations found
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
