import { Request, Response } from 'express';

/**
 * Mock data for map visualization
 * Drivers (Monteure) with their company/base addresses around Berlin
 * Orders with 'open' status representing mission locations (Einsatzort)
 */

interface MapDriver {
  id: number;
  name: string;
  location: {
    lat: number;
    lng: number;
  };
}

interface MapOrder {
  id: number;
  title: string;
  status: 'open';
  location: {
    lat: number;
    lng: number;
  };
}

interface MapDataResponse {
  drivers: MapDriver[];
  orders: MapOrder[];
}

// Mock drivers with base locations around Berlin (approx 52.52, 13.40)
const mockDrivers: MapDriver[] = [
  {
    id: 1,
    name: 'Hans Müller',
    location: { lat: 52.5200, lng: 13.4050 }, // Central Berlin
  },
  {
    id: 2,
    name: 'Peter Schmidt',
    location: { lat: 52.4870, lng: 13.4250 }, // Neukölln
  },
  {
    id: 3,
    name: 'Klaus Weber',
    location: { lat: 52.5430, lng: 13.3510 }, // Wedding
  },
  {
    id: 4,
    name: 'Michael Bauer',
    location: { lat: 52.4760, lng: 13.3280 }, // Steglitz
  },
  {
    id: 5,
    name: 'Thomas Fischer',
    location: { lat: 52.5080, lng: 13.4650 }, // Friedrichshain
  },
];

// Mock orders (undispatched) with mission locations around Berlin
const mockOrders: MapOrder[] = [
  {
    id: 101,
    title: 'Elektro-Installation Wohnung',
    status: 'open',
    location: { lat: 52.5300, lng: 13.3850 }, // Mitte
  },
  {
    id: 102,
    title: 'Heizungsreparatur Büro',
    status: 'open',
    location: { lat: 52.4950, lng: 13.4400 }, // Kreuzberg
  },
  {
    id: 103,
    title: 'Klempner-Notdienst',
    status: 'open',
    location: { lat: 52.5550, lng: 13.3900 }, // Prenzlauer Berg
  },
  {
    id: 104,
    title: 'Elektro-Wartung Praxis',
    status: 'open',
    location: { lat: 52.4620, lng: 13.3150 }, // Lichterfelde
  },
  {
    id: 105,
    title: 'Sanitär-Installation Neubau',
    status: 'open',
    location: { lat: 52.5100, lng: 13.5000 }, // Lichtenberg
  },
  {
    id: 106,
    title: 'Therme-Austausch',
    status: 'open',
    location: { lat: 52.5400, lng: 13.4200 }, // Pankow
  },
];

/**
 * Get map data for visualization
 * Returns mock data for drivers and undispatched orders
 */
export const getMapData = (_req: Request, res: Response): void => {
  const response: MapDataResponse = {
    drivers: mockDrivers,
    orders: mockOrders,
  };
  res.json(response);
};

export default {
  getMapData,
};
