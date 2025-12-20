
export const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || 'pk.placeholder-mapbox-token';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface RouteData {
  distance: number; // in km
  duration: number; // in minutes
  geometry: Coordinates[];
}

// Mock Cities to provide somewhat realistic suggestions
const MOCK_LOCATIONS = [
  { name: "Whitefield, Bengaluru", lat: 12.9698, lng: 77.7500 },
  { name: "Indiranagar, Bengaluru", lat: 12.9716, lng: 77.6412 },
  { name: "Koramangala, Bengaluru", lat: 12.9352, lng: 77.6245 },
  { name: "MG Road, Bengaluru", lat: 12.9766, lng: 77.6014 },
  { name: "Electronic City, Bengaluru", lat: 12.8399, lng: 77.6770 },
  { name: "Hebbal, Bengaluru", lat: 13.0359, lng: 77.5970 }
];

export async function getRoute(start: Coordinates, end: Coordinates): Promise<RouteData> {
  const isMock = MAPBOX_TOKEN.includes('placeholder');

  if (!isMock) {
    try {
      const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${start.lng},${start.lat};${end.lng},${end.lat}?geometries=geojson&access_token=${MAPBOX_TOKEN}`
      );

      const data = await response.json();

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const geometry = route.geometry.coordinates.map(([lng, lat]: [number, number]) => ({ lat, lng }));

        return {
          distance: route.distance / 1000, // convert meters to km
          duration: Math.round(route.duration / 60), // convert seconds to minutes
          geometry
        };
      }
    } catch (error) {
      console.warn('Error fetching route, falling back to mock:', error);
    }
  }

  // Mock Route
  const steps = 20;
  const geometry = Array.from({ length: steps }).map((_, i) => ({
    lat: start.lat + (end.lat - start.lat) * (i / (steps - 1)),
    lng: start.lng + (end.lng - start.lng) * (i / (steps - 1))
  }));

  // Calculate roughly straight line distance (Haversine approx)
  const R = 6371; // km
  const dLat = (end.lat - start.lat) * Math.PI / 180;
  const dLon = (end.lng - start.lng) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(start.lat * Math.PI / 180) * Math.cos(end.lat * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const dist = R * c;

  return {
    distance: parseFloat(dist.toFixed(1)),
    duration: Math.round(dist * 2), // rough estimate 30km/h avg
    geometry
  };
}

export async function geocodeAddress(address: string): Promise<Coordinates | null> {
  const isMock = MAPBOX_TOKEN.includes('placeholder');

  if (!isMock) {
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${MAPBOX_TOKEN}`
      );

      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].center;
        return { lat, lng };
      }
    } catch (error) {
      console.warn('Error geocoding address, falling back to mock:', error);
    }
  }

  // Mock Geocode - Return a random nearby point or match standard list
  const match = MOCK_LOCATIONS.find(l => l.name.toLowerCase().includes(address.toLowerCase()));
  if (match) return { lat: match.lat, lng: match.lng };

  // Generate deterministic pseudo-random coords based on string char codes
  const hash = address.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return {
    lat: 12.9716 + (hash % 100) * 0.001,
    lng: 77.5946 + (hash % 100) * 0.001
  };
}

export async function reverseGeocode(coords: Coordinates): Promise<string> {
  const isMock = MAPBOX_TOKEN.includes('placeholder');

  if (!isMock) {
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${coords.lng},${coords.lat}.json?access_token=${MAPBOX_TOKEN}`
      );

      const data = await response.json();

      if (data.features && data.features.length > 0) {
        return data.features[0].place_name;
      }
    } catch (error) {
      console.warn('Error reverse geocoding, falling back to mock:', error);
    }
  }

  return `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`;
}
