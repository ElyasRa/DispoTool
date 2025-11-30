import { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Truck,
  MapPin,
  ChevronDown,
  Search,
  Filter,
} from 'lucide-react';
import DispositionMap from '../components/DispositionMap';
import Sidebar from '../components/Sidebar';
import { Auftrag, Monteur } from '../types/models';

// Type definitions for Handwerker domain - Monteur represents a Technician
interface MonteurResource {
  id: string;
  monteurId: string; // e.g., "M18"
  role: string; // e.g., "Elektriker", "Klempner", "Heizungsbauer"
  name: string; // e.g., "Marco Pfeiffer"
  isFree: boolean; // true = available/green, false = busy
  hasVehicle: boolean;
  hasLocation: boolean;
  specialty: 'elektro' | 'sanitär' | 'heizung' | 'all';
}

// Task on the Gantt chart timeline
interface ScheduledTask {
  id: number;
  resourceId: string;
  title: string; // Job description, e.g., "Rohrbruch"
  address: string; // e.g., "Musterstr. 1"
  startHour: number; // Starting hour (8-18)
  duration: number; // Duration in hours
  isEmergency: boolean; // Red for emergencies, blue for standard
  category: 'elektro' | 'sanitär' | 'heizung';
}

// Open Order for left column - Handwerker domain
interface OpenOrder {
  id: number;
  orderNumber: string;
  title: string; // e.g., "Rohrbruch", "Stromausfall", "Heizungsausfall"
  address: string;
  label: string; // Yellow label text
  category: 'elektro' | 'sanitär' | 'heizung';
}

// Mock data for Monteure (Techniker) - Handwerker-Leitstand style
const mockMonteure: MonteurResource[] = [
  { id: 'M01', monteurId: 'M18', role: 'Elektriker', name: 'Marco Pfeiffer', isFree: false, hasVehicle: true, hasLocation: true, specialty: 'elektro' },
  { id: 'M02', monteurId: 'M22', role: 'Klempner', name: 'Hans Weber', isFree: true, hasVehicle: true, hasLocation: true, specialty: 'sanitär' },
  { id: 'M03', monteurId: 'M15', role: 'Elektriker', name: 'Thomas Schmidt', isFree: true, hasVehicle: true, hasLocation: false, specialty: 'elektro' },
  { id: 'M04', monteurId: 'M09', role: 'Heizungsbauer', name: 'Peter Müller', isFree: false, hasVehicle: true, hasLocation: true, specialty: 'heizung' },
  { id: 'M05', monteurId: 'M31', role: 'Monteur', name: 'Andreas Becker', isFree: true, hasVehicle: false, hasLocation: true, specialty: 'all' },
  { id: 'M06', monteurId: 'M27', role: 'Elektriker', name: 'Stefan Wagner', isFree: false, hasVehicle: true, hasLocation: true, specialty: 'elektro' },
  { id: 'M07', monteurId: 'M33', role: 'Klempner', name: 'Klaus Fischer', isFree: true, hasVehicle: true, hasLocation: true, specialty: 'sanitär' },
  { id: 'M08', monteurId: 'M44', role: 'Heizungsbauer', name: 'Uwe Braun', isFree: false, hasVehicle: true, hasLocation: false, specialty: 'heizung' },
];

