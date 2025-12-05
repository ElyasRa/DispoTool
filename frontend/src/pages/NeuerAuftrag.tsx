import { useState, FormEvent, useCallback, useMemo, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  Phone, 
  MapPin, 
  FileText, 
  Calendar, 
  AlertTriangle, 
  RefreshCw,
  Save,
  X,
  Building2,
  Hash,
  ClipboardList,
  MessageSquare,
  Clock,
  Info
} from 'lucide-react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import { orderApi } from '../services/api';
import { Gewerk, AuftraggeberTyp, AuftragStatus } from '../types/models';

// Types for form state
interface OrderFormData {
  // Customer Information
  auftraggeber_typ: AuftraggeberTyp;
  vorname: string;
  name: string;
  telefon: string;
  email: string;
  
  // Service Address
  strasse: string;
  hausnummer: string;
  plz: string;
  stadt: string;
  region: string;
  latitude: number | null;
  longitude: number | null;
  
  // Order Details
  gewerk: Gewerk;
  beschreibung: string;
  
  // Appointment & Status
  wunschtermin: string;
  wunschzeit: string;
  prioritaet: 'normal' | 'hoch' | 'dringend';
  status: AuftragStatus;
  
  // Internal Notes
  interne_notizen: string;
}

// Initial form state
const initialFormData: OrderFormData = {
  auftraggeber_typ: 'Privat',
  vorname: '',
  name: '',
  telefon: '',
  email: '',
  strasse: '',
  hausnummer: '',
  plz: '',
  stadt: '',
  region: 'Berlin',
  latitude: null,
  longitude: null,
  gewerk: 'Elektro',
  beschreibung: '',
  wunschtermin: '',
  wunschzeit: '',
  prioritaet: 'normal',
  status: 'Neu',
  interne_notizen: '',
};

// Map configuration
const mapContainerStyle = {
  width: '100%',
  height: '100%',
  minHeight: '300px',
};

// Default center: Berlin
const defaultCenter = {
  lat: 52.52,
  lng: 13.405,
};

// Regions available for selection
const REGIONS = [
  'Berlin',
  'Brandenburg',
  'Hamburg',
  'München',
  'Frankfurt',
  'Köln',
  'Düsseldorf',
  'Stuttgart',
  'Leipzig',
  'Dresden',
];

// Priority colors
const PRIORITY_COLORS = {
  normal: 'bg-green-100 text-green-800 border-green-300',
  hoch: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  dringend: 'bg-red-100 text-red-800 border-red-300',
};

// Order number preview component
interface OrderNumberPreviewProps {
  onGenerate: () => void;
}

const OrderNumberPreview = memo(function OrderNumberPreview({ onGenerate }: OrderNumberPreviewProps) {
  const today = new Date();
  const datePrefix = today.toISOString().slice(0, 10).replace(/-/g, '');
  
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-mono text-gray-600">{datePrefix}-XXXXX</span>
      <button
        type="button"
        onClick={onGenerate}
        className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
        title="Nummer generieren (wird bei Speichern automatisch erstellt)"
      >
        <RefreshCw size={14} />
      </button>
    </div>
  );
});

// Location selection map component
interface LocationMapProps {
  latitude: number | null;
  longitude: number | null;
  onLocationSelect: (lat: number, lng: number) => void;
}

function LocationMap({ latitude, longitude, onLocationSelect }: LocationMapProps) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    id: 'google-map-script-new-order',
  });

  const center = useMemo(() => {
    if (latitude && longitude) {
      return { lat: latitude, lng: longitude };
    }
    return defaultCenter;
  }, [latitude, longitude]);

  const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      onLocationSelect(e.latLng.lat(), e.latLng.lng());
    }
  }, [onLocationSelect]);

  const markerIcon = useMemo(() => {
    if (!isLoaded || typeof google === 'undefined') return undefined;
    return {
      path: google.maps.SymbolPath.CIRCLE,
      fillColor: '#3B82F6',
      fillOpacity: 1,
      strokeWeight: 2,
      strokeColor: '#FFFFFF',
      scale: 10,
    };
  }, [isLoaded]);

  if (!apiKey) {
    return (
      <div className="h-full min-h-[300px] flex items-center justify-center bg-gray-100 rounded-lg border border-gray-200">
        <div className="text-center text-gray-600 p-4">
          <MapPin className="w-12 h-12 mx-auto mb-2 text-gray-400" />
          <p className="font-medium mb-1">Karte nicht verfügbar</p>
          <p className="text-sm">Google Maps API-Key nicht konfiguriert</p>
          <p className="text-xs text-gray-400 mt-2">
            Koordinaten können manuell eingegeben werden
          </p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="h-full min-h-[300px] flex items-center justify-center bg-gray-100 rounded-lg border border-gray-200">
        <div className="text-center text-gray-600 p-4">
          <AlertTriangle className="w-12 h-12 mx-auto mb-2 text-red-500" />
          <p className="font-medium">Fehler beim Laden der Karte</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="h-full min-h-[300px] flex items-center justify-center bg-gray-100 rounded-lg border border-gray-200">
        <div className="text-center text-gray-600">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2" />
          <p>Karte wird geladen...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full min-h-[300px] rounded-lg overflow-hidden border border-gray-200">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={latitude && longitude ? 15 : 10}
        onClick={handleMapClick}
        options={{
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        }}
      >
        {latitude && longitude && (
          <Marker
            position={{ lat: latitude, lng: longitude }}
            icon={markerIcon}
            title="Einsatzort"
          />
        )}
      </GoogleMap>
    </div>
  );
}

