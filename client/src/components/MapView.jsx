import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { loadGoogleMaps, hasGoogleMapsKey, onGoogleAuthFailure, isGoogleAuthFailed, reportGoogleMapsFailure } from '../services/googleMaps';

/* -------------------------------------------------------------------------- *
 *  Shared SVG marker artwork.
 *  Two builders: one produces inline HTML (Leaflet divIcon), the other a data
 *  URI icon (Google Maps Marker). Both share the same visual language.
 * -------------------------------------------------------------------------- */

function markerSvg(color, text, type = 'pin', withLabel = true) {
  const label = text && withLabel;
  if (type === 'bike') {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="${label ? 52 : 36}" viewBox="0 0 36 ${label ? 52 : 36}">
      <circle cx="18" cy="18" r="16" fill="${color}" stroke="#ffffff" stroke-width="2"/>
      <path fill="#ffffff" d="M21.5 11.5c-.8 0-1.5.7-1.5 1.5s.7 1.5 1.5 1.5 1.5-.7 1.5-1.5-.7-1.5-1.5-1.5zm-8 4C12.1 15.5 11 16.6 11 18s1.1 2.5 2.5 2.5 2.5-1.1 2.5-2.5-1.1-2.5-2.5-2.5zm9 0c-1.4 0-2.5 1.1-2.5 2.5s1.1 2.5 2.5 2.5 2.5-1.1 2.5-2.5-1.1-2.5-2.5-2.5z"/>
      ${label ? `<text x="18" y="49" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" font-weight="bold" fill="#111111" stroke="#ffffff" stroke-width="2.5" paint-order="stroke">${text}</text>` : ''}
    </svg>`;
  }
  if (type === 'car') {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="${label ? 52 : 36}" viewBox="0 0 36 ${label ? 52 : 36}">
      <circle cx="18" cy="18" r="16" fill="${color}" stroke="#ffffff" stroke-width="2"/>
      <path fill="#ffffff" d="M25.9 12.5c-.2-.6-.8-1-1.4-1H11.5c-.66 0-1.21.42-1.42 1.01L8 19v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h14v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-6.5zM12.5 23c-.83 0-1.5-.67-1.5-1.5S11.67 20 12.5 20s1.5.67 1.5 1.5S13.33 23 12.5 23zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM10 18l1.5-4.5h13L26 18H10z"/>
      ${label ? `<text x="18" y="49" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" font-weight="bold" fill="#111111" stroke="#ffffff" stroke-width="2.5" paint-order="stroke">${text}</text>` : ''}
    </svg>`;
  }
  // pin
  return `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="${label ? 54 : 42}" viewBox="0 0 32 ${label ? 54 : 42}">
    <path fill="${color}" stroke="#ffffff" stroke-width="2" d="M16 0C7.2 0 0 7.2 0 16c0 12 16 26 16 26s16-14 16-26c0-8.8-7.2-16-16-16z"/>
    <circle cx="16" cy="16" r="6" fill="#ffffff"/>
    ${label ? `<text x="16" y="52" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" font-weight="bold" fill="#111111" stroke="#ffffff" stroke-width="2.5" paint-order="stroke">${text}</text>` : ''}
  </svg>`;
}

// Leaflet uses an HTML divIcon (marker artwork + a dark label chip).
const createLeafletIcon = (color, text, type = 'pin') =>
  L.divIcon({
    className: 'custom-leaflet-icon',
    html: `<div style="display:flex; flex-direction:column; align-items:center;">
             ${markerSvg(color, text, type, false)}
             ${text ? `<span style="background:rgba(0,0,0,0.75); color:white; font-size:10px; font-weight:bold; padding:2px 6px; border-radius:4px; margin-top:2px; white-space:nowrap;">${text}</span>` : ''}
           </div>`,
    iconSize: [36, 46],
    iconAnchor: [18, 42],
  });

// Google Maps uses an image icon; the SVG already carries its own text label.
const createGoogleIcon = (color, text, type = 'pin') => {
  const label = Boolean(text);
  const width = type === 'pin' ? 32 : 36;
  const height = (type === 'pin' ? 42 : 36) + (label ? 12 : 0);
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(markerSvg(color, text, type, true))}`,
    scaledSize: new window.google.maps.Size(width, height),
    anchor: new window.google.maps.Point(width / 2, type === 'pin' ? 42 : 36),
  };
};