// Mock data for scheduled tasks - Sanitär, Elektro, Heizung domain (8-18 Uhr)
const initialScheduledTasks: ScheduledTask[] = [
  { id: 101, resourceId: 'M01', title: 'Stromausfall', address: 'Hauptstr. 12', startHour: 8, duration: 2, isEmergency: true, category: 'elektro' },
  { id: 102, resourceId: 'M01', title: 'Steckdose defekt', address: 'Berliner Str. 5', startHour: 11, duration: 1, isEmergency: false, category: 'elektro' },
  { id: 103, resourceId: 'M04', title: 'Rohrbruch', address: 'Musterstr. 1', startHour: 9, duration: 3, isEmergency: true, category: 'sanitär' },
  { id: 104, resourceId: 'M06', title: 'Sicherung prüfen', address: 'Industrieweg 22', startHour: 10, duration: 2, isEmergency: false, category: 'elektro' },
  { id: 105, resourceId: 'M04', title: 'Heizungsausfall', address: 'Parkstr. 8', startHour: 14, duration: 3, isEmergency: true, category: 'heizung' },
  { id: 106, resourceId: 'M08', title: 'Therme Wartung', address: 'Ringstr. 45', startHour: 8, duration: 2, isEmergency: false, category: 'heizung' },
  { id: 107, resourceId: 'M06', title: 'Lampe Installation', address: 'Schulweg 3', startHour: 14, duration: 2, isEmergency: false, category: 'elektro' },
  { id: 108, resourceId: 'M08', title: 'Heizkörper tauschen', address: 'Marktplatz 7', startHour: 11, duration: 3, isEmergency: false, category: 'heizung' },
];

// Mock data for open orders (left column) - Handwerker domain
const mockOpenOrders: OpenOrder[] = [
  { id: 1, orderNumber: 'A-2024-001', title: 'Rohrbruch', address: 'Musterstraße 15, 12345 Berlin', label: 'Dringend', category: 'sanitär' },
  { id: 2, orderNumber: 'A-2024-002', title: 'Heizung defekt', address: 'Hauptstraße 22, 12345 Berlin', label: 'Termin heute', category: 'heizung' },
  { id: 3, orderNumber: 'A-2024-003', title: 'Stromausfall', address: 'Berliner Str. 8, 10115 Berlin', label: 'Notfall', category: 'elektro' },
  { id: 4, orderNumber: 'A-2024-004', title: 'Wasserschaden', address: 'Parkweg 3, 10117 Berlin', label: 'Neu', category: 'sanitär' },
  { id: 5, orderNumber: 'A-2024-005', title: 'Sicherungskasten', address: 'Industriestr. 44, 10119 Berlin', label: 'Termin heute', category: 'elektro' },
  { id: 6, orderNumber: 'A-2024-006', title: 'Leitungsbruch', address: 'Schulweg 12, 10115 Berlin', label: 'Dringend', category: 'sanitär' },
  { id: 7, orderNumber: 'A-2024-007', title: 'Therme defekt', address: 'Marktplatz 7, 10117 Berlin', label: 'Neu', category: 'heizung' },
  { id: 8, orderNumber: 'A-2024-008', title: 'WC verstopft', address: 'Ringstraße 55, 10119 Berlin', label: 'Dringend', category: 'sanitär' },
  { id: 9, orderNumber: 'A-2024-009', title: 'Kurzschluss', address: 'Bergstraße 9, 10115 Berlin', label: 'Notfall', category: 'elektro' },
  { id: 10, orderNumber: 'A-2024-010', title: 'Fußbodenheizung', address: 'Waldweg 2, 10117 Berlin', label: 'Termin heute', category: 'heizung' },
];

// Time slots for the timeline - showing work hours (8:00 - 18:00)
const timeSlots = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
// Timeline starts at hour 8
const TIMELINE_START_HOUR = 8;
// Timeline spans 10 hours
const TIMELINE_HOURS = 10;
// Snap interval in hours (0.5 = 30 minutes)
const SNAP_INTERVAL = 0.5;

// Helper function to format hour display
const formatHour = (hour: number): string => {
  return `${hour.toString().padStart(2, '0')}:00`;
};

// Draggable Order Card Component
function DraggableOrderCard({ order }: { order: OpenOrder }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `order-${order.id}`,
    data: { order },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: isDragging ? 1000 : undefined,
        opacity: isDragging ? 0.8 : 1,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`bg-white rounded shadow-md p-3 cursor-grab active:cursor-grabbing border-l-4 border-black hover:shadow-lg transition-shadow ${
        isDragging ? 'ring-2 ring-blue-500' : ''
      }`}
    >
      {/* Title */}
      <div className="font-bold text-sm text-gray-900 mb-1">{order.title}</div>
      {/* Address */}
      <div className="flex items-start gap-1 mb-2">
        <MapPin size={12} className="text-gray-400 mt-0.5 flex-shrink-0" />
        <span className="text-xs text-gray-500 leading-tight">{order.address}</span>
      </div>
      {/* Label */}
      <span className="inline-block bg-yellow-400 text-yellow-900 text-xs font-medium px-2 py-0.5 rounded">
        {order.label}
      </span>
    </div>
  );
}

