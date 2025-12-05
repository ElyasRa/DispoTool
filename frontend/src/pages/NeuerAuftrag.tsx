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
  ClipboardList,
  MessageSquare,
  Clock,
  Info,
  Mail
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
  minHeight: '200px',
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

// Priority colors - more subtle styling
const PRIORITY_COLORS = {
  normal: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  hoch: 'bg-amber-50 text-amber-700 border-amber-200',
  dringend: 'bg-rose-50 text-rose-700 border-rose-200',
};

// Compact input styles
const inputBaseClass = "w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all";
const selectBaseClass = "w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all";
const labelClass = "block text-xs font-medium text-gray-600 mb-1";

// Order number preview component
interface OrderNumberPreviewProps {
  onGenerate: () => void;
}

const OrderNumberPreview = memo(function OrderNumberPreview({ onGenerate }: OrderNumberPreviewProps) {
  const today = new Date();
  const datePrefix = today.toISOString().slice(0, 10).replace(/-/g, '');
  
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs font-mono text-gray-500 bg-gray-50 px-2 py-0.5 rounded">{datePrefix}-XXXXX</span>
      <button
        type="button"
        onClick={onGenerate}
        className="p-0.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
        title="Nummer generieren (wird bei Speichern automatisch erstellt)"
      >
        <RefreshCw size={12} />
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
      scale: 8,
    };
  }, [isLoaded]);

  if (!apiKey) {
    return (
      <div className="h-full min-h-[200px] flex items-center justify-center bg-gray-50 rounded-md border border-gray-200">
        <div className="text-center text-gray-500 p-3">
          <MapPin className="w-8 h-8 mx-auto mb-1.5 text-gray-300" />
          <p className="text-xs font-medium">Karte nicht verfügbar</p>
          <p className="text-xs text-gray-400">API-Key nicht konfiguriert</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="h-full min-h-[200px] flex items-center justify-center bg-gray-50 rounded-md border border-gray-200">
        <div className="text-center text-gray-500 p-3">
          <AlertTriangle className="w-8 h-8 mx-auto mb-1.5 text-red-400" />
          <p className="text-xs font-medium">Fehler beim Laden</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="h-full min-h-[200px] flex items-center justify-center bg-gray-50 rounded-md border border-gray-200">
        <div className="text-center text-gray-500">
          <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-1.5" />
          <p className="text-xs">Lädt...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full min-h-[200px] rounded-md overflow-hidden border border-gray-200">
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
    <div className="p-4 max-w-7xl mx-auto">
      {/* Compact Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-100 rounded-lg">
            <ClipboardList className="text-blue-600" size={20} />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-800">Neuer Auftrag</h1>
            <p className="text-xs text-gray-500">Neuen Auftrag erfassen</p>
          </div>
        </div>
        <OrderNumberPreview onGenerate={handleGenerateNumber} />
      </div>

      {/* Order number info (conditionally shown) */}
      {showOrderNumberInfo && (
        <div className="mb-3 p-2 bg-blue-50 border border-blue-100 rounded-md flex items-start gap-2">
          <Info className="text-blue-500 mt-0.5 flex-shrink-0" size={14} />
          <div className="text-xs text-blue-700">
            <span className="font-medium">Format: YYYYMMDD-XXXXX</span> — Wird automatisch beim Speichern vergeben
          </div>
        </div>
      )}

      {/* Success Message - Compact */}
      {success && (
        <div className="mb-3 bg-emerald-50 border border-emerald-200 rounded-md p-2.5 flex items-center gap-2">
          <Save className="text-emerald-600" size={16} />
          <div className="text-sm">
            <span className="font-medium text-emerald-800">Auftrag erstellt!</span>
            <span className="text-emerald-600 ml-1">Weiterleitung...</span>
          </div>
        </div>
      )}

      {/* Error Message - Compact */}
      {error && (
        <div className="mb-3 bg-rose-50 border border-rose-200 rounded-md p-2.5 flex items-center gap-2">
          <AlertTriangle className="text-rose-500" size={16} />
          <span className="text-sm text-rose-700">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Main Form - Left/Center */}
          <div className="lg:col-span-8 space-y-3">
            {/* Row 1: Customer Information & Service Address */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Customer Information Card */}
              <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-4">
                <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5 pb-2 border-b border-gray-100">
                  <User className="text-blue-500" size={15} />
                  Kundeninformationen
                </h2>
                
                {/* Customer Type - Inline */}
                <div className="flex gap-3 mb-3">
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                    <input
                      type="radio"
                      name="auftraggeber_typ"
                      value="Privat"
                      checked={formData.auftraggeber_typ === 'Privat'}
                      onChange={handleInputChange}
                      className="w-3.5 h-3.5 text-blue-600"
                    />
                    <User size={12} className="text-gray-400" />
                    <span className="text-gray-600">Privat</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                    <input
                      type="radio"
                      name="auftraggeber_typ"
                      value="Firma"
                      checked={formData.auftraggeber_typ === 'Firma'}
                      onChange={handleInputChange}
                      className="w-3.5 h-3.5 text-blue-600"
                    />
                    <Building2 size={12} className="text-gray-400" />
                    <span className="text-gray-600">Firma</span>
                  </label>
                </div>

                <div className="space-y-2.5">
                  {/* Name Row */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label htmlFor="vorname" className={labelClass}>Vorname *</label>
                      <input
                        type="text"
                        id="vorname"
                        name="vorname"
                        value={formData.vorname}
                        onChange={handleInputChange}
                        className={inputBaseClass}
                        placeholder="Max"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="name" className={labelClass}>Nachname *</label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className={inputBaseClass}
                        placeholder="Mustermann"
                        required
                      />
                    </div>
                  </div>

                  {/* Contact Row */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label htmlFor="telefon" className={labelClass}>
                        <span className="flex items-center gap-1">
                          <Phone size={10} className="text-gray-400" />
                          Telefon *
                        </span>
                      </label>
                      <input
                        type="tel"
                        id="telefon"
                        name="telefon"
                        value={formData.telefon}
                        onChange={handleInputChange}
                        className={inputBaseClass}
                        placeholder="+49 30 123456789"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="email" className={labelClass}>
                        <span className="flex items-center gap-1">
                          <Mail size={10} className="text-gray-400" />
                          E-Mail
                        </span>
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className={inputBaseClass}
                        placeholder="kunde@beispiel.de"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Service Address Card */}
              <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-4">
                <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5 pb-2 border-b border-gray-100">
                  <MapPin className="text-rose-500" size={15} />
                  Einsatzadresse
                </h2>
                
                <div className="space-y-2.5">
                  {/* Street Row */}
                  <div className="grid grid-cols-4 gap-2">
                    <div className="col-span-3">
                      <label htmlFor="strasse" className={labelClass}>Straße *</label>
                      <input
                        type="text"
                        id="strasse"
                        name="strasse"
                        value={formData.strasse}
                        onChange={handleInputChange}
                        className={inputBaseClass}
                        placeholder="Musterstraße"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="hausnummer" className={labelClass}>Nr. *</label>
                      <input
                        type="text"
                        id="hausnummer"
                        name="hausnummer"
                        value={formData.hausnummer}
                        onChange={handleInputChange}
                        className={inputBaseClass}
                        placeholder="12a"
                        required
                      />
                    </div>
                  </div>

                  {/* City Row */}
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <label htmlFor="plz" className={labelClass}>PLZ *</label>
                      <input
                        type="text"
                        id="plz"
                        name="plz"
                        value={formData.plz}
                        onChange={handlePlzChange}
                        className={inputBaseClass}
                        placeholder="10115"
                        maxLength={5}
                        pattern="[0-9]{5}"
                        inputMode="numeric"
                        required
                      />
                    </div>
                    <div className="col-span-3">
                      <label htmlFor="stadt" className={labelClass}>Stadt *</label>
                      <input
                        type="text"
                        id="stadt"
                        name="stadt"
                        value={formData.stadt}
                        onChange={handleInputChange}
                        className={inputBaseClass}
                        placeholder="Berlin"
                        required
                      />
                    </div>
                  </div>

                  {/* Region */}
                  <div>
                    <label htmlFor="region" className={labelClass}>Region</label>
                    <select
                      id="region"
                      name="region"
                      value={formData.region}
                      onChange={handleInputChange}
                      className={selectBaseClass}
                    >
                      {REGIONS.map(region => (
                        <option key={region} value={region}>{region}</option>
                      ))}
                    </select>
                  </div>

                  {/* Coordinates display */}
                  {formData.latitude && formData.longitude && (
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                      <MapPin size={10} />
                      {formData.latitude.toFixed(4)}, {formData.longitude.toFixed(4)}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Row 2: Order Details & Appointment */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Order Details Card */}
              <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-4">
                <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5 pb-2 border-b border-gray-100">
                  <FileText className="text-amber-500" size={15} />
                  Auftragsdetails
                </h2>
                
                <div className="space-y-2.5">
                  {/* Trade & Priority Row */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label htmlFor="gewerk" className={labelClass}>Gewerk *</label>
                      <select
                        id="gewerk"
                        name="gewerk"
                        value={formData.gewerk}
                        onChange={handleInputChange}
                        className={selectBaseClass}
                        required
                      >
                        <option value="Elektro">⚡ Elektro</option>
                        <option value="Klempner">💧 Klempner</option>
                        <option value="Heizung">🔥 Heizung</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="prioritaet" className={labelClass}>Priorität</label>
                      <select
                        id="prioritaet"
                        name="prioritaet"
                        value={formData.prioritaet}
                        onChange={handleInputChange}
                        className={`${selectBaseClass} ${PRIORITY_COLORS[formData.prioritaet]}`}
                      >
                        <option value="normal">Normal</option>
                        <option value="hoch">Hoch</option>
                        <option value="dringend">Dringend</option>
                      </select>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label htmlFor="beschreibung" className={labelClass}>Beschreibung</label>
                    <textarea
                      id="beschreibung"
                      name="beschreibung"
                      value={formData.beschreibung}
                      onChange={handleInputChange}
                      rows={3}
                      className={`${inputBaseClass} resize-none`}
                      placeholder="Schaden oder gewünschte Leistung..."
                    />
                  </div>
                </div>
              </div>

              {/* Appointment & Status Card */}
              <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-4">
                <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5 pb-2 border-b border-gray-100">
                  <Calendar className="text-violet-500" size={15} />
                  Termin & Status
                </h2>
                
                <div className="space-y-2.5">
                  {/* Date & Time Row */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label htmlFor="wunschtermin" className={labelClass}>
                        <span className="flex items-center gap-1">
                          <Calendar size={10} className="text-gray-400" />
                          Wunschtermin
                        </span>
                      </label>
                      <input
                        type="date"
                        id="wunschtermin"
                        name="wunschtermin"
                        value={formData.wunschtermin}
                        onChange={handleInputChange}
                        className={inputBaseClass}
                      />
                    </div>
                    <div>
                      <label htmlFor="wunschzeit" className={labelClass}>
                        <span className="flex items-center gap-1">
                          <Clock size={10} className="text-gray-400" />
                          Wunschzeit
                        </span>
                      </label>
                      <input
                        type="time"
                        id="wunschzeit"
                        name="wunschzeit"
                        value={formData.wunschzeit}
                        onChange={handleInputChange}
                        className={inputBaseClass}
                      />
                    </div>
                  </div>

                  {/* Status */}
                  <div>
                    <label htmlFor="status" className={labelClass}>Status</label>
                    <select
                      id="status"
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className={selectBaseClass}
                    >
                      <option value="Neu">Neu</option>
                      <option value="Zugewiesen">Zugewiesen</option>
                      <option value="Angenommen">Angenommen</option>
                      <option value="Erledigt">Erledigt</option>
                      <option value="Storno">Storno</option>
                      <option value="Abgelehnt">Abgelehnt</option>
                    </select>
                  </div>

                  {/* Internal Notes */}
                  <div>
                    <label htmlFor="interne_notizen" className={labelClass}>
                      <span className="flex items-center gap-1">
                        <MessageSquare size={10} className="text-gray-400" />
                        Interne Notizen
                      </span>
                    </label>
                    <textarea
                      id="interne_notizen"
                      name="interne_notizen"
                      value={formData.interne_notizen}
                      onChange={handleInputChange}
                      rows={2}
                      className={`${inputBaseClass} resize-none`}
                      placeholder="Interne Notizen..."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons - Compact */}
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={handleReset}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                disabled={loading}
              >
                <X size={14} />
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={loading || success}
                className="flex items-center gap-1.5 px-4 py-1.5 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {loading ? (
                  <>
                    <div className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />
                    <span>Erstellen...</span>
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    <span>Auftrag erstellen</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column - Map (Compact) */}
          <div className="lg:col-span-4">
            <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-3 sticky top-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                <MapPin className="text-blue-500" size={14} />
                Standort
              </h2>
              <p className="text-xs text-gray-400 mb-2">
                Klicken Sie auf die Karte
              </p>
              <div className="h-[280px]">
                <LocationMap
                  latitude={formData.latitude}
                  longitude={formData.longitude}
                  onLocationSelect={handleLocationSelect}
                />
              </div>
              {formData.latitude && formData.longitude && (
                <div className="mt-2 p-2 bg-blue-50 rounded-md">
                  <p className="text-xs font-medium text-blue-700">Standort ausgewählt</p>
                  <p className="text-xs text-blue-500 font-mono">
                    {formData.latitude.toFixed(5)}, {formData.longitude.toFixed(5)}
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