const DEFAULT_CENTER = [13.0805, 77.5458];

/* -------------------------------------------------------------------------- *
 *  Google Maps implementation (primary). Same prop contract as MapView.
 * -------------------------------------------------------------------------- */
const GoogleMapView = ({
  center = DEFAULT_CENTER,
  zoom = 14,
  pickupCoords,
  dropCoords,
  driverCoords,
  driverType = 'Bike',
  showRoute = true,
  routeGeometry = null,
  onMapClick = null,
  className = 'h-64 w-full',
}) => {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const overlaysRef = useRef([]);
  const clickRef = useRef(null);

  // Initialise the Google map once. Google Maps has no destroy(); we bind the
  // instance to the container node so React StrictMode's double-invoke (and any
  // remount) reuses the same map instead of leaking / double-initialising.
  useEffect(() => {
    const node = containerRef.current;
    if (!node) return undefined;
    if (!window.google?.maps?.Map) {
      reportGoogleMapsFailure();
      return undefined;
    }
    const g = window.google.maps;
    try {
      if (!node.__campusrideGmap) {
        node.__campusrideGmap = new g.Map(node, {
          center: { lat: center[0], lng: center[1] },
          zoom,
          disableDefaultUI: true,
          gestureHandling: 'greedy',
          clickableIcons: false,
        });
      }
    } catch (err) {
      // Never let a map/key problem crash the surrounding dashboard.
      reportGoogleMapsFailure(err);
      return undefined;
    }
    mapRef.current = node.__campusrideGmap;
    return () => {
      // Keep the map bound to the node; just drop our local reference.
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redraw markers / route whenever inputs change.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const g = window.google.maps;

    try {
    // Clear previous overlays and the click listener.
    overlaysRef.current.forEach((o) => o.setMap(null));
    overlaysRef.current = [];
    if (clickRef.current) {
      g.event.removeListener(clickRef.current);
      clickRef.current = null;
    }
    if (onMapClick) {
      clickRef.current = map.addListener('click', (e) =>
        onMapClick(e.latLng.lat(), e.latLng.lng())
      );
    }

    const points = [];
    const addMarker = (coords, color, text, type) => {
      if (!coords || typeof coords.lat !== 'number' || typeof coords.lng !== 'number') return;
      const marker = new g.Marker({
        position: { lat: coords.lat, lng: coords.lng },
        map,
        icon: createGoogleIcon(color, text, type),
      });
      overlaysRef.current.push(marker);
      points.push({ lat: coords.lat, lng: coords.lng });
    };

    addMarker(pickupCoords, '#10B981', 'Pickup', 'pin');
    addMarker(dropCoords, '#EF4444', 'Drop', 'pin');
    addMarker(driverCoords, '#2563EB', 'Captain', driverType?.toLowerCase() === 'car' ? 'car' : 'bike');

    if (showRoute && routeGeometry && routeGeometry.length > 1) {
      const path = routeGeometry.map(([lat, lng]) => ({ lat, lng }));
      const line = new g.Polyline({
        path,
        map,
        strokeColor: '#2563EB',
        strokeWeight: 5,
        strokeOpacity: 0.9,
        geodesic: true,
      });
      overlaysRef.current.push(line);
      path.forEach((p) => points.push(p));
    }

    if (points.length > 1) {
      const bounds = new g.LatLngBounds();
      points.forEach((p) => bounds.extend(p));
      map.fitBounds(bounds, { top: 40, bottom: 40, left: 40, right: 40 });
    } else if (points.length === 1) {
      map.setCenter(points[0]);
      map.setZoom(zoom);
    } else {
      map.setCenter({ lat: center[0], lng: center[1] });
      map.setZoom(zoom);
    }
    } catch (err) {
      reportGoogleMapsFailure(err);
    }
  }, [center, zoom, pickupCoords, dropCoords, driverCoords, driverType, showRoute, routeGeometry, onMapClick]);

  return (
    <div className={`relative overflow-hidden rounded-2xl ${className}`}>
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
};

/* -------------------------------------------------------------------------- *
 *  Leaflet fallback implementation (used only if Google Maps cannot load).
 * -------------------------------------------------------------------------- */
const LeafletMapView = ({
  center = DEFAULT_CENTER,
  zoom = 14,
  pickupCoords,
  dropCoords,
  driverCoords,
  driverType = 'Bike',
  showRoute = true,
  routeGeometry = null,
  onMapClick = null,
  className = 'h-64 w-full',
}) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layerGroupRef = useRef(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center,
        zoom,
        zoomControl: false,
        attributionControl: false,
      });
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd',
      }).addTo(map);
      layerGroupRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;
    map.off('click');
    if (onMapClick) {
      map.on('click', (e) => onMapClick(e.latlng.lat, e.latlng.lng));
    }
    const layerGroup = layerGroupRef.current;
    layerGroup.clearLayers();

    const bounds = [];

    if (pickupCoords && pickupCoords.lat && pickupCoords.lng) {
      const pLatLng = [pickupCoords.lat, pickupCoords.lng];
      L.marker(pLatLng, { icon: createLeafletIcon('#10B981', 'Pickup', 'pin') }).addTo(layerGroup);
      bounds.push(pLatLng);
    }
    if (dropCoords && dropCoords.lat && dropCoords.lng) {
      const dLatLng = [dropCoords.lat, dropCoords.lng];
      L.marker(dLatLng, { icon: createLeafletIcon('#EF4444', 'Drop', 'pin') }).addTo(layerGroup);
      bounds.push(dLatLng);
    }
    if (driverCoords && driverCoords.lat && driverCoords.lng) {
      const drLatLng = [driverCoords.lat, driverCoords.lng];
      const iconType = driverType.toLowerCase() === 'car' ? 'car' : 'bike';
      L.marker(drLatLng, { icon: createLeafletIcon('#2563EB', 'Captain', iconType) }).addTo(layerGroup);
      bounds.push(drLatLng);
    }

    if (showRoute && routeGeometry && routeGeometry.length > 1) {
      L.polyline(routeGeometry, {
        color: '#2563EB',
        weight: 5,
        opacity: 0.9,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(layerGroup);
      routeGeometry.forEach((pt) => bounds.push(pt));
    }

    if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    } else if (bounds.length === 1) {
      map.setView(bounds[0], zoom);
    } else {
      map.setView(center, zoom);
    }
  }, [center, zoom, pickupCoords, dropCoords, driverCoords, driverType, showRoute, routeGeometry, onMapClick]);

  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div className={`relative overflow-hidden rounded-2xl ${className}`}>
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
};

