/**
 * Type definitions for DispoTool data models
 * Based on the "Pflichtenheft" (Requirements Document), Section 3 (Data Model)
 */

// User roles enum
export type UserRole = 'admin' | 'disponent' | 'buchhaltung' | 'betriebsleiter';

// User status enum
export type UserStatus = 'active' | 'inactive';

// User interface
export interface User {
  id: number;
  name: string;
  vorname: string;
  benutzername: string;
  passwort: string; // Password hash
  rolle: UserRole;
  status: UserStatus;
}

// Monteur status enum
export type MonteurStatus = 'active' | 'inactive';

// Monteur (Technician) interface
export interface Monteur {
  id: number;
  name: string;
  vorname: string;
  region: string;
  telefonnummer: string;
  telegram_chat_id: string | null;
  provision_pro_auftrag: number; // Decimal value
  gps_latitude: number | null; // Decimal/Float
  gps_longitude: number | null; // Decimal/Float
  status: MonteurStatus;
}

// Auftrag (Order) status enum
export type AuftragStatus = 'Neu' | 'Zugewiesen' | 'Angenommen' | 'Erledigt' | 'Storno' | 'Abgelehnt';

// Gewerk (Trade) type
export type Gewerk = 'Elektro' | 'Klempner';

// Auftraggeber (Client) type
export type AuftraggeberTyp = 'Privat' | 'Firma';

// Auftrag (Order) interface
export interface Auftrag {
  id: number;
  auftragsnummer: string; // Format: YYYYMMDD-XXXXX
  gewerk: Gewerk;
  region: string;
  auftraggeber_typ: AuftraggeberTyp;
  name: string; // Customer name
  vorname: string;
  telefon: string;
  strasse: string;
  hausnummer: string;
  plz: string;
  stadt: string;
  latitude: number | null; // Decimal
  longitude: number | null; // Decimal
  status: AuftragStatus;
  erstellt_am: Date;
  zugewiesen_an: number | null; // Foreign key to monteure.id
  erledigt_am: Date | null;
}

// Abrechnung (Invoice/Settlement) interface
export interface Abrechnung {
  id: number;
  monteur_id: number; // Foreign key to monteure.id
  zeitraum_von: Date;
  zeitraum_bis: Date;
  summe_auftraege: number; // Integer count
  provision: number; // Decimal - total provision amount
  endsumme: number; // Decimal
  pdf_pfad: string;
  bezahlt: boolean;
}

// Umsatz (Revenue for completed orders) interface
export interface Umsatz {
  id: number;
  auftrag_id: number; // Foreign key to auftraege.id
  betrag: number; // Decimal
  korrekturvermerk: string | null;
  eingetragen_am: Date;
}
