import { useState, useMemo, useEffect } from 'react';
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
  // Fields for tracking original order data when scheduling from open orders.
  // These are populated when an OpenOrder is dropped onto the timeline and used
  // to restore the order when unscheduling (dragging back to Open Orders).
  originalOrderId?: number; // Original OpenOrder.id for restoring when unscheduled
  originalLabel?: string; // Original OpenOrder.label for restoring when unscheduled
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

// Number of hours to display in the timeline (current hour + N hours ahead)
const TIMELINE_HOURS_COUNT = 5; // Shows current hour + 4 hours ahead
// Minimum row height
const MIN_ROW_HEIGHT = 100;

// Helper function to generate dynamic time slots starting from current hour
const generateTimeSlots = (startHour: number): number[] => {
  const slots: number[] = [];
  for (let i = 0; i < TIMELINE_HOURS_COUNT; i++) {
    // Handle midnight wraparound (e.g., 23 -> 0 -> 1)
    slots.push((startHour + i) % 24);
  }
  return slots;
};

// Helper function to check if a task hour is in the past relative to current hour
// Handles midnight wraparound correctly
const isHourInPast = (taskHour: number, currentHour: number): boolean => {
  // Calculate how many hours ago the task was scheduled
  // Using modular arithmetic to handle 24-hour wraparound
  const hoursDiff = (currentHour - taskHour + 24) % 24;
  // If hoursDiff is between 1-12, the task is in the past (within last 12 hours)
  // If hoursDiff is 0, the task is exactly at current hour (not past)
  // If hoursDiff is 13-23, the task is actually in the future (11-1 hours ahead)
  return hoursDiff > 0 && hoursDiff <= 12;
};

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
      className={`bg-white rounded shadow-md p-2 mb-1 cursor-grab active:cursor-grabbing border-l-4 border-black hover:shadow-lg transition-shadow ${
        isDragging ? 'ring-2 ring-blue-500' : ''
      }`}
    >
      {/* Title */}
      <div className="font-bold text-xs text-gray-900 mb-0.5">{order.title}</div>
      {/* Address */}
      <div className="flex items-start gap-1 mb-1">
        <MapPin size={10} className="text-gray-400 mt-0.5 flex-shrink-0" />
        <span className="text-xs text-gray-500 leading-tight">{order.address}</span>
      </div>
      {/* Label */}
      <span className="inline-block bg-yellow-400 text-yellow-900 text-xs font-medium px-2 py-0.5 rounded">
        {order.label}
      </span>
    </div>
  );
}