/* -------------------------------------------------------------------------- *
 *  MapView — picks Google Maps when a key is configured and the API loads,
 *  otherwise transparently falls back to Leaflet (offline-friendly).
 * -------------------------------------------------------------------------- */
const MapView = (props) => {
  const { className = 'h-64 w-full' } = props;
  const [engine, setEngine] = useState(
    hasGoogleMapsKey() && !isGoogleAuthFailed() ? 'loading' : 'leaflet'
  );

  useEffect(() => {
    if (engine !== 'loading') return undefined;
    let cancelled = false;
    loadGoogleMaps()
      .then(() => {
        if (!cancelled) setEngine('google');
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.warn('[CampusRide] Google Maps unavailable, using Leaflet fallback:', err.message);
        if (!cancelled) setEngine('leaflet');
      });
    return () => {
      cancelled = true;
    };
  }, [engine]);

  // If Google reports an auth/billing failure at any point, drop to Leaflet.
  useEffect(() => onGoogleAuthFailure(() => setEngine('leaflet')), []);

  if (engine === 'google') return <GoogleMapView {...props} />;
  if (engine === 'loading') {
    return (
      <div className={`relative overflow-hidden rounded-2xl bg-slate-100 ${className}`}>
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-7 h-7 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }
  return <LeafletMapView {...props} />;
};

export default MapView;
