import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { MAPBOX_TOKEN } from '@/lib/mapbox';
import { Coordinates } from '@/lib/mapbox';

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

export function MapView({
  center = { lat: 28.6139, lng: 77.2090 }, // Default to Delhi
  zoom = 12,
  markers = [],
  route,
  onMapClick,
  className = 'w-full h-full'
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const routeSourceId = 'route';

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

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

  return <div ref={mapContainer} className={className} data-testid="map-container" />;
}
