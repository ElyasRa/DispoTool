import { useCallback, useState, memo } from 'react';
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

const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: true,
};

function DispositionMap({ orders, monteure, onOrderClick, onMonteurClick }: DispositionMapProps) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
  });

  const [selectedOrder, setSelectedOrder] = useState<Auftrag | null>(null);
  const [selectedMonteur, setSelectedMonteur] = useState<Monteur | null>(null);
  const [, setMap] = useState<google.maps.Map | null>(null);

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
    
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

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  const getOrderMarkerIcon = (status: string): google.maps.Symbol => {
    const colors: Record<string, string> = {
      Neu: '#EF4444',           // Red
      Zugewiesen: '#3B82F6',    // Blue
      Angenommen: '#22C55E',    // Green
      Erledigt: '#6B7280',      // Gray
      Storno: '#F97316',        // Orange
      Abgelehnt: '#F97316',     // Orange
    };

    return {
      path: google.maps.SymbolPath.CIRCLE,
      fillColor: colors[status] || '#EF4444',
      fillOpacity: 1,
      strokeWeight: 2,
      strokeColor: '#FFFFFF',
      scale: 10,
    };
  };

  const monteurMarkerIcon: google.maps.Symbol = {
    path: google.maps.SymbolPath.CIRCLE,
    fillColor: '#8B5CF6',      // Purple
    fillOpacity: 1,
    strokeWeight: 3,
    strokeColor: '#FFFFFF',
    scale: 12,
  };

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

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={defaultCenter}
      zoom={6}
      options={mapOptions}
      onLoad={onLoad}
      onUnmount={onUnmount}
    >
      {/* Order Markers */}
      {orders.map((order) => {
        if (!order.latitude || !order.longitude) return null;
        
        return (
          <Marker
            key={`order-${order.id}`}
            position={{ lat: order.latitude, lng: order.longitude }}
            icon={getOrderMarkerIcon(order.status)}
            onClick={() => {
              setSelectedOrder(order);
              setSelectedMonteur(null);
              onOrderClick?.(order);
            }}
            title={`${order.auftragsnummer} - ${order.status}`}
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
            <div className="mt-2 pt-2 border-t">
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
