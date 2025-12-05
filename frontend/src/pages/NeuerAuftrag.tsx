import { useState, FormEvent, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  Phone, 
  MapPin, 
  FileText, 
  Calendar, 
  AlertTriangle, 
  RefreshCw,
  X,
  Building2,
  ClipboardList,
  MessageSquare,
  Info,
  Check,
  Lock
} from 'lucide-react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import { orderApi } from '../services/api';
import { Gewerk, AuftraggeberTyp, AuftragStatus } from '../types/models';

// Types for form state
interface OrderFormData {
  // Customer Information
  auftraggeber_typ: AuftraggeberTyp;
  ansprechpartner: string;
  telefon: string;
  email: string;
  
  // Service Address
  strasse_hausnummer: string;
  plz: string;
  ort: string;
  region: string;
  latitude: number | null;
  longitude: number | null;
  
  // Order Details
  schaden: Gewerk | '';
  beschreibung: string;
  
  // Appointment & Status
  termin_vereinbart: boolean;
  wartezeit_angeben: boolean;
  prioritaet: 'normal' | 'hoch' | 'dringend';
  status: AuftragStatus;
  
  // Internal Notes
  interne_notizen: string;
}

// Initial form state
const initialFormData: OrderFormData = {
  auftraggeber_typ: 'Privat',
  ansprechpartner: '',
  telefon: '',
  email: '',
  strasse_hausnummer: '',
  plz: '',
  ort: '',
  region: '',
  latitude: null,
  longitude: null,
  schaden: '',
  beschreibung: '',
  termin_vereinbart: false,
  wartezeit_angeben: false,
  prioritaet: 'normal',
  status: 'Neu',
  interne_notizen: '',
};

// Map configuration
const mapContainerStyle = {
  width: '100%',
  height: '100%',
  minHeight: '350px',
};

// Default center: Madrid (as per requirements)
const defaultCenter = {
  lat: 40.416775,
  lng: -3.703790,
};