// Draggable Scheduled Task Component
function DraggableScheduledTask({ task }: { task: ScheduledTask }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `task-${task.id}`,
    data: { task, type: 'scheduled-task' },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: isDragging ? 1000 : undefined,
        opacity: isDragging ? 0.5 : 1,
      }
    : undefined;

  const baseClassName = 'w-full bg-gray-300 border-l-8 border-red-600 rounded shadow-sm ' +
    'flex flex-col justify-between px-2 py-1 text-xs cursor-grab active:cursor-grabbing ' +
    'hover:shadow-md transition-shadow overflow-hidden mb-1';
  const draggingClassName = isDragging ? 'ring-2 ring-blue-500' : '';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`${baseClassName} ${draggingClassName}`}
      title={`${task.title}, ${task.address}`}
    >
      {/* Task content: title and address */}
      <div className="flex-1 min-h-0">
        <span className="font-semibold text-gray-800 block truncate">{task.title}</span>
        <span className="text-[10px] text-gray-600 block truncate">{task.address}</span>
      </div>
      {/* Small white icon/label box at bottom left */}
      <div className="flex items-center mt-1">
        <span className="bg-white text-gray-700 text-[9px] font-medium px-1.5 py-0.5 rounded shadow-sm inline-flex items-center gap-1">
          <MapPin size={10} className="text-gray-500" />
          <span className="truncate max-w-[60px]">{task.category}</span>
        </span>
      </div>
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
    data: { monteurId, hour, type: 'timeline-slot' },
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-w-[60px] border-r border-gray-200 flex flex-col p-1 ${
        isOver ? 'bg-blue-100' : ''
      }`}
    >
      {children}
    </div>
  );
}

// Droppable Open Orders Sidebar Component
function DroppableOpenOrdersSidebar({ children }: { children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'open-orders-sidebar',
    data: { type: 'open-orders' },
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 overflow-y-auto p-2 space-y-1 transition-colors ${
        isOver ? 'bg-blue-100' : 'bg-gray-50'
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
  const [activeTask, setActiveTask] = useState<ScheduledTask | null>(null);
  
  // Current hour state for dynamic timeline
  const [currentHour, setCurrentHour] = useState(() => new Date().getHours());
  
  // Generate dynamic time slots based on current hour
  const timeSlots = useMemo(() => generateTimeSlots(currentHour), [currentHour]);
  
  // Update current hour every minute to keep timeline fresh
  useEffect(() => {
    const interval = setInterval(() => {
      const newHour = new Date().getHours();
      if (newHour !== currentHour) {
        setCurrentHour(newHour);
      }
    }, 60000); // Check every minute
    
    return () => clearInterval(interval);
  }, [currentHour]);

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
    const activeId = active.id as string;
    
    // Check if dragging an open order
    if (activeId.startsWith('order-')) {
      const order = openOrders.find((o) => `order-${o.id}` === activeId);
      if (order) {
        setActiveOrder(order);
        setActiveTask(null);
      }
    }
    // Check if dragging a scheduled task
    else if (activeId.startsWith('task-')) {
      const task = scheduledTasks.find((t) => `task-${t.id}` === activeId);
      if (task) {
        setActiveTask(task);
        setActiveOrder(null);
      }
    }
  };

  // Handle drag end - snap to grid
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const activeId = active.id as string;
    
    // Reset drag state
    setActiveOrder(null);
    setActiveTask(null);

    if (!over) return;

    const overId = over.id as string;
    
    // Scenario 1: OpenOrder -> Timeline (existing logic)
    if (activeId.startsWith('order-') && overId.startsWith('slot-')) {
      // Parse the drop target
      const parts = overId.split('-');
      const monteurId = parts[1];
      const dropHour = parseInt(parts[2], 10);

      // Get the dragged order
      const order = openOrders.find((o) => `order-${o.id}` === activeId);
      if (!order) return;

      // The dropHour comes directly from a valid droppable time slot
      const startHour = dropHour;

      // Create new scheduled task
      const newTask: ScheduledTask = {
        id: Date.now(),
        resourceId: monteurId,
        title: order.title,
        address: order.address,
        startHour: startHour,
        duration: 2, // Default duration
        isEmergency: order.label === 'Notfall' || order.label === 'Dringend',
        category: order.category,
        originalOrderId: order.id,
        originalLabel: order.label,
      };

      // Add to scheduled tasks
      setScheduledTasks((prev) => [...prev, newTask]);

      // Remove from open orders
      setOpenOrders((prev) => prev.filter((o) => o.id !== order.id));
      return;
    }
    
    // Scenario 2: ScheduledTask -> Timeline (reassign/reschedule)
    if (activeId.startsWith('task-') && overId.startsWith('slot-')) {
      // Parse the drop target
      const parts = overId.split('-');
      const monteurId = parts[1];
      const dropHour = parseInt(parts[2], 10);

      // Get the dragged task
      const taskId = parseInt(activeId.replace('task-', ''), 10);
      const task = scheduledTasks.find((t) => t.id === taskId);
      if (!task) return;

      // Update the task with new resource and time
      setScheduledTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, resourceId: monteurId, startHour: dropHour }
            : t
        )
      );
      return;
    }
    
    // Scenario 3: ScheduledTask -> Open Orders (unschedule)
    if (activeId.startsWith('task-') && overId === 'open-orders-sidebar') {
      // Get the dragged task
      const taskId = parseInt(activeId.replace('task-', ''), 10);
      const task = scheduledTasks.find((t) => t.id === taskId);
      if (!task) return;

      // Generate a unique order ID using the task's original ID or a counter-based approach
      const orderId = task.originalOrderId ?? (1000 + openOrders.length + 1);
      
      // Create an open order from the task
      const newOrder: OpenOrder = {
        id: orderId,
        orderNumber: task.originalOrderId 
          ? `A-${new Date().getFullYear()}-${String(task.originalOrderId).padStart(3, '0')}`
          : `A-${new Date().getFullYear()}-${String(orderId).padStart(3, '0')}`,
        title: task.title,
        address: task.address,
        label: task.originalLabel || (task.isEmergency ? 'Dringend' : 'Neu'),
        category: task.category,
      };

      // Remove from scheduled tasks
      setScheduledTasks((prev) => prev.filter((t) => t.id !== taskId));

      // Add back to open orders
      setOpenOrders((prev) => [...prev, newOrder]);
      return;
    }
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
            {/* ========== LEFT COLUMN - Offene Aufträge (compact) ========== */}
            <div className="w-[220px] min-w-[220px] border-r border-gray-300 bg-white flex flex-col">
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

              {/* Orders List - Droppable for unscheduling tasks */}
              <DroppableOpenOrdersSidebar>
                {openOrders.map((order) => (
                  <DraggableOrderCard key={order.id} order={order} />
                ))}
              </DroppableOpenOrdersSidebar>
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
                  // Get tasks for this monteur
                  const monteurTasks = scheduledTasks.filter((t) => t.resourceId === monteur.id);
                  // Check if monteur has any scheduled tasks in the current view
                  const hasActiveTasks = monteurTasks.length > 0;
                  // Green background indicates the monteur is available for new assignments:
                  // - Must be marked as "free" (not on break, not off duty)
                  // - Must have no tasks scheduled in the current timeline view
                  const rowBgColor = monteur.isFree && !hasActiveTasks ? 'bg-green-50' : 'bg-white';

                  return (
                    <div
                      key={monteur.id}
                      className={`flex border-b border-gray-200 ${rowBgColor} hover:bg-opacity-80 transition-colors`}
                      style={{ minHeight: `${MIN_ROW_HEIGHT}px` }}
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

                      {/* Timeline Area with Droppable Slots containing Tasks */}
                      <div className="flex-1 flex">
                        {/* Droppable Time Slots with Tasks Rendered Inside */}
                        {timeSlots.map((hour, hourIndex) => {
                          // Auto-shift logic (Snowplow Effect):
                          // Tasks scheduled in the past are displayed at the current hour (first slot)
                          const tasksForThisCell = monteurTasks.filter((task) => {
                            const taskIsInPast = isHourInPast(task.startHour, currentHour);
                            
                            // For the first slot (current hour), collect:
                            // - Tasks scheduled for the current hour
                            // - All past tasks (shifted to current hour via snowplow effect)
                            if (hourIndex === 0) {
                              return task.startHour === hour || taskIsInPast;
                            }
                            
                            // For other slots, only show tasks that are:
                            // - Scheduled for exactly this hour
                            // - Not in the past (those are shifted to the first slot)
                            return task.startHour === hour && !taskIsInPast;
                          });

                          return (
                            <DroppableTimeSlot key={`${monteur.id}-${hour}`} monteurId={monteur.id} hour={hour}>
                              {/* Render draggable tasks stacked vertically inside the cell */}
                              {tasksForThisCell.map((task) => (
                                <DraggableScheduledTask key={task.id} task={task} />
                              ))}
                            </DroppableTimeSlot>
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
                      <span className="w-4 h-3 rounded border-l-[6px] border-l-red-600 bg-gray-300"></span>
                      <span className="text-gray-600">Auftrag</span>
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
            <div className="bg-white rounded shadow-lg p-2 border-l-4 border-black opacity-90 w-48">
              <div className="font-bold text-xs text-gray-900 mb-0.5">{activeOrder.title}</div>
              <div className="flex items-start gap-1 mb-1">
                <MapPin size={10} className="text-gray-400 mt-0.5 flex-shrink-0" />
                <span className="text-xs text-gray-500 leading-tight">{activeOrder.address}</span>
              </div>
              <span className="inline-block bg-yellow-400 text-yellow-900 text-xs font-medium px-2 py-0.5 rounded">
                {activeOrder.label}
              </span>
            </div>
          ) : activeTask ? (
            <div className="bg-gray-300 border-l-8 border-red-600 rounded shadow-lg px-3 py-2 opacity-90 w-48">
              <div className="font-semibold text-sm text-gray-800 mb-1">{activeTask.title}</div>
              <div className="flex items-start gap-1 mb-2">
                <MapPin size={12} className="text-gray-500 mt-0.5 flex-shrink-0" />
                <span className="text-xs text-gray-600 leading-tight">{activeTask.address}</span>
              </div>
              <span className="inline-block bg-white text-gray-700 text-xs font-medium px-2 py-0.5 rounded shadow-sm">
                {activeTask.category}
              </span>
            </div>
          ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
}

export default Disposition;
