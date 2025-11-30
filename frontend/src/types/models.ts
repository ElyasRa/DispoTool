/**
 * Type definitions for DispoTool frontend
 */

// Auftrag (Order) status
export type AuftragStatus = 'Neu' | 'Zugewiesen' | 'Angenommen' | 'Erledigt' | 'Storno' | 'Abgelehnt';

// Gewerk (Trade) type
export type Gewerk = 'Elektro' | 'Klempner';

// Auftraggeber (Client) type
export type AuftraggeberTyp = 'Privat' | 'Firma';

// Monteur status
export type MonteurStatus = 'active' | 'inactive';

// Auftrag (Order) interface
export interface Auftrag {
  id: number;
  auftragsnummer: string;
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
  latitude: number | null;
  longitude: number | null;
  status: AuftragStatus;
  erstellt_am: string;
  zugewiesen_an: number | null;
  erledigt_am: string | null;
  // Joined fields
  monteur_name?: string;
  monteur_vorname?: string;
}

// Monteur (Technician) interface
export interface Monteur {
  id: number;
  name: string;
  vorname: string;
  region: string;
  telefonnummer: string;
  telegram_chat_id: string | null;
  provision_pro_auftrag: number;
  gps_latitude: number | null;
  gps_longitude: number | null;
  status: MonteurStatus;
  // Stats from joined query
  assigned_orders?: number;
  accepted_orders?: number;
  completed_orders?: number;
}

// API Response types
export interface AssignOrderResponse {
  message: string;
  order: Auftrag;
  telegram_sent: boolean;
}

// Response type for unschedule operation
export interface UnscheduleOrderResponse {
  message: string;
  order: Auftrag;
}