// Regions available for selection
const REGIONS = [
  '',
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

// Damage/Schaden options (Gewerk)
const SCHADEN_OPTIONS = [
  { value: '', label: '-- Bitte wählen --' },
  { value: 'Elektro', label: 'Elektro' },
  { value: 'Klempner', label: 'Klempner' },
  { value: 'Heizung', label: 'Heizung' },
];

// Status options
const STATUS_OPTIONS = [
  { value: 'Neu', label: 'Undisponiert' },
  { value: 'Zugewiesen', label: 'Zugewiesen' },
  { value: 'Angenommen', label: 'Angenommen' },
  { value: 'Erledigt', label: 'Erledigt' },
  { value: 'Storno', label: 'Storno' },
  { value: 'Abgelehnt', label: 'Abgelehnt' },
];

// Styles
const inputBaseClass = "w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all";
const selectBaseClass = "w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all cursor-pointer";
const labelClass = "block text-sm font-medium text-gray-700 mb-1";
const sectionHeaderClass = "text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2";

// Location selection map component
interface LocationMapProps {
  latitude: number | null;
  longitude: number | null;
  onLocationSelect: (lat: number, lng: number) => void;
}

function LocationMap({ latitude, longitude, onLocationSelect }: LocationMapProps) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  const [mapType, setMapType] = useState<'roadmap' | 'satellite'>('roadmap');
  
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

  if (!apiKey) {
    return (
      <div className="h-full min-h-[350px] flex items-center justify-center bg-gray-100 rounded-lg border border-gray-200">
        <div className="text-center text-gray-500 p-4">
          <MapPin className="w-12 h-12 mx-auto mb-2 text-gray-300" />
          <p className="text-sm font-medium">Karte nicht verfügbar</p>
          <p className="text-xs text-gray-400 mt-1">API-Key nicht konfiguriert</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="h-full min-h-[350px] flex items-center justify-center bg-gray-100 rounded-lg border border-gray-200">
        <div className="text-center text-gray-500 p-4">
          <AlertTriangle className="w-12 h-12 mx-auto mb-2 text-red-400" />
          <p className="text-sm font-medium">Fehler beim Laden der Karte</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="h-full min-h-[350px] flex items-center justify-center bg-gray-100 rounded-lg border border-gray-200">
        <div className="text-center text-gray-500">
          <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2" />
          <p className="text-sm">Karte wird geladen...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full min-h-[350px] rounded-lg overflow-hidden border border-gray-200 relative">
      {/* Map Type Tabs */}
      <div className="absolute top-2 left-2 z-10 flex bg-white rounded shadow-md overflow-hidden">
        <button
          type="button"
          onClick={() => setMapType('roadmap')}
          className={`px-3 py-1.5 text-xs font-medium transition-colors ${
            mapType === 'roadmap' 
              ? 'bg-blue-600 text-white' 
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          Karte
        </button>
        <button
          type="button"
          onClick={() => setMapType('satellite')}
          className={`px-3 py-1.5 text-xs font-medium transition-colors ${
            mapType === 'satellite' 
              ? 'bg-blue-600 text-white' 
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          Satellit
        </button>
      </div>
      
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={latitude && longitude ? 15 : 6}
        onClick={handleMapClick}
        mapTypeId={mapType}
        options={{
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          fullscreenControlOptions: {
            position: typeof google !== 'undefined' ? google.maps.ControlPosition.TOP_RIGHT : 3,
          },
        }}
      >
        {latitude && longitude && (
          <Marker
            position={{ lat: latitude, lng: longitude }}
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

  // Handle input change
  const handleInputChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const newValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData(prev => ({ ...prev, [name]: newValue }));
    setError('');
  }, []);

  // Handle PLZ input - only allow digits, max 5
  const handlePlzChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 5);
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

  // Reset form
  const handleReset = useCallback(() => {
    setFormData(initialFormData);
    setError('');
    setSuccess(false);
  }, []);

  // Parse ansprechpartner into vorname and name
  const parseAnsprechpartner = (ansprechpartner: string): { vorname: string; name: string } => {
    const parts = ansprechpartner.trim().split(/\s+/);
    if (parts.length >= 2) {
      return {
        vorname: parts[0],
        name: parts.slice(1).join(' '),
      };
    }
    return {
      vorname: ansprechpartner.trim(),
      name: '',
    };
  };

  // Parse strasse_hausnummer into strasse and hausnummer
  const parseStrasseHausnummer = (strasseHausnummer: string): { strasse: string; hausnummer: string } => {
    const match = strasseHausnummer.trim().match(/^(.+?)\s+(\d+\w*)$/);
    if (match) {
      return {
        strasse: match[1],
        hausnummer: match[2],
      };
    }
    return {
      strasse: strasseHausnummer.trim(),
      hausnummer: '',
    };
  };

  // Submit form
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validate required fields
    if (!formData.ansprechpartner.trim()) {
      setError('Bitte geben Sie den Ansprechpartner ein.');
      setLoading(false);
      return;
    }
    if (!formData.telefon.trim()) {
      setError('Bitte geben Sie eine Telefonnummer ein.');
      setLoading(false);
      return;
    }
    if (!formData.strasse_hausnummer.trim()) {
      setError('Bitte geben Sie Straße & Hausnummer ein.');
      setLoading(false);
      return;
    }
    if (!formData.plz.trim() || formData.plz.length !== 5) {
      setError('Bitte geben Sie eine gültige 5-stellige PLZ ein.');
      setLoading(false);
      return;
    }
    if (!formData.ort.trim()) {
      setError('Bitte geben Sie den Ort ein.');
      setLoading(false);
      return;
    }
    if (!formData.schaden) {
      setError('Bitte wählen Sie einen Schaden/Gewerk aus.');
      setLoading(false);
      return;
    }

    try {
      const { vorname, name } = parseAnsprechpartner(formData.ansprechpartner);
      const { strasse, hausnummer } = parseStrasseHausnummer(formData.strasse_hausnummer);

      await orderApi.create({
        auftraggeber_typ: formData.auftraggeber_typ,
        vorname: vorname,
        name: name,
        telefon: formData.telefon.trim(),
        strasse: strasse,
        hausnummer: hausnummer,
        plz: formData.plz.trim(),
        stadt: formData.ort.trim(),
        region: formData.region || REGIONS[1], // Default to first real region (Berlin)
        gewerk: formData.schaden as Gewerk,
        latitude: formData.latitude,
        longitude: formData.longitude,
        status: formData.status,
      });

      setSuccess(true);
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
    <div className="min-h-screen bg-gray-50 p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Main Grid: Form (Left) + Map (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Form */}
          <div className="lg:col-span-2">
            {/* Header */}
            <div className="bg-purple-100 rounded-t-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-200 rounded-lg">
                  <ClipboardList className="text-purple-700" size={24} />
                </div>
                <h1 className="text-xl font-bold text-purple-900">Neuer Auftrag</h1>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="flex items-center gap-2 px-3 py-1.5 bg-white text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-50 transition-colors border border-purple-200"
                  onClick={() => {}}
                >
                  <RefreshCw size={14} />
                  Nummer generieren
                </button>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-100 text-yellow-800 rounded-lg text-sm border border-yellow-300">
                  <Info size={14} />
                  Keine Nummer
                </div>
              </div>
            </div>

            {/* Form Content */}
            <div className="bg-white rounded-b-xl shadow-sm border border-gray-200 border-t-0 p-6">
              {/* Success Message */}
              {success && (
                <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                  <div className="p-1 bg-green-100 rounded-full">
                    <Check className="text-green-600" size={20} />
                  </div>
                  <div>
                    <span className="font-semibold text-green-800">Auftrag erstellt!</span>
                    <span className="text-green-600 ml-2">Sie werden weitergeleitet...</span>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                  <AlertTriangle className="text-red-500" size={20} />
                  <span className="text-red-700">{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                {/* Kundeninformationen */}
                <div className="mb-6">
                  <h2 className={sectionHeaderClass}>
                    <User className="text-blue-500" size={18} />
                    Kundeninformationen
                  </h2>
                  
                  {/* Customer Type Radio Buttons */}
                  <div className="flex gap-6 mb-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="auftraggeber_typ"
                        value="Privat"
                        checked={formData.auftraggeber_typ === 'Privat'}
                        onChange={handleInputChange}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500"
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
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                      />
                      <Building2 size={16} className="text-gray-500" />
                      <span className="text-sm text-gray-700">Firma</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="ansprechpartner" className={labelClass}>
                        Ansprechpartner <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="ansprechpartner"
                        name="ansprechpartner"
                        value={formData.ansprechpartner}
                        onChange={handleInputChange}
                        className={inputBaseClass}
                        placeholder="Max Mustermann"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="telefon" className={labelClass}>
                        <span className="flex items-center gap-1">
                          <Phone size={14} className="text-gray-400" />
                          Telefon <span className="text-red-500">*</span>
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
                  </div>
                </div>

                {/* Einsatzadresse */}
                <div className="mb-6">
                  <h2 className={sectionHeaderClass}>
                    <MapPin className="text-red-500" size={18} />
                    Einsatzadresse
                  </h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="md:col-span-2">
                      <label htmlFor="strasse_hausnummer" className={labelClass}>
                        Straße & Hausnummer <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="strasse_hausnummer"
                        name="strasse_hausnummer"
                        value={formData.strasse_hausnummer}
                        onChange={handleInputChange}
                        className={inputBaseClass}
                        placeholder="Musterstraße 12a"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="plz" className={labelClass}>
                        PLZ <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="plz"
                        name="plz"
                        value={formData.plz}
                        onChange={handlePlzChange}
                        className={inputBaseClass}
                        placeholder="10115"
                        maxLength={5}
                        inputMode="numeric"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="ort" className={labelClass}>
                        Ort <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="ort"
                        name="ort"
                        value={formData.ort}
                        onChange={handleInputChange}
                        className={inputBaseClass}
                        placeholder="Berlin"
                        required
                      />
                    </div>
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
                          <option key={region} value={region}>{region || '-- Bitte wählen --'}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Auftragsdetails */}
                <div className="mb-6">
                  <h2 className={sectionHeaderClass}>
                    <FileText className="text-orange-500" size={18} />
                    Auftragsdetails
                  </h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label htmlFor="schaden" className={labelClass}>
                        Schaden <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="schaden"
                        name="schaden"
                        value={formData.schaden}
                        onChange={handleInputChange}
                        className={selectBaseClass}
                        required
                      >
                        {SCHADEN_OPTIONS.map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="beschreibung" className={labelClass}>Beschreibung</label>
                    <textarea
                      id="beschreibung"
                      name="beschreibung"
                      value={formData.beschreibung}
                      onChange={handleInputChange}
                      rows={3}
                      className={`${inputBaseClass} resize-none`}
                      placeholder="Beschreiben Sie den Schaden oder die gewünschte Leistung..."
                    />
                  </div>
                </div>

                {/* Termin & Status */}
                <div className="mb-6">
                  <h2 className={sectionHeaderClass}>
                    <Calendar className="text-purple-500" size={18} />
                    Termin & Status
                  </h2>
                  
                  {/* Checkboxes */}
                  <div className="flex flex-wrap gap-6 mb-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        name="termin_vereinbart"
                        checked={formData.termin_vereinbart}
                        onChange={handleInputChange}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Termin vereinbart?</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        name="wartezeit_angeben"
                        checked={formData.wartezeit_angeben}
                        onChange={handleInputChange}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Wartezeit angeben?</span>
                    </label>
                  </div>
                  
                  {/* Priority Radio Buttons */}
                  <div className="mb-4">
                    <label className={labelClass}>Priorität</label>
                    <div className="flex gap-4 mt-1">
                      <label className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer border transition-colors ${
                        formData.prioritaet === 'normal' 
                          ? 'bg-yellow-100 border-yellow-300 text-yellow-800' 
                          : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                      }`}>
                        <input
                          type="radio"
                          name="prioritaet"
                          value="normal"
                          checked={formData.prioritaet === 'normal'}
                          onChange={handleInputChange}
                          className="w-4 h-4 text-yellow-600 focus:ring-yellow-500"
                        />
                        <span className="text-sm font-medium">Mittel</span>
                      </label>
                      <label className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer border transition-colors ${
                        formData.prioritaet === 'hoch' 
                          ? 'bg-orange-100 border-orange-300 text-orange-800' 
                          : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                      }`}>
                        <input
                          type="radio"
                          name="prioritaet"
                          value="hoch"
                          checked={formData.prioritaet === 'hoch'}
                          onChange={handleInputChange}
                          className="w-4 h-4 text-orange-600 focus:ring-orange-500"
                        />
                        <span className="text-sm font-medium">Hoch</span>
                      </label>
                      <label className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer border transition-colors ${
                        formData.prioritaet === 'dringend' 
                          ? 'bg-red-100 border-red-300 text-red-800' 
                          : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                      }`}>
                        <input
                          type="radio"
                          name="prioritaet"
                          value="dringend"
                          checked={formData.prioritaet === 'dringend'}
                          onChange={handleInputChange}
                          className="w-4 h-4 text-red-600 focus:ring-red-500"
                        />
                        <span className="text-sm font-medium">Dringend</span>
                      </label>
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
                      {STATUS_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Interne Notiz */}
                <div className="mb-6">
                  <h2 className={sectionHeaderClass}>
                    <MessageSquare className="text-gray-500" size={18} />
                    Interne Notiz
                  </h2>
                  
                  <textarea
                    id="interne_notizen"
                    name="interne_notizen"
                    value={formData.interne_notizen}
                    onChange={handleInputChange}
                    rows={3}
                    className={`${inputBaseClass} resize-none`}
                    placeholder="Interne Notizen hier eingeben..."
                  />
                  
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                    <Lock size={12} />
                    <span>Nur für Disponenten, Admin, Betriebsleiter und Buchhaltung sichtbar</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="flex items-center gap-2 px-4 py-2.5 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                    disabled={loading}
                  >
                    <X size={18} />
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    disabled={loading || success}
                    className="flex items-center gap-2 px-5 py-2.5 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                        <span>Erstellen...</span>
                      </>
                    ) : (
                      <>
                        <Check size={18} />
                        <span>Auftrag erstellen</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right Column - Map */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden sticky top-4">
              {/* Map Header */}
              <div className="bg-blue-50 p-4 border-b border-blue-100">
                <h2 className="text-sm font-semibold text-blue-900 flex items-center gap-2">
                  <MapPin className="text-blue-600" size={18} />
                  Einsatzort auf Karte
                </h2>
              </div>
              
              {/* Map Container */}
              <div className="p-4">
                <div className="h-[400px]">
                  <LocationMap
                    latitude={formData.latitude}
                    longitude={formData.longitude}
                    onLocationSelect={handleLocationSelect}
                  />
                </div>
                
                {/* Coordinates Display */}
                {formData.latitude && formData.longitude && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <p className="text-xs font-semibold text-blue-800 mb-1">Ausgewählte Koordinaten:</p>
                    <p className="text-sm text-blue-700 font-mono">
                      {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
                    </p>
                  </div>
                )}
                
                {!formData.latitude && !formData.longitude && (
                  <p className="mt-3 text-xs text-gray-500 text-center">
                    Klicken Sie auf die Karte, um den Einsatzort zu markieren
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NeuerAuftrag;
