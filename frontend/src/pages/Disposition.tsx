import { useState, useEffect, useCallback } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { RefreshCw } from 'lucide-react';
import OrderCard from '../components/OrderCard';
import MonteurCard from '../components/MonteurCard';
import DispositionMap from '../components/DispositionMap';
import Sidebar from '../components/Sidebar';
import { Auftrag, Monteur } from '../types/models';
import { orderApi, monteurApi } from '../services/api';

function Disposition() {
  const [orders, setOrders] = useState<Auftrag[]>([]);
  const [monteure, setMonteure] = useState<Monteur[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeOrder, setActiveOrder] = useState<Auftrag | null>(null);
  const [assignmentMessage, setAssignmentMessage] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [ordersData, monteureData] = await Promise.all([
        orderApi.getAll(),
        monteurApi.getWithStats(),
      ]);
      setOrders(ordersData);
      setMonteure(monteureData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden der Daten');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openOrders = orders.filter((o) => o.status === 'Neu');
  const assignedOrders = orders.filter(
    (o) => o.status === 'Zugewiesen' || o.status === 'Angenommen'
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const orderId = String(active.id).replace('order-', '');
    const order = orders.find((o) => o.id === parseInt(orderId));
    setActiveOrder(order || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveOrder(null);

    if (!over) return;

    const orderId = String(active.id).replace('order-', '');
    const monteurId = String(over.id).replace('monteur-', '');

    if (!orderId || !monteurId) return;

    try {
      const result = await orderApi.assign(parseInt(orderId), parseInt(monteurId));
      
      // Update local state
      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.id === parseInt(orderId)
            ? { ...order, ...result.order }
            : order
        )
      );

      // Show success message
      const monteur = monteure.find((m) => m.id === parseInt(monteurId));
      setAssignmentMessage(
        `Auftrag ${result.order.auftragsnummer} wurde ${monteur?.vorname} ${monteur?.name} zugewiesen.${
          result.telegram_sent ? ' Telegram-Benachrichtigung gesendet.' : ''
        }`
      );

      // Refresh monteur stats
      const updatedMonteure = await monteurApi.getWithStats();
      setMonteure(updatedMonteure);

      // Clear message after 5 seconds
      setTimeout(() => setAssignmentMessage(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler bei der Zuweisung');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Sidebar />
        <div className="ml-64 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <svg className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-gray-600">Disposition wird geladen...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="min-h-screen bg-gray-100">
        <Sidebar />
        <div className="ml-64">
          {/* Header */}
          <header className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg">
            <div className="px-4 py-4">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-2xl font-bold">Disposition Board</h1>
                  <p className="text-blue-100 text-sm">Aufträge per Drag & Drop zuweisen</p>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={fetchData}
                    className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <RefreshCw size={16} />
                    Aktualisieren
                  </button>
                </div>
              </div>
            </div>
          </header>

        {/* Notifications */}
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mx-4 mt-4 rounded-r">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
              <button onClick={() => setError(null)} className="ml-auto text-red-700 hover:text-red-900">
                ✕
              </button>
            </div>
          </div>
        )}

        {assignmentMessage && (
          <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mx-4 mt-4 rounded-r">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>{assignmentMessage}</span>
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-200px)]">
            {/* Open Orders */}
            <div className="lg:col-span-3 bg-white rounded-xl shadow-lg overflow-hidden flex flex-col">
              <div className="bg-yellow-500 text-white px-4 py-3">
                <h2 className="font-semibold flex items-center gap-2">
                  <span className="bg-white/20 rounded-full px-2 py-0.5 text-sm">
                    {openOrders.length}
                  </span>
                  Offene Aufträge
                </h2>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {openOrders.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    Keine offenen Aufträge
                  </p>
                ) : (
                  openOrders.map((order) => (
                    <OrderCard key={order.id} order={order} />
                  ))
                )}
              </div>
            </div>

            {/* Map & Monteure */}
            <div className="lg:col-span-6 flex flex-col gap-6">
              {/* Map */}
              <div className="flex-1 bg-white rounded-xl shadow-lg overflow-hidden min-h-[300px]">
                <div className="bg-gray-700 text-white px-4 py-3">
                  <h2 className="font-semibold">Karte</h2>
                </div>
                <div className="h-[calc(100%-48px)]">
                  <DispositionMap orders={orders} monteure={monteure} />
                </div>
              </div>

              {/* Legend */}
              <div className="bg-white rounded-xl shadow-lg p-4">
                <h3 className="text-sm font-semibold text-gray-600 mb-2">Legende</h3>
                <div className="flex flex-wrap gap-4 text-xs">
                  <div className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-red-500"></span>
                    <span>Neu</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                    <span>Zugewiesen</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-green-500"></span>
                    <span>Angenommen</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-purple-500"></span>
                    <span>Monteur</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Monteure */}
            <div className="lg:col-span-3 bg-white rounded-xl shadow-lg overflow-hidden flex flex-col">
              <div className="bg-purple-600 text-white px-4 py-3">
                <h2 className="font-semibold flex items-center gap-2">
                  <span className="bg-white/20 rounded-full px-2 py-0.5 text-sm">
                    {monteure.length}
                  </span>
                  Monteure
                </h2>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {monteure.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    Keine Monteure verfügbar
                  </p>
                ) : (
                  monteure.map((monteur) => (
                    <MonteurCard key={monteur.id} monteur={monteur} />
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Assigned Orders Section */}
          <div className="mt-6 bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="bg-blue-600 text-white px-4 py-3">
              <h2 className="font-semibold flex items-center gap-2">
                <span className="bg-white/20 rounded-full px-2 py-0.5 text-sm">
                  {assignedOrders.length}
                </span>
                Zugewiesene Aufträge
              </h2>
            </div>
            <div className="p-4">
              {assignedOrders.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  Keine zugewiesenen Aufträge
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {assignedOrders.map((order) => (
                    <OrderCard key={order.id} order={order} isDraggable={false} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeOrder ? (
            <div className="opacity-90">
              <OrderCard order={activeOrder} isDraggable={false} />
            </div>
          ) : null}
        </DragOverlay>
        </div>
      </div>
    </DndContext>
  );
}

export default Disposition;
