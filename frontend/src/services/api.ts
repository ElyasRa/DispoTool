import { Auftrag, Monteur, AssignOrderResponse, UnscheduleOrderResponse } from '../types/models';

const API_BASE = 'http://49.13.128.160:3000/api';

/**
 * Helper function for API requests
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('token');
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

/**
 * Order API methods
 */
export const orderApi = {
  getAll: (): Promise<Auftrag[]> => apiRequest('/orders'),
  
  getByStatus: (status: string): Promise<Auftrag[]> => 
    apiRequest(`/orders/status/${encodeURIComponent(status)}`),
  
  getById: (id: number): Promise<Auftrag> => apiRequest(`/orders/${id}`),
  
  create: (order: Partial<Auftrag>): Promise<Auftrag> =>
    apiRequest('/orders', {
      method: 'POST',
      body: JSON.stringify(order),
    }),
  
  assign: (orderId: number, monteurId: number): Promise<AssignOrderResponse> =>
    apiRequest(`/orders/${orderId}/assign`, {
      method: 'PUT',
      body: JSON.stringify({ monteur_id: monteurId }),
    }),
  
  updateStatus: (orderId: number, status: string): Promise<Auftrag> =>
    apiRequest(`/orders/${orderId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),
  
  /**
   * Unschedule an order - removes driver assignment and resets status to 'Neu' (open).
   * Called when a task is dragged from the timeline back to Open Orders or Cancel zone.
   */
  unschedule: (orderId: number): Promise<UnscheduleOrderResponse> =>
    apiRequest(`/orders/${orderId}/unschedule`, {
      method: 'PUT',
    }),
};

/**
 * Monteur API methods
 */
export const monteurApi = {
  getAll: (): Promise<Monteur[]> => apiRequest('/monteure'),
  
  getActive: (): Promise<Monteur[]> => apiRequest('/monteure/active'),
  
  getWithStats: (): Promise<Monteur[]> => apiRequest('/monteure/stats'),
  
  getById: (id: number): Promise<Monteur> => apiRequest(`/monteure/${id}`),
  
  create: (monteur: Partial<Monteur>): Promise<Monteur> =>
    apiRequest('/monteure', {
      method: 'POST',
      body: JSON.stringify(monteur),
    }),
  
  update: (id: number, monteur: Partial<Monteur>): Promise<Monteur> =>
    apiRequest(`/monteure/${id}`, {
      method: 'PUT',
      body: JSON.stringify(monteur),
    }),
};

/**
 * Map data types
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

/**
 * Map API methods
 */
export const mapApi = {
  getData: (): Promise<MapDataResponse> => apiRequest('/map-data'),
};

export type { MapDriver, MapOrder, MapDataResponse };
