import { useCallback, useState, memo, useMemo } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { Auftrag, Monteur } from '../types/models';

interface DispositionMapProps {
  orders: Auftrag[];
  monteure: Monteur[];
  onOrderClick?: (order: Auftrag) => void;
  onMonteurClick?: (monteur: Monteur) => void;
}

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

// Default center: Germany
const defaultCenter = {
  lat: 51.1657,
  lng: 10.4515,
};

// Color configurations for order gewerk (trade type)
const GEWERK_COLORS: Record<string, string> = {
  Klempner: '#3B82F6',     // Blue for Sanitär/Plumbing
  Elektro: '#EAB308',      // Yellow for Electrical
  Heizung: '#EF4444',      // Red for Heating
};

// SVG path for a water droplet icon (for Sanitär/Plumbing)
const SANITAER_PATH = 'M12 2c-5.33 4.55-8 8.48-8 11.8 0 4.98 3.8 8.2 8 8.2s8-3.22 8-8.2c0-3.32-2.67-7.25-8-11.8z';

// SVG path for a lightning bolt icon (for Elektro)
const ELEKTRO_PATH = 'M7 2v11h3v9l7-12h-4l4-8z';

// SVG path for a flame icon (for Heizung)
const HEIZUNG_PATH = 'M12 2C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.87-3.13-7-7-7zm2 14h-4v-1h4v1zm0-2h-4v-1h4v1zm-2-3c-1.93 0-3.5-1.57-3.5-3.5S10.07 4 12 4s3.5 1.57 3.5 3.5S13.93 11 12 11z';

// SVG path for a house icon (for Monteure)
const HOUSE_PATH = 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z';