function NeuerAuftrag() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<OrderFormData>(initialFormData);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);
  const [showOrderNumberInfo, setShowOrderNumberInfo] = useState<boolean>(false);

  // Handle input change
  const handleInputChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  }, []);

  // Handle PLZ input - only allow digits
  const handlePlzChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value.replace(/\D/g, ''); // Remove non-digits
    setFormData(prev => ({ ...prev, plz: value }));
    setError('');
  }, []);

  // Handle location selection from map
  const handleLocationSelect = useCallback((lat: number, lng: number) => {
    setFormData(prev => ({
      ...prev,
      latitude: lat,
      longitude: lng,
    }));
  }, []);

  // Toggle order number info display
  const handleGenerateNumber = useCallback(() => {
    // The actual number is generated on the backend
    // This toggles the info message visibility
    setShowOrderNumberInfo(prev => !prev);
  }, []);

  // Reset form
  const handleReset = useCallback(() => {
    setFormData(initialFormData);
    setError('');
    setSuccess(false);
    setShowOrderNumberInfo(false);
  }, []);

  // Submit form
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validate required fields
    if (!formData.name.trim()) {
      setError('Bitte geben Sie den Nachnamen des Kunden ein.');
      setLoading(false);
      return;
    }
    if (!formData.vorname.trim()) {
      setError('Bitte geben Sie den Vornamen des Kunden ein.');
      setLoading(false);
      return;
    }
    if (!formData.telefon.trim()) {
      setError('Bitte geben Sie eine Telefonnummer ein.');
      setLoading(false);
      return;
    }
    if (!formData.strasse.trim()) {
      setError('Bitte geben Sie die Straße ein.');
      setLoading(false);
      return;
    }
    if (!formData.hausnummer.trim()) {
      setError('Bitte geben Sie die Hausnummer ein.');
      setLoading(false);
      return;
    }
    if (!formData.plz.trim()) {
      setError('Bitte geben Sie die Postleitzahl ein.');
      setLoading(false);
      return;
    }
    if (!formData.stadt.trim()) {
      setError('Bitte geben Sie die Stadt ein.');
      setLoading(false);
      return;
    }

    try {
      await orderApi.create({
        auftraggeber_typ: formData.auftraggeber_typ,
        vorname: formData.vorname.trim(),
        name: formData.name.trim(),
        telefon: formData.telefon.trim(),
        strasse: formData.strasse.trim(),
        hausnummer: formData.hausnummer.trim(),
        plz: formData.plz.trim(),
        stadt: formData.stadt.trim(),
        region: formData.region,
        gewerk: formData.gewerk,
        latitude: formData.latitude,
        longitude: formData.longitude,
      });

      setSuccess(true);
      // Reset form after short delay to show success
      setTimeout(() => {
        handleReset();
        navigate('/auftragsverwaltung');
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Erstellen des Auftrags');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
          <ClipboardList className="text-blue-600" size={28} />
          Neuer Auftrag
        </h1>
        <p className="text-gray-500 mt-1">
          Erfassen Sie hier einen neuen Auftrag mit allen relevanten Informationen.
        </p>
      </div>

      {/* Success Message */}
      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <div className="bg-green-100 rounded-full p-2">
            <Save className="text-green-600" size={20} />
          </div>
          <div>
            <p className="font-medium text-green-800">Auftrag erfolgreich erstellt!</p>
            <p className="text-sm text-green-600">Sie werden zur Auftragsverwaltung weitergeleitet...</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <div className="bg-red-100 rounded-full p-2">
            <AlertTriangle className="text-red-600" size={20} />
          </div>
          <div>
            <p className="font-medium text-red-800">Fehler</p>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Form Fields */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Number Preview */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <Hash className="text-gray-500" size={20} />
                  Auftragsnummer
                </h2>
                <OrderNumberPreview onGenerate={handleGenerateNumber} />
              </div>
              <p className="text-sm text-gray-500">
                Die Auftragsnummer wird automatisch beim Speichern generiert.
              </p>
              {showOrderNumberInfo && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
                  <Info className="text-blue-500 mt-0.5 flex-shrink-0" size={16} />
                  <div className="text-sm text-blue-700">
                    <p className="font-medium">Format: YYYYMMDD-XXXXX</p>
                    <p className="text-blue-600">Die Nummer wird automatisch beim Speichern vergeben und ist eindeutig.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Customer Information */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <User className="text-gray-500" size={20} />
                Kundeninformationen
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Customer Type */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Auftraggeber-Typ
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="auftraggeber_typ"
                        value="Privat"
                        checked={formData.auftraggeber_typ === 'Privat'}
                        onChange={handleInputChange}
                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <User size={16} className="text-gray-500" />
                      <span className="text-sm text-gray-700">Privat</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="auftraggeber_typ"
                        value="Firma"
                        checked={formData.auftraggeber_typ === 'Firma'}
                        onChange={handleInputChange}
                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <Building2 size={16} className="text-gray-500" />
                      <span className="text-sm text-gray-700">Firma</span>
                    </label>
                  </div>
                </div>

                {/* First Name */}
                <div>
                  <label htmlFor="vorname" className="block text-sm font-medium text-gray-700 mb-1">
                    Vorname *
                  </label>
                  <input
                    type="text"
                    id="vorname"
                    name="vorname"
                    value={formData.vorname}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Max"
                    required
                  />
                </div>

                {/* Last Name */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Nachname *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Mustermann"
                    required
                  />
                </div>

                {/* Phone */}
                <div>
                  <label htmlFor="telefon" className="block text-sm font-medium text-gray-700 mb-1">
                    <span className="flex items-center gap-1">
                      <Phone size={14} />
                      Telefon *
                    </span>
                  </label>
                  <input
                    type="tel"
                    id="telefon"
                    name="telefon"
                    value={formData.telefon}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="+49 30 123456789"
                    required
                  />
                </div>

                {/* Email (optional) */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    E-Mail (optional)
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="kunde@beispiel.de"
                  />
                </div>
              </div>
            </div>

            {/* Service Address */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <MapPin className="text-gray-500" size={20} />
                Einsatzadresse
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Street */}
                <div className="md:col-span-2">
                  <label htmlFor="strasse" className="block text-sm font-medium text-gray-700 mb-1">
                    Straße *
                  </label>
                  <input
                    type="text"
                    id="strasse"
                    name="strasse"
                    value={formData.strasse}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Musterstraße"
                    required
                  />
                </div>

                {/* House Number */}
                <div>
                  <label htmlFor="hausnummer" className="block text-sm font-medium text-gray-700 mb-1">
                    Hausnr. *
                  </label>
                  <input
                    type="text"
                    id="hausnummer"
                    name="hausnummer"
                    value={formData.hausnummer}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="12a"
                    required
                  />
                </div>

                {/* Postal Code */}
                <div>
                  <label htmlFor="plz" className="block text-sm font-medium text-gray-700 mb-1">
                    PLZ *
                  </label>
                  <input
                    type="text"
                    id="plz"
                    name="plz"
                    value={formData.plz}
                    onChange={handlePlzChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="10115"
                    maxLength={5}
                    pattern="[0-9]{5}"
                    inputMode="numeric"
                    required
                  />
                </div>

                {/* City */}
                <div className="md:col-span-2">
                  <label htmlFor="stadt" className="block text-sm font-medium text-gray-700 mb-1">
                    Stadt *
                  </label>
                  <input
                    type="text"
                    id="stadt"
                    name="stadt"
                    value={formData.stadt}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Berlin"
                    required
                  />
                </div>

                {/* Region */}
                <div className="md:col-span-2">
                  <label htmlFor="region" className="block text-sm font-medium text-gray-700 mb-1">
                    Region
                  </label>
                  <select
                    id="region"
                    name="region"
                    value={formData.region}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  >
                    {REGIONS.map(region => (
                      <option key={region} value={region}>{region}</option>
                    ))}
                  </select>
                </div>

                {/* Coordinates (optional, read-only display) */}
                {formData.latitude && formData.longitude && (
                  <div className="md:col-span-4">
                    <p className="text-sm text-gray-500">
                      <span className="font-medium">Koordinaten:</span>{' '}
                      {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Order Details */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <FileText className="text-gray-500" size={20} />
                Auftragsdetails
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Gewerk (Trade Type) */}
                <div>
                  <label htmlFor="gewerk" className="block text-sm font-medium text-gray-700 mb-1">
                    Gewerk *
                  </label>
                  <select
                    id="gewerk"
                    name="gewerk"
                    value={formData.gewerk}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    required
                  >
                    <option value="Elektro">⚡ Elektro</option>
                    <option value="Klempner">💧 Klempner / Sanitär</option>
                    <option value="Heizung">🔥 Heizung</option>
                  </select>
                </div>

                {/* Priority */}
                <div>
                  <label htmlFor="prioritaet" className="block text-sm font-medium text-gray-700 mb-1">
                    Priorität
                  </label>
                  <select
                    id="prioritaet"
                    name="prioritaet"
                    value={formData.prioritaet}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${PRIORITY_COLORS[formData.prioritaet]}`}
                  >
                    <option value="normal">Normal</option>
                    <option value="hoch">Hoch</option>
                    <option value="dringend">Dringend</option>
                  </select>
                </div>

                {/* Description */}
                <div className="md:col-span-2">
                  <label htmlFor="beschreibung" className="block text-sm font-medium text-gray-700 mb-1">
                    Beschreibung / Schadensmeldung
                  </label>
                  <textarea
                    id="beschreibung"
                    name="beschreibung"
                    value={formData.beschreibung}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    placeholder="Beschreiben Sie den Schaden oder die gewünschte Leistung..."
                  />
                </div>
              </div>
            </div>

            {/* Appointment & Status */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Calendar className="text-gray-500" size={20} />
                Termin & Status
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Desired Date */}
                <div>
                  <label htmlFor="wunschtermin" className="block text-sm font-medium text-gray-700 mb-1">
                    <span className="flex items-center gap-1">
                      <Calendar size={14} />
                      Wunschtermin
                    </span>
                  </label>
                  <input
                    type="date"
                    id="wunschtermin"
                    name="wunschtermin"
                    value={formData.wunschtermin}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Desired Time */}
                <div>
                  <label htmlFor="wunschzeit" className="block text-sm font-medium text-gray-700 mb-1">
                    <span className="flex items-center gap-1">
                      <Clock size={14} />
                      Wunschzeit
                    </span>
                  </label>
                  <input
                    type="time"
                    id="wunschzeit"
                    name="wunschzeit"
                    value={formData.wunschzeit}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Status */}
                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  >
                    <option value="Neu">Neu</option>
                    <option value="Zugewiesen">Zugewiesen</option>
                    <option value="Angenommen">Angenommen</option>
                    <option value="Erledigt">Erledigt</option>
                    <option value="Storno">Storno</option>
                    <option value="Abgelehnt">Abgelehnt</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Internal Notes */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <MessageSquare className="text-gray-500" size={20} />
                Interne Notizen
              </h2>
              
              <textarea
                id="interne_notizen"
                name="interne_notizen"
                value={formData.interne_notizen}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Interne Notizen, die nicht für den Kunden sichtbar sind..."
              />
              <p className="text-xs text-gray-400 mt-2">
                Diese Notizen sind nur für interne Zwecke und werden nicht an den Kunden übermittelt.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-4">
              <button
                type="button"
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                disabled={loading}
              >
                <X size={18} />
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={loading || success}
                className="flex items-center gap-2 px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    Wird erstellt...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Auftrag erstellen
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column - Map */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <MapPin className="text-gray-500" size={20} />
                Einsatzort auf Karte
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                Klicken Sie auf die Karte, um den Einsatzort zu markieren.
              </p>
              <div className="h-[400px]">
                <LocationMap
                  latitude={formData.latitude}
                  longitude={formData.longitude}
                  onLocationSelect={handleLocationSelect}
                />
              </div>
              {formData.latitude && formData.longitude && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-blue-800">Standort ausgewählt</p>
                  <p className="text-xs text-blue-600 font-mono mt-1">
                    Lat: {formData.latitude.toFixed(6)}, Lng: {formData.longitude.toFixed(6)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

export default NeuerAuftrag;
