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

export async function getRoute(start: Coordinates, end: Coordinates): Promise<RouteData> {
  try {
    const response = await fetch(
      `https://api.mapbox.com/directions/v5/mapbox/driving/${start.lng},${start.lat};${end.lng},${end.lat}?geometries=geojson&access_token=${MAPBOX_TOKEN}`
    );
    
    const data = await response.json();
    
    if (!data.routes || data.routes.length === 0) {
      throw new Error('No route found');
    }
    
    const route = data.routes[0];
    const geometry = route.geometry.coordinates.map(([lng, lat]: [number, number]) => ({ lat, lng }));
    
    return {
      distance: route.distance / 1000, // convert meters to km
      duration: Math.round(route.duration / 60), // convert seconds to minutes
      geometry
    };
  } catch (error) {
    console.error('Error fetching route:', error);
    // Return mock data for development
    return {
      distance: 25.5,
      duration: 35,
      geometry: [start, end]
    };
  }
}

export async function geocodeAddress(address: string): Promise<Coordinates | null> {
  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${MAPBOX_TOKEN}`
    );
    
    const data = await response.json();
    
    if (!data.features || data.features.length === 0) {
      return null;
    }
    
    const [lng, lat] = data.features[0].center;
    return { lat, lng };
  } catch (error) {
    console.error('Error geocoding address:', error);
    return null;
  }
}

export async function reverseGeocode(coords: Coordinates): Promise<string> {
  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${coords.lng},${coords.lat}.json?access_token=${MAPBOX_TOKEN}`
    );
    
    const data = await response.json();
    
    if (!data.features || data.features.length === 0) {
      return `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`;
    }
    
    return data.features[0].place_name;
  } catch (error) {
    console.error('Error reverse geocoding:', error);
    return `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`;
  }
}