function DispositionMap({ orders, monteure, onOrderClick, onMonteurClick }: DispositionMapProps) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  const [selectedOrder, setSelectedOrder] = useState<Auftrag | null>(null);
  const [selectedMonteur, setSelectedMonteur] = useState<Monteur | null>(null);

  // Only load Google Maps if API key is provided
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    id: 'google-map-script',
    // Skip loading if there's no API key by using an invalid but non-empty key
    // This prevents the hook from making unnecessary network requests
  });

  // Show message if no API key is configured - check this BEFORE Google Maps loading states
  if (!apiKey) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-100 rounded-lg">
        <div className="text-center text-gray-600 p-4">
          <svg className="w-12 h-12 mx-auto mb-2 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="font-medium mb-1">Google Maps API-Key nicht konfiguriert</p>
          <p className="text-sm">Bitte setzen Sie VITE_GOOGLE_MAPS_API_KEY in der .env Datei</p>
        </div>
      </div>
    );
  }

  const onLoad = useCallback((map: google.maps.Map) => {
    // Fit bounds to show all markers
    const bounds = new google.maps.LatLngBounds();
    let hasMarkers = false;

    orders.forEach((order) => {
      if (order.latitude && order.longitude) {
        bounds.extend({ lat: order.latitude, lng: order.longitude });
        hasMarkers = true;
      }
    });

    monteure.forEach((monteur) => {
      if (monteur.gps_latitude && monteur.gps_longitude) {
        bounds.extend({ lat: monteur.gps_latitude, lng: monteur.gps_longitude });
        hasMarkers = true;
      }
    });

    if (hasMarkers) {
      map.fitBounds(bounds);
    }
  }, [orders, monteure]);

  // Create marker icons only when Google Maps is loaded
  // Uses gewerk (trade type) to determine marker appearance:
  // - Klempner/Sanitär: Blue water droplet icon
  // - Elektro: Yellow lightning bolt icon  
  // - Heizung: Red flame icon
  const getOrderMarkerIcon = useMemo(() => {
    if (!isLoaded || typeof google === 'undefined') return () => undefined;
    
    return (gewerk: string): google.maps.Symbol => {
      let path: string | google.maps.SymbolPath;
      let fillColor: string;
      let scale: number;
      let anchor: google.maps.Point | undefined;

      switch (gewerk) {
        case 'Klempner': // Sanitär - Blue water droplet
          path = SANITAER_PATH;
          fillColor = GEWERK_COLORS.Klempner;
          scale = 1.5;
          anchor = new google.maps.Point(12, 22);
          break;
        case 'Elektro': // Electrical - Yellow lightning bolt
          path = ELEKTRO_PATH;
          fillColor = GEWERK_COLORS.Elektro;
          scale = 1.8;
          anchor = new google.maps.Point(10, 20);
          break;
        case 'Heizung': // Heating - Red flame
          path = HEIZUNG_PATH;
          fillColor = GEWERK_COLORS.Heizung;
          scale = 1.5;
          anchor = new google.maps.Point(12, 20);
          break;
        default:
          // Use built-in circle symbol for unknown trade types
          path = google.maps.SymbolPath.CIRCLE;
          fillColor = '#EF4444';
          scale = 10;
          anchor = undefined;
      }

      return {
        path,
        fillColor,
        fillOpacity: 1,
        strokeWeight: 2,
        strokeColor: '#FFFFFF',
        scale,
        anchor,
      };
    };
  }, [isLoaded]);

  // Technician (Monteur) marker icon - House icon to represent their base/location
  const monteurMarkerIcon = useMemo(() => {
    if (!isLoaded || typeof google === 'undefined') return undefined;
    
    return {
      path: HOUSE_PATH,
      fillColor: '#8B5CF6',      // Purple
      fillOpacity: 1,
      strokeWeight: 2,
      strokeColor: '#FFFFFF',
      scale: 1.5,
      anchor: new google.maps.Point(12, 20),
    };
  }, [isLoaded]);

  if (loadError) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-100 rounded-lg">
        <div className="text-center text-gray-600">
          <svg className="w-12 h-12 mx-auto mb-2 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p>Fehler beim Laden der Karte</p>
          <p className="text-sm">Bitte prüfen Sie den API-Schlüssel</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-100 rounded-lg">
        <div className="text-center text-gray-600">
          <svg className="animate-spin h-8 w-8 mx-auto mb-2" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p>Karte wird geladen...</p>
        </div>
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={defaultCenter}
      zoom={6}
      options={{
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
      }}
      onLoad={onLoad}
    >
      {/* Order Markers */}
      {orders.map((order) => {
        if (!order.latitude || !order.longitude) return null;
        
        return (
          <Marker
            key={`order-${order.id}`}
            position={{ lat: order.latitude, lng: order.longitude }}
            icon={getOrderMarkerIcon(order.gewerk)}
            onClick={() => {
              setSelectedOrder(order);
              setSelectedMonteur(null);
              onOrderClick?.(order);
            }}
            title={`${order.auftragsnummer} - ${order.gewerk}`}
          />
        );
      })}

      {/* Monteur Markers */}
      {monteure.map((monteur) => {
        if (!monteur.gps_latitude || !monteur.gps_longitude) return null;
        
        return (
          <Marker
            key={`monteur-${monteur.id}`}
            position={{ lat: monteur.gps_latitude, lng: monteur.gps_longitude }}
            icon={monteurMarkerIcon}
            onClick={() => {
              setSelectedMonteur(monteur);
              setSelectedOrder(null);
              onMonteurClick?.(monteur);
            }}
            title={`${monteur.vorname} ${monteur.name}`}
          />
        );
      })}

      {/* Order Info Window */}
      {selectedOrder && selectedOrder.latitude && selectedOrder.longitude && (
        <InfoWindow
          position={{ lat: selectedOrder.latitude, lng: selectedOrder.longitude }}
          onCloseClick={() => setSelectedOrder(null)}
        >
          <div className="p-2 min-w-[200px]">
            <p className="font-mono text-sm text-gray-600 mb-1">
              {selectedOrder.auftragsnummer}
            </p>
            <h4 className="font-semibold text-gray-800">
              {selectedOrder.vorname} {selectedOrder.name}
            </h4>
            <p className="text-sm text-gray-600">
              {selectedOrder.strasse} {selectedOrder.hausnummer}
            </p>
            <p className="text-sm text-gray-600">
              {selectedOrder.plz} {selectedOrder.stadt}
            </p>
            <div className="mt-2 pt-2 border-t flex items-center gap-2">
              <span 
                className="text-xs font-medium px-2 py-1 rounded text-white"
                style={{ backgroundColor: GEWERK_COLORS[selectedOrder.gewerk] || '#6B7280' }}
              >
                {selectedOrder.gewerk}
              </span>
              <span className="text-xs font-medium px-2 py-1 rounded bg-gray-100">
                {selectedOrder.status}
              </span>
            </div>
          </div>
        </InfoWindow>
      )}

      {/* Monteur Info Window */}
      {selectedMonteur && selectedMonteur.gps_latitude && selectedMonteur.gps_longitude && (
        <InfoWindow
          position={{ lat: selectedMonteur.gps_latitude, lng: selectedMonteur.gps_longitude }}
          onCloseClick={() => setSelectedMonteur(null)}
        >
          <div className="p-2 min-w-[200px]">
            <h4 className="font-semibold text-gray-800">
              {selectedMonteur.vorname} {selectedMonteur.name}
            </h4>
            <p className="text-sm text-gray-600">{selectedMonteur.region}</p>
            <p className="text-sm text-gray-600">{selectedMonteur.telefonnummer}</p>
            {selectedMonteur.telegram_chat_id && (
              <p className="text-xs text-green-600 mt-1">✓ Telegram verbunden</p>
            )}
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  );
}

export default memo(DispositionMap);
