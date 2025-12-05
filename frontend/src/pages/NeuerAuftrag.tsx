import { useState, FormEvent, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, X, AlertCircle, CheckCircle } from 'lucide-react';
import { Gewerk, AuftraggeberTyp } from '../types/models';
import { orderApi } from '../services/api';

// Type for string-only form fields (excluding enum types)
type StringFormFields = 'region' | 'name' | 'vorname' | 'telefon' | 'strasse' | 'hausnummer' | 'plz' | 'stadt';

// Form data interface for new order
interface NewOrderFormData {
  gewerk: Gewerk;
  region: string;
  auftraggeber_typ: AuftraggeberTyp;
  name: string;
  vorname: string;
  telefon: string;
  strasse: string;
  hausnummer: string;
  plz: string;
  stadt: string;
}

// Initial form state
const initialFormData: NewOrderFormData = {
  gewerk: 'Elektro',
  region: '',
  auftraggeber_typ: 'Privat',
  name: '',
  vorname: '',
  telefon: '',
  strasse: '',
  hausnummer: '',
  plz: '',
  stadt: '',
};

// Validation error interface
interface ValidationErrors {
  [key: string]: string;
}

function NeuerAuftrag() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<NewOrderFormData>(initialFormData);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  
  // Ref to track if component is mounted for safe navigation
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Handle input changes
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Validate form data
  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    if (!formData.region.trim()) {
      newErrors.region = 'Region ist erforderlich';
    }
    if (!formData.name.trim()) {
      newErrors.name = 'Nachname ist erforderlich';
    }
    if (!formData.vorname.trim()) {
      newErrors.vorname = 'Vorname ist erforderlich';
    }
    if (!formData.telefon.trim()) {
      newErrors.telefon = 'Telefon ist erforderlich';
    }
    if (!formData.strasse.trim()) {
      newErrors.strasse = 'Straße ist erforderlich';
    }
    if (!formData.hausnummer.trim()) {
      newErrors.hausnummer = 'Hausnummer ist erforderlich';
    }
    if (!formData.plz.trim()) {
      newErrors.plz = 'PLZ ist erforderlich';
    } else if (!/^\d{5}$/.test(formData.plz.trim())) {
      newErrors.plz = 'PLZ muss 5 Ziffern haben';
    }
    if (!formData.stadt.trim()) {
      newErrors.stadt = 'Stadt ist erforderlich';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(false);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await orderApi.create({
        gewerk: formData.gewerk,
        region: formData.region.trim(),
        auftraggeber_typ: formData.auftraggeber_typ,
        name: formData.name.trim(),
        vorname: formData.vorname.trim(),
        telefon: formData.telefon.trim(),
        strasse: formData.strasse.trim(),
        hausnummer: formData.hausnummer.trim(),
        plz: formData.plz.trim(),
        stadt: formData.stadt.trim(),
      });

      setSubmitSuccess(true);
      setFormData(initialFormData);
      
      // Redirect to Auftragsverwaltung after a brief delay
      // Use ref to track and cleanup timeout on unmount
      timeoutRef.current = setTimeout(() => {
        navigate('/auftragsverwaltung');
      }, 1500);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'Fehler beim Erstellen des Auftrags'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    setFormData(initialFormData);
    setErrors({});
    setSubmitError(null);
    setSubmitSuccess(false);
  };

  // Input field component with error handling
  // Restricted to string-only fields to ensure type safety
  const InputField = ({
    label,
    name,
    type = 'text',
    placeholder,
    required = false,
    className = '',
  }: {
    label: string;
    name: StringFormFields;
    type?: string;
    placeholder?: string;
    required?: boolean;
    className?: string;
  }) => (
    <div className={className}>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        id={name}
        name={name}
        value={formData[name]}
        onChange={handleChange}
        placeholder={placeholder}
        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
          errors[name] ? 'border-red-500 bg-red-50' : 'border-gray-300'
        }`}
      />
      {errors[name] && (
        <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
          <AlertCircle size={14} />
          {errors[name]}
        </p>
      )}
    </div>
  );

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        {/* Page Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Neuer Auftrag</h1>
          <p className="text-gray-600">
            Erstellen Sie hier einen neuen Auftrag mit allen relevanten Kundendaten.
          </p>
        </div>

        {/* Success Message */}
        {submitSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center gap-3">
            <CheckCircle className="text-green-600" size={20} />
            <div>
              <p className="text-green-800 font-medium">Auftrag erfolgreich erstellt!</p>
              <p className="text-green-600 text-sm">Sie werden zur Auftragsverwaltung weitergeleitet...</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {submitError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-3">
            <AlertCircle className="text-red-600" size={20} />
            <div>
              <p className="text-red-800 font-medium">Fehler beim Erstellen</p>
              <p className="text-red-600 text-sm">{submitError}</p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Auftragsdaten Section */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
              Auftragsdaten
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Gewerk */}
              <div>
                <label htmlFor="gewerk" className="block text-sm font-medium text-gray-700 mb-1">
                  Gewerk <span className="text-red-500">*</span>
                </label>
                <select
                  id="gewerk"
                  name="gewerk"
                  value={formData.gewerk}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                >
                  <option value="Elektro">Elektro</option>
                  <option value="Klempner">Klempner / Sanitär</option>
                  <option value="Heizung">Heizung</option>
                </select>
              </div>

              {/* Region */}
              <InputField
                label="Region"
                name="region"
                placeholder="z.B. Berlin-Mitte"
                required
              />

              {/* Auftraggeber Typ */}
              <div>
                <label htmlFor="auftraggeber_typ" className="block text-sm font-medium text-gray-700 mb-1">
                  Auftraggeber <span className="text-red-500">*</span>
                </label>
                <select
                  id="auftraggeber_typ"
                  name="auftraggeber_typ"
                  value={formData.auftraggeber_typ}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                >
                  <option value="Privat">Privatkunde</option>
                  <option value="Firma">Firma / Gewerbe</option>
                </select>
              </div>
            </div>
          </div>

          {/* Kundendaten Section */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
              Kundendaten
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField
                label="Vorname"
                name="vorname"
                placeholder="Max"
                required
              />
              <InputField
                label="Nachname"
                name="name"
                placeholder="Mustermann"
                required
              />
              <InputField
                label="Telefon"
                name="telefon"
                type="tel"
                placeholder="+49 30 12345678"
                required
                className="md:col-span-2"
              />
            </div>
          </div>

          {/* Adresse Section */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
              Einsatzort / Adresse
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <InputField
                label="Straße"
                name="strasse"
                placeholder="Musterstraße"
                required
                className="md:col-span-3"
              />
              <InputField
                label="Hausnummer"
                name="hausnummer"
                placeholder="12a"
                required
              />
              <InputField
                label="PLZ"
                name="plz"
                placeholder="12345"
                required
              />
              <InputField
                label="Stadt"
                name="stadt"
                placeholder="Berlin"
                required
                className="md:col-span-3"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex flex-col sm:flex-row gap-3 justify-end">
              <button
                type="button"
                onClick={handleCancel}
                className="flex items-center justify-center gap-2 px-6 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <X size={18} />
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`flex items-center justify-center gap-2 px-6 py-2.5 text-white rounded-lg transition-colors ${
                  isSubmitting
                    ? 'bg-blue-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                <Save size={18} />
                {isSubmitting ? 'Wird gespeichert...' : 'Auftrag erstellen'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default NeuerAuftrag;
