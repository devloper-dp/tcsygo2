import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Coordinates } from '@/lib/maps';
import { supabase } from '@/lib/supabase';

// Fix Leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

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
  tripId?: string;
  isVisible?: boolean; // Add visibility prop to handle dynamic visibility
}

export function MapView({
  center = { lat: 22.7196, lng: 75.8577 }, // Default to Indore, India
  zoom = 12,
  markers = [],
  route,
  onMapClick,
  className = 'w-full h-full',
  tripId,
  isVisible = true
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const driverMarkerRef = useRef<L.Marker | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // Small delay to ensure container is fully rendered
    const timer = setTimeout(() => {
      if (!mapContainer.current || map.current) return;

      try {
        map.current = L.map(mapContainer.current, {
          zoomControl: true,
          attributionControl: true,
        }).setView([center.lat, center.lng], zoom);

        // Add OpenStreetMap tiles with error handling
        const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19,
          errorTileUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', // 1x1 transparent pixel
        });

        tileLayer.on('tileerror', (error) => {
          console.warn('Tile loading error:', error);
        });

        tileLayer.addTo(map.current);

        // Add click handler
        if (onMapClick) {
          map.current.on('click', (e) => {
            onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
          });
        }

        // Invalidate size after initialization
        setTimeout(() => {
          map.current?.invalidateSize();
        }, 100);
      } catch (error) {
        console.error('Error initializing map:', error);
      }
    }, 50);

    return () => {
      clearTimeout(timer);
      if (map.current) {
        try {
          map.current.remove();
        } catch (error) {
          console.error('Error removing map:', error);
        }
        map.current = null;
      }
    };
  }, []);

  // Update center
  useEffect(() => {
    if (!map.current) return;
    map.current.setView([center.lat, center.lng]);
  }, [center]);

  // Handle Resize
  useEffect(() => {
    if (!mapContainer.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        // Only invalidate if the container has actual size
        if (width > 0 && height > 0) {
          // Use requestAnimationFrame to ensure we are in sync with the browser paint cycle
          requestAnimationFrame(() => {
            map.current?.invalidateSize();
          });
        }
      }
    });

    resizeObserver.observe(mapContainer.current);

    return () => resizeObserver.disconnect();
  }, []);

  // Handle visibility changes - invalidate size when map becomes visible
  useEffect(() => {
    if (!map.current || !isVisible) return;

    // Small delay to ensure DOM has updated before invalidating size
    const timer = setTimeout(() => {
      map.current?.invalidateSize();
    }, 100);

    return () => clearTimeout(timer);
  }, [isVisible]);

  // Update markers
  useEffect(() => {
    if (!map.current) return;

    // Remove old markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add new markers
    markers.forEach(marker => {
      const icon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="width: 32px; height: 32px; background-color: ${marker.color || '#3b82f6'}; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const markerInstance = L.marker([marker.coordinates.lat, marker.coordinates.lng], { icon })
        .addTo(map.current!);

      if (marker.popup) {
        markerInstance.bindPopup(marker.popup);
      }

      markersRef.current.push(markerInstance);
    });

    // Fit bounds only if there are multiple markers (not on every single marker update)
    if (markers.length > 1) {
      // Use requestAnimationFrame to ensure fitBounds happens at the right time
      requestAnimationFrame(() => {
        if (!map.current) return;
        try {
          const bounds = L.latLngBounds(markers.map(m => [m.coordinates.lat, m.coordinates.lng]));
          map.current.fitBounds(bounds, { padding: [50, 50], animate: true, duration: 0.5, maxZoom: 15 });
        } catch (error) {
          console.error('Error fitting bounds:', error);
        }
      });
    }
  }, [markers]);

  // Update route
  useEffect(() => {
    if (!map.current || !route || !Array.isArray(route) || route.length === 0) return;

    // Remove old route
    if (routeLayerRef.current) {
      routeLayerRef.current.remove();
    }

    // Add new route
    const latlngs: L.LatLngExpression[] = route.map(coord => [coord.lat, coord.lng]);
    routeLayerRef.current = L.polyline(latlngs, {
      color: '#3b82f6',
      weight: 4,
      opacity: 0.8
    }).addTo(map.current);

    // Fit bounds to route
    requestAnimationFrame(() => {
      if (map.current && routeLayerRef.current) {
        try {
          map.current.fitBounds(routeLayerRef.current.getBounds(), { padding: [80, 80], animate: true, duration: 0.5 });
        } catch (error) {
          console.error('Error fitting route bounds:', error);
        }
      }
    });
  }, [route]);

  // Real-time driver location (if tripId provided)
  useEffect(() => {
    if (!tripId || !map.current) return;

    const channel = supabase.channel(`trip-${tripId}`)
      .on('broadcast', { event: 'driver-location' }, (payload) => {
        const { lat, lng } = payload.payload;
        if (!map.current) return;

        if (!driverMarkerRef.current) {
          const carIcon = L.divIcon({
            className: 'driver-marker',
            html: `<div style="width: 40px; height: 40px; background-color: #3b82f6; border-radius: 50%; border: 4px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center;">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.6-.4-1-1-1h-2v5zm-7-5h5v5h-5v-5zm-7-5h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z"/>
              </svg>
            </div>`,
            iconSize: [40, 40],
            iconAnchor: [20, 20]
          });

          driverMarkerRef.current = L.marker([lat, lng], { icon: carIcon }).addTo(map.current);
        } else {
          driverMarkerRef.current.setLatLng([lat, lng]);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (driverMarkerRef.current) {
        driverMarkerRef.current.remove();
        driverMarkerRef.current = null;
      }
    };
  }, [tripId]);

  return <div ref={mapContainer} className={className} style={{ minHeight: '400px', height: '100%' }} />;
}