// Droppable Timeline Slot Component
function DroppableTimeSlot({
  monteurId,
  hour,
  children,
}: {
  monteurId: string;
  hour: number;
  children?: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `slot-${monteurId}-${hour}`,
    data: { monteurId, hour },
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-w-[60px] border-r border-gray-200 relative ${
        isOver ? 'bg-blue-100' : ''
      }`}
    >
      {children}
    </div>
  );
}

function Disposition() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [mapType, setMapType] = useState<'karte' | 'satellit'>('karte');
  const [groupBy, setGroupBy] = useState<'all' | 'elektro' | 'sanitär' | 'heizung'>('all');
  
  // State for scheduled tasks and open orders
  const [scheduledTasks, setScheduledTasks] = useState<ScheduledTask[]>(initialScheduledTasks);
  const [openOrders, setOpenOrders] = useState<OpenOrder[]>(mockOpenOrders);
  const [activeOrder, setActiveOrder] = useState<OpenOrder | null>(null);

  // Empty arrays for map - map shows placeholder when no API key is configured
  const mockOrdersForMap: Auftrag[] = [];
  const mockMonteureForMap: Monteur[] = [];

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => !prev);
  };

  // Format date as DD.MM.YYYY
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const goToPreviousDay = () => {
    setSelectedDate((prev) => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() - 1);
      return newDate;
    });
  };

  const goToNextDay = () => {
    setSelectedDate((prev) => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + 1);
      return newDate;
    });
  };

  // Filter monteure based on group
  const filteredMonteure =
    groupBy === 'all'
      ? mockMonteure
      : mockMonteure.filter((m) => m.specialty === groupBy || m.specialty === 'all');

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const order = openOrders.find((o) => `order-${o.id}` === active.id);
    if (order) {
      setActiveOrder(order);
    }
  };

  // Handle drag end - snap to grid
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveOrder(null);

    if (!over) return;

    const overId = over.id as string;
    if (!overId.startsWith('slot-')) return;

    // Parse the drop target
    const parts = overId.split('-');
    const monteurId = parts[1];
    const dropHour = parseInt(parts[2], 10);

    // Get the dragged order
    const order = openOrders.find((o) => `order-${o.id}` === active.id);
    if (!order) return;

    // Snap to nearest interval
    const snappedHour = Math.round(dropHour / SNAP_INTERVAL) * SNAP_INTERVAL;
    const clampedHour = Math.max(TIMELINE_START_HOUR, Math.min(snappedHour, TIMELINE_START_HOUR + TIMELINE_HOURS - 1));

    // Create new scheduled task
    const newTask: ScheduledTask = {
      id: Date.now(),
      resourceId: monteurId,
      title: order.title,
      address: order.address,
      startHour: clampedHour,
      duration: 2, // Default duration
      isEmergency: order.label === 'Notfall' || order.label === 'Dringend',
      category: order.category,
    };

    // Add to scheduled tasks
    setScheduledTasks((prev) => [...prev, newTask]);

    // Remove from open orders
    setOpenOrders((prev) => prev.filter((o) => o.id !== order.id));
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="h-screen bg-gray-200 overflow-hidden">
        <Sidebar isCollapsed={isSidebarCollapsed} onToggle={toggleSidebar} />
        <div
          className={`${
            isSidebarCollapsed ? 'ml-16' : 'ml-64'
          } transition-all duration-300 ease-in-out h-screen flex flex-col`}
        >
          {/* Main 3-Column Split-View Layout */}
          <div className="flex-1 flex overflow-hidden">
            {/* ========== LEFT COLUMN - Offene Aufträge (20%) ========== */}
            <div className="w-[20%] min-w-[260px] border-r border-gray-300 bg-white flex flex-col">
              {/* Header with Counter and Dropdown */}
              <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button className="flex items-center gap-1 text-sm font-semibold text-gray-800 hover:text-gray-600">
                    Offene Aufträge
                    <ChevronDown size={16} />
                  </button>
                  <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {openOrders.length}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded">
                    <Filter size={16} />
                  </button>
                  <button className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded">
                    <Search size={16} />
                  </button>
                </div>
              </div>

              {/* Orders List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50">
                {openOrders.map((order) => (
                  <DraggableOrderCard key={order.id} order={order} />
                ))}
              </div>
            </div>

            {/* ========== CENTER COLUMN - Gantt Chart / Plantafel (45%) ========== */}
            <div className="w-[45%] min-w-[500px] border-r border-gray-300 bg-white flex flex-col">
              {/* Gantt Header - Date selector and Group dropdown */}
              <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
                {/* Date Navigation */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={goToPreviousDay}
                    className="p-1.5 hover:bg-gray-100 rounded transition-colors text-gray-600"
                    aria-label="Vorheriger Tag"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded">
                    <Calendar size={14} className="text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">{formatDate(selectedDate)}</span>
                  </div>
                  <button
                    onClick={goToNextDay}
                    className="p-1.5 hover:bg-gray-100 rounded transition-colors text-gray-600"
                    aria-label="Nächster Tag"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>

                {/* Group Dropdown */}
                <select
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value as 'all' | 'elektro' | 'sanitär' | 'heizung')}
                  className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 border border-gray-200 rounded cursor-pointer hover:bg-gray-200 transition-colors"
                >
                  <option value="all">Alle Gewerke</option>
                  <option value="elektro">Elektro</option>
                  <option value="sanitär">Sanitär</option>
                  <option value="heizung">Heizung</option>
                </select>
              </div>

              {/* Gantt Chart Content */}
              <div className="flex-1 overflow-auto bg-gray-50">
                {/* Time Header Row */}
                <div className="flex border-b border-gray-300 bg-gray-100 sticky top-0 z-10">
                  {/* Resource Column Header */}
                  <div className="w-44 min-w-[176px] border-r border-gray-300 px-2 py-2 flex items-center">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Monteur
                    </span>
                  </div>
                  {/* Timeline Hours */}
                  <div className="flex-1 flex">
                    {timeSlots.map((hour, index) => (
                      <div
                        key={index}
                        className="flex-1 min-w-[60px] border-r border-gray-300 py-2 text-center text-xs font-medium text-gray-600"
                      >
                        {formatHour(hour)}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Monteur Rows */}
                {filteredMonteure.map((monteur) => {
                  // Check if monteur has any active tasks
                  const hasActiveTasks = scheduledTasks.some((t) => t.resourceId === monteur.id);
                  const rowBgColor = monteur.isFree && !hasActiveTasks ? 'bg-green-50' : 'bg-white';

                  return (
                    <div
                      key={monteur.id}
                      className={`flex border-b border-gray-200 ${rowBgColor} hover:bg-opacity-80 transition-colors`}
                      style={{ minHeight: '120px' }}
                    >
                      {/* Monteur Info Cell */}
                      <div className="w-44 min-w-[176px] border-r border-gray-300 flex flex-col">
                        {/* Top content area */}
                        <div className="flex-1 px-3 py-2">
                          {/* Top Row: Monteur ID */}
                          <div className="text-sm font-bold text-gray-900 mb-1.5">
                            {monteur.monteurId}
                          </div>

                          {/* Icons Row */}
                          <div className="flex items-center gap-2 mb-2">
                            <Truck
                              size={16}
                              className={monteur.hasVehicle ? 'text-green-500' : 'text-gray-300'}
                            />
                            <MapPin
                              size={16}
                              className={monteur.hasLocation ? 'text-green-500' : 'text-gray-300'}
                            />
                          </div>

                          {/* Status Badge */}
                          <div className="mb-2">
                            <span
                              className={`inline-block text-white text-[10px] px-2 py-0.5 rounded ${
                                monteur.isFree ? 'bg-green-500' : 'bg-red-500'
                              }`}
                            >
                              {monteur.isFree ? 'Frei' : 'Beschäftigt'}
                            </span>
                          </div>
                        </div>

                        {/* Bottom: Grey Name Box - Stuck to bottom */}
                        <div className="bg-gray-600 text-white text-xs px-3 py-2 font-medium">
                          {monteur.name}
                        </div>
                      </div>

                      {/* Timeline Area with Droppable Slots and Task Bars */}
                      <div className="flex-1 flex relative">
                        {/* Droppable Time Slots */}
                        {timeSlots.map((hour) => (
                          <DroppableTimeSlot key={`${monteur.id}-${hour}`} monteurId={monteur.id} hour={hour} />
                        ))}

                        {/* Task Bars */}
                        {scheduledTasks
                          .filter((task) => task.resourceId === monteur.id)
                          .map((task) => {
                            const left = ((task.startHour - TIMELINE_START_HOUR) / TIMELINE_HOURS) * 100;
                            const width = (task.duration / TIMELINE_HOURS) * 100;

                            // Color based on emergency status
                            const borderColor = task.isEmergency ? 'border-l-red-500' : 'border-l-blue-500';
                            const bgColor = task.isEmergency ? 'bg-red-50' : 'bg-blue-50';

                            return (
                              <div
                                key={task.id}
                                className={`absolute top-3 ${bgColor} ${borderColor} border-l-4 rounded shadow-sm flex flex-col justify-center px-2 text-xs cursor-pointer hover:shadow-md transition-shadow overflow-hidden`}
                                style={{
                                  left: `${left}%`,
                                  width: `${width}%`,
                                  minWidth: '70px',
                                  height: '55px',
                                }}
                                title={`${task.title}, ${task.address}`}
                              >
                                <span className="font-semibold text-gray-800 truncate">{task.title}</span>
                                <span className="text-[10px] text-gray-500 truncate">{task.address}</span>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  );
                })}

                {/* Legend */}
                <div className="px-4 py-3 border-t border-gray-300 bg-gray-100">
                  <h4 className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Legende</h4>
                  <div className="flex flex-wrap gap-4 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded border-l-4 border-l-red-500 bg-red-50"></span>
                      <span className="text-gray-600">Notfall / Dringend</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded border-l-4 border-l-blue-500 bg-blue-50"></span>
                      <span className="text-gray-600">Standard</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-green-100 border border-green-300"></span>
                      <span className="text-gray-600">Monteur Frei</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ========== RIGHT COLUMN - Map (35%) ========== */}
            <div className="flex-1 min-w-[300px] bg-white flex flex-col relative">
              {/* Map Content - Full Height with overlay controls */}
              <div className="flex-1 relative">
                {/* Map Toggle Buttons - Top Left Overlay */}
                <div className="absolute top-3 left-3 z-10 flex rounded overflow-hidden shadow-md">
                  <button
                    onClick={() => setMapType('karte')}
                    className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                      mapType === 'karte'
                        ? 'bg-white text-gray-800'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Karte
                  </button>
                  <button
                    onClick={() => setMapType('satellit')}
                    className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                      mapType === 'satellit'
                        ? 'bg-white text-gray-800'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Satellit
                  </button>
                </div>

                <DispositionMap orders={mockOrdersForMap} monteure={mockMonteureForMap} />
              </div>
            </div>
          </div>
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeOrder ? (
            <div className="bg-white rounded shadow-lg p-3 border-l-4 border-black opacity-90 w-56">
              <div className="font-bold text-sm text-gray-900 mb-1">{activeOrder.title}</div>
              <div className="flex items-start gap-1 mb-2">
                <MapPin size={12} className="text-gray-400 mt-0.5 flex-shrink-0" />
                <span className="text-xs text-gray-500 leading-tight">{activeOrder.address}</span>
              </div>
              <span className="inline-block bg-yellow-400 text-yellow-900 text-xs font-medium px-2 py-0.5 rounded">
                {activeOrder.label}
              </span>
            </div>
          ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
}

export default Disposition;
