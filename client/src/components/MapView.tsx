import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { MAPBOX_TOKEN } from '@/lib/mapbox';
import { Coordinates } from '@/lib/mapbox';
import { socket } from '@/lib/socket';

mapboxgl.accessToken = MAPBOX_TOKEN;

interface MapViewProps {
  center?: Coordinates;
  zoom?: number;
  markers?: Array<{
    id: string;
    coordinates: Coordinates;
    color?: string;
    popup?: string;
  }>;
  route?: Coordinates[];
  onMapClick?: (coords: Coordinates) => void;
  className?: string;
}

const isDevToken = MAPBOX_TOKEN.includes('placeholder');

export function MapView({
  center = { lat: 28.6139, lng: 77.2090 }, // Default to Delhi
  zoom = 12,
  markers = [],
  route,
  onMapClick,
  className = 'w-full h-full',
  tripId
}: MapViewProps & { tripId?: string }) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const driverMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const routeSourceId = 'route';

  useEffect(() => {
    if (!tripId) return;
    // In dev mode with no map, we still might want socket updates, or just skip
    if (isDevToken) return; 

    // Join the trip room
    socket.emit('trip:join', tripId);

    const handleLocationUpdate = (data: { lat: number; lng: number; heading?: number }) => {
      if (!map.current || !mapLoaded) return;

      const { lat, lng } = data;

      if (!driverMarkerRef.current) {
        const el = document.createElement('div');
        el.className = 'w-10 h-10 bg-primary rounded-full border-4 border-white shadow-xl flex items-center justify-center';
        el.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-white"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.6-.4-1-1-1h-2v5zm-7-5h5v5h-5v-5zm-7-5h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z"/></svg>'; // Simple car/vehicle icon

        driverMarkerRef.current = new mapboxgl.Marker(el)
          .setLngLat([lng, lat])
          .addTo(map.current);
      } else {
        driverMarkerRef.current.setLngLat([lng, lat]);
      }
    };

    socket.on('location:updated', handleLocationUpdate);

    return () => {
      socket.emit('trip:leave', tripId);
      socket.off('location:updated', handleLocationUpdate);
      if (driverMarkerRef.current) {
        driverMarkerRef.current.remove();
        driverMarkerRef.current = null;
      }
    };
  }, [tripId, mapLoaded]);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;
    if (isDevToken) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [center.lng, center.lat],
      zoom: zoom,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'bottom-right');
    map.current.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
      }),
      'bottom-right'
    );

    if (onMapClick) {
      map.current.on('click', (e) => {
        onMapClick({ lat: e.lngLat.lat, lng: e.lngLat.lng });
      });
    }

    map.current.on('load', () => {
      setMapLoaded(true);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    if (!map.current) return;
    map.current.setCenter([center.lng, center.lat]);
  }, [center]);

  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    markers.forEach(marker => {
      const el = document.createElement('div');
      el.className = 'w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center';
      el.style.backgroundColor = marker.color || '#3b82f6';

      const markerInstance = new mapboxgl.Marker(el)
        .setLngLat([marker.coordinates.lng, marker.coordinates.lat])
        .addTo(map.current!);

      if (marker.popup) {
        markerInstance.setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(marker.popup)
        );
      }

      markersRef.current.push(markerInstance);
    });

    if (markers.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      markers.forEach(marker => {
        bounds.extend([marker.coordinates.lng, marker.coordinates.lat]);
      });
      // Extend bounds to include driver if exists?
      if (driverMarkerRef.current) {
        bounds.extend(driverMarkerRef.current.getLngLat());
      }
      map.current.fitBounds(bounds, { padding: 50 });
    }
  }, [markers, mapLoaded]);

  useEffect(() => {
    if (!map.current || !mapLoaded || !route || route.length === 0) return;

    const source = map.current.getSource(routeSourceId);

    const routeGeoJSON = {
      type: 'Feature' as const,
      properties: {},
      geometry: {
        type: 'LineString' as const,
        coordinates: route.map(coord => [coord.lng, coord.lat])
      }
    };

    if (source) {
      (source as mapboxgl.GeoJSONSource).setData(routeGeoJSON);
    } else {
      map.current.addSource(routeSourceId, {
        type: 'geojson',
        data: routeGeoJSON
      });

      map.current.addLayer({
        id: 'route-layer',
        type: 'line',
        source: routeSourceId,
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#3b82f6',
          'line-width': 4,
          'line-opacity': 0.8
        }
      });
    }

    const bounds = new mapboxgl.LngLatBounds();
    route.forEach(coord => {
      bounds.extend([coord.lng, coord.lat]);
    });
    map.current.fitBounds(bounds, { padding: 80 });
  }, [route, mapLoaded]);

  return (
    <div ref={mapContainer} className={`${className} relative bg-muted/20`} data-testid="map-container">
      {isDevToken && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/10">
          <div className="text-center p-6 bg-background/80 backdrop-blur rounded-lg border shadow-sm">
            <div className="mb-2 text-primary font-bold text-lg">Development Mode</div>
            <p className="text-sm text-muted-foreground mb-1">Mapbox Token is not configured.</p>
            <p className="text-xs text-muted-foreground">Map rendering is disabled.</p>
          </div>
        </div>
      )}
    </div>
  );
}
