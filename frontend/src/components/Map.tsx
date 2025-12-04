import { useCallback, useState, memo, useMemo, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { mapApi, MapDriver, MapOrder } from '../services/api';

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

// Default center: Berlin
const defaultCenter = {
  lat: 52.52,
  lng: 13.40,
};

function Map() {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  const [drivers, setDrivers] = useState<MapDriver[]>([]);
  const [orders, setOrders] = useState<MapOrder[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<MapDriver | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<MapOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    id: 'main-map-script',
  });

  // Fetch map data from backend
  useEffect(() => {
    const fetchMapData = async () => {
      try {
        setLoading(true);
        const data = await mapApi.getData();
        setDrivers(data.drivers);
        setOrders(data.orders);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchMapData();
  }, []);

  // Show message if no API key is configured
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

    drivers.forEach((driver) => {
      bounds.extend(driver.location);
      hasMarkers = true;
    });

    orders.forEach((order) => {
      bounds.extend(order.location);
      hasMarkers = true;
    });

    if (hasMarkers) {
      map.fitBounds(bounds);
    }
  }, [drivers, orders]);

  // Blue marker icon for drivers
  const driverMarkerIcon = useMemo(() => {
    if (!isLoaded || typeof google === 'undefined') return undefined;
    
    return {
      path: google.maps.SymbolPath.CIRCLE,
      fillColor: '#3B82F6', // Blue
      fillOpacity: 1,
      strokeWeight: 2,
      strokeColor: '#FFFFFF',
      scale: 12,
    };
  }, [isLoaded]);

  // Red marker icon for orders
  const orderMarkerIcon = useMemo(() => {
    if (!isLoaded || typeof google === 'undefined') return undefined;
    
    return {
      path: google.maps.SymbolPath.CIRCLE,
      fillColor: '#EF4444', // Red
      fillOpacity: 1,
      strokeWeight: 2,
      strokeColor: '#FFFFFF',
      scale: 10,
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

  if (!isLoaded || loading) {
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

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-100 rounded-lg">
        <div className="text-center text-gray-600">
          <svg className="w-12 h-12 mx-auto mb-2 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p>Fehler beim Laden der Daten</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full relative">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={defaultCenter}
        zoom={11}
        options={{
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        }}
        onLoad={onLoad}
      >
        {/* Driver Markers (Blue) */}
        {drivers.map((driver) => (
          <Marker
            key={`driver-${driver.id}`}
            position={driver.location}
            icon={driverMarkerIcon}
            onClick={() => {
              setSelectedDriver(driver);
              setSelectedOrder(null);
            }}
            title={driver.name}
          />
        ))}

        {/* Order Markers (Red) */}
        {orders.map((order) => (
          <Marker
            key={`order-${order.id}`}
            position={order.location}
            icon={orderMarkerIcon}
            onClick={() => {
              setSelectedOrder(order);
              setSelectedDriver(null);
            }}
            title={order.title}
          />
        ))}

        {/* Driver Info Window */}
        {selectedDriver && (
          <InfoWindow
            position={selectedDriver.location}
            onCloseClick={() => setSelectedDriver(null)}
          >
            <div className="p-2 min-w-[150px]">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                <span className="text-xs text-blue-600 font-medium">Fahrer</span>
              </div>
              <h4 className="font-semibold text-gray-800">{selectedDriver.name}</h4>
              <p className="text-sm text-gray-600">Firmenadresse</p>
            </div>
          </InfoWindow>
        )}

        {/* Order Info Window */}
        {selectedOrder && (
          <InfoWindow
            position={selectedOrder.location}
            onCloseClick={() => setSelectedOrder(null)}
          >
            <div className="p-2 min-w-[150px]">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-3 h-3 rounded-full bg-red-500"></span>
                <span className="text-xs text-red-600 font-medium">Offener Auftrag</span>
              </div>
              <h4 className="font-semibold text-gray-800">{selectedOrder.title}</h4>
              <p className="text-sm text-gray-600">Einsatzort</p>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-md p-3">
        <h5 className="text-sm font-semibold text-gray-700 mb-2">Legende</h5>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500"></span>
            <span className="text-xs text-gray-600">Fahrer (Firmenadresse)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500"></span>
            <span className="text-xs text-gray-600">Offene Aufträge (Einsatzort)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(Map);
