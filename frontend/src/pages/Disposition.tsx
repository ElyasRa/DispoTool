import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  DragEndEvent,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Filter,
  SortAsc,
  Map,
  Satellite,
  Droplet,
  Zap,
  Flame,
  AlertTriangle,
  Clock,
  MapPin,
} from 'lucide-react';
import DispositionMap from '../components/DispositionMap';
import Sidebar from '../components/Sidebar';
import { Auftrag, Monteur } from '../types/models';

// Type definitions for Elektro & Sanitär domain
interface OpenOrder {
  id: number;
  type: 'Wasserrohrbruch' | 'Sicherung defekt' | 'Heizungsausfall' | 'Notdienst' | 'Rohrinstallation' | 'Steckdose/Schalter';
  category: 'elektro' | 'sanitär';
  address: string;
  orderNumber: string;
  priority: 'high' | 'normal' | 'low';
  customerName: string;
  estimatedDuration: number; // in hours
}

interface Technician {
  id: string;
  name: string;
  specialty: 'elektro' | 'sanitär' | 'both';
}

interface ScheduledTask {
  id: number;
  resourceId: string;
  orderId: number | null; // null for pre-existing legacy tasks
  title: string;
  type: string;
  startHour: number;
  duration: number;
  color: string;
}

// Counter for generating unique task IDs
let taskIdCounter = 1000;

// Mock data for open orders - Elektro & Sanitär domain
const initialOpenOrders: OpenOrder[] = [
  { id: 1, type: 'Wasserrohrbruch', category: 'sanitär', address: 'Hauptstr. 12, Berlin', orderNumber: 'E-2024-001', priority: 'high', customerName: 'Fam. Schneider', estimatedDuration: 2 },
  { id: 2, type: 'Sicherung defekt', category: 'elektro', address: 'Bahnhofstr. 5, München', orderNumber: 'E-2024-002', priority: 'normal', customerName: 'Hr. Weber', estimatedDuration: 1 },
  { id: 3, type: 'Heizungsausfall', category: 'sanitär', address: 'Marktplatz 8, Hamburg', orderNumber: 'E-2024-003', priority: 'high', customerName: 'Fr. Müller', estimatedDuration: 3 },
  { id: 4, type: 'Steckdose/Schalter', category: 'elektro', address: 'Industriestr. 22, Frankfurt', orderNumber: 'E-2024-004', priority: 'low', customerName: 'Fa. Schmidt GmbH', estimatedDuration: 2 },
  { id: 5, type: 'Notdienst', category: 'sanitär', address: 'Königsallee 45, Düsseldorf', orderNumber: 'E-2024-005', priority: 'high', customerName: 'Hr. Fischer', estimatedDuration: 1 },
  { id: 6, type: 'Rohrinstallation', category: 'sanitär', address: 'Schillerstr. 3, Stuttgart', orderNumber: 'E-2024-006', priority: 'normal', customerName: 'Fam. Braun', estimatedDuration: 2 },
];

// Mock data for technicians (Techniker/Monteure)
const mockTechnicians: Technician[] = [
  { id: 'T01', name: 'M. Müller (Elektro)', specialty: 'elektro' },
  { id: 'T02', name: 'K. Schulze (Sanitär)', specialty: 'sanitär' },
  { id: 'T03', name: 'P. Wagner (Elektro)', specialty: 'elektro' },
  { id: 'T04', name: 'S. Hoffmann (Sanitär)', specialty: 'sanitär' },
  { id: 'T05', name: 'A. Becker (Allrounder)', specialty: 'both' },
];

// Mock data for scheduled tasks (initially scheduled Einsätze - legacy tasks with null orderId)
const initialScheduledTasks: ScheduledTask[] = [
  { id: 101, resourceId: 'T01', orderId: null, title: 'E-2024-010', type: 'Steckdose/Schalter', startHour: 8, duration: 2, color: 'bg-purple-500' },
  { id: 102, resourceId: 'T01', orderId: null, title: 'E-2024-011', type: 'Sicherung defekt', startHour: 11, duration: 1, color: 'bg-purple-500' },
  { id: 103, resourceId: 'T02', orderId: null, title: 'E-2024-012', type: 'Rohrinstallation', startHour: 9, duration: 3, color: 'bg-cyan-500' },
  { id: 104, resourceId: 'T03', orderId: null, title: 'E-2024-013', type: 'Sicherung defekt', startHour: 10, duration: 2, color: 'bg-purple-500' },
  { id: 105, resourceId: 'T04', orderId: null, title: 'E-2024-014', type: 'Wasserrohrbruch', startHour: 14, duration: 2, color: 'bg-cyan-500' },
  { id: 106, resourceId: 'T05', orderId: null, title: 'E-2024-015', type: 'Steckdose/Schalter', startHour: 8, duration: 2, color: 'bg-purple-500' },
];

// Time slots for the timeline (08:00 - 18:00), representing 10 hours of working time
const timeSlots = Array.from({ length: 11 }, (_, i) => i + 8);
// Timeline spans 10 hours (from 08:00 to 18:00)
const TIMELINE_HOURS = 10;

// Draggable Order Card Component
function DraggableOrderCard({ order }: { order: OpenOrder }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `order-${order.id}`,
    data: { order },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: isDragging ? 1000 : 'auto',
      }
    : undefined;

  const getTypeIcon = () => {
    switch (order.type) {
      case 'Wasserrohrbruch':
        return <Droplet size={16} className="text-cyan-600" />;
      case 'Sicherung defekt':
        return <Zap size={16} className="text-purple-600" />;
      case 'Heizungsausfall':
        return <Flame size={16} className="text-orange-600" />;
      case 'Notdienst':
        return <AlertTriangle size={16} className="text-red-600" />;
      case 'Rohrinstallation':
        return <Droplet size={16} className="text-cyan-600" />;
      case 'Steckdose/Schalter':
        return <Zap size={16} className="text-purple-600" />;
      default:
        // Fallback based on category, with final fallback for unknown values
        if (order.category === 'elektro') {
          return <Zap size={16} className="text-purple-600" />;
        } else if (order.category === 'sanitär') {
          return <Droplet size={16} className="text-cyan-600" />;
        }
        // Final fallback for completely unknown types/categories
        return <AlertTriangle size={16} className="text-gray-500" />;
    }
  };

  const getPriorityColor = () => {
    switch (order.priority) {
      case 'high':
        return 'border-l-red-500 bg-red-50/30';
      case 'normal':
        return 'border-l-yellow-500';
      case 'low':
        return 'border-l-green-500';
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`bg-white border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing border-l-4 ${getPriorityColor()} ${
        isDragging ? 'opacity-50 shadow-lg scale-105' : ''
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          {getTypeIcon()}
          <span className="text-xs font-mono text-gray-500">
            {order.orderNumber}
          </span>
        </div>
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            order.priority === 'high'
              ? 'bg-red-100 text-red-700'
              : order.priority === 'normal'
              ? 'bg-yellow-100 text-yellow-700'
              : 'bg-green-100 text-green-700'
          }`}
        >
          {order.priority === 'high'
            ? 'Dringend'
            : order.priority === 'normal'
            ? 'Normal'
            : 'Niedrig'}
        </span>
      </div>
      <h4 className="font-bold text-gray-800 text-sm mb-1">
        {order.type}
      </h4>
      <p className="text-xs text-gray-700 font-medium">{order.customerName}</p>
      <div className="flex items-center gap-1 mt-1.5">
        <MapPin size={12} className="text-gray-400" />
        <p className="text-xs text-gray-600">{order.address}</p>
      </div>
      <div className="flex items-center gap-1 mt-1">
        <Clock size={12} className="text-gray-400" />
        <p className="text-xs text-gray-500">~{order.estimatedDuration}h</p>
      </div>
    </div>
  );
}

// Droppable Timeline Cell Component
function DroppableTimeSlot({ 
  technicianId, 
  hour,
  isOver 
}: { 
  technicianId: string; 
  hour: number;
  isOver?: boolean;
}) {
  const { setNodeRef, isOver: isOverCurrent } = useDroppable({
    id: `slot-${technicianId}-${hour}`,
    data: { technicianId, hour },
  });

  const highlighted = isOver || isOverCurrent;

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-w-[60px] border-r border-gray-100 transition-colors ${
        highlighted ? 'bg-blue-100' : ''
      }`}
    />
  );
}

function Disposition() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [mapType, setMapType] = useState<'map' | 'satellite'>('map');
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState<'all' | 'elektro' | 'sanitär'>('all');
  
  // State for orders and scheduled tasks (drag-and-drop)
  const [openOrders, setOpenOrders] = useState<OpenOrder[]>(initialOpenOrders);
  const [scheduledTasks, setScheduledTasks] = useState<ScheduledTask[]>(initialScheduledTasks);
  const [activeOrder, setActiveOrder] = useState<OpenOrder | null>(null);

  // Empty arrays for map - map shows placeholder when no API key is configured
  const mockOrdersForMap: Auftrag[] = [];
  const mockMonteureForMap: Monteur[] = [];

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => !prev);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('de-DE', {
      weekday: 'short',
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

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  // Filter orders based on category
  const filteredOrders = filterCategory === 'all' 
    ? openOrders 
    : openOrders.filter(o => o.category === filterCategory);

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const order = active.data.current?.order as OpenOrder | undefined;
    if (order) {
      setActiveOrder(order);
    }
  };

  // Handle drag end - drop order onto timeline
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveOrder(null);

    if (!over) return;

    const orderId = active.id.toString().replace('order-', '');
    const order = openOrders.find(o => o.id === parseInt(orderId));
    
    if (!order) return;

    // Check if dropped on a time slot
    const overId = over.id.toString();
    if (overId.startsWith('slot-')) {
      const [, technicianId, hourStr] = overId.split('-');
      const hour = parseInt(hourStr);
      
      // Check technician compatibility
      const technician = mockTechnicians.find(t => t.id === technicianId);
      if (!technician) return;
      
      // Check if technician can handle this type of order
      if (technician.specialty !== 'both' && technician.specialty !== order.category) {
        // Could show a toast/notification here - for now just don't allow
        return;
      }

      // Check for time slot conflicts
      const hasConflict = scheduledTasks.some(task => {
        if (task.resourceId !== technicianId) return false;
        const taskEnd = task.startHour + task.duration;
        const newEnd = hour + order.estimatedDuration;
        return !(newEnd <= task.startHour || hour >= taskEnd);
      });

      if (hasConflict) return;

      // Create new scheduled task with unique counter-based ID
      const newTaskId = ++taskIdCounter;
      const newTask: ScheduledTask = {
        id: newTaskId,
        resourceId: technicianId,
        orderId: order.id,
        title: order.orderNumber,
        type: order.type,
        startHour: hour,
        duration: order.estimatedDuration,
        color: order.category === 'elektro' ? 'bg-purple-500' : 'bg-cyan-500',
      };

      // Update state
      setScheduledTasks(prev => [...prev, newTask]);
      setOpenOrders(prev => prev.filter(o => o.id !== order.id));
    }
  };

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="h-screen bg-gray-200 overflow-hidden">
        <Sidebar isCollapsed={isSidebarCollapsed} onToggle={toggleSidebar} />
        <div
          className={`${
            isSidebarCollapsed ? 'ml-16' : 'ml-64'
          } transition-all duration-300 ease-in-out h-screen flex flex-col`}
        >
          {/* Main 3-Column Layout - Control Center Style */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left Column - Offene Aufträge (20%) */}
            <div className="w-[20%] min-w-[260px] max-w-[320px] border-r border-gray-400 bg-gray-100 flex flex-col">
              {/* Header */}
              <div className="bg-gray-700 text-white px-4 py-3 flex items-center justify-between">
                <h2 className="font-semibold text-base">Offene Aufträge</h2>
                <span className="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                  {filteredOrders.length}
                </span>
              </div>

              {/* Filter/Sort Controls */}
              <div className="px-3 py-2 border-b border-gray-300 bg-gray-50 flex items-center gap-2">
                <button
                  onClick={() => setFilterOpen(!filterOpen)}
                  className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    filterOpen ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  <Filter size={14} />
                  Filter
                </button>
                <button className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                  <SortAsc size={14} />
                  Sortieren
                </button>
              </div>

              {/* Filter Panel */}
              {filterOpen && (
                <div className="px-3 py-2 border-b border-gray-300 bg-gray-50 text-sm">
                  <div className="flex flex-wrap gap-2">
                    <select 
                      className="px-2 py-1 border border-gray-300 rounded text-xs bg-white"
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value as 'all' | 'elektro' | 'sanitär')}
                    >
                      <option value="all">Alle Gewerke</option>
                      <option value="elektro">Elektro</option>
                      <option value="sanitär">Sanitär</option>
                    </select>
                    <select className="px-2 py-1 border border-gray-300 rounded text-xs bg-white">
                      <option>Alle Prioritäten</option>
                      <option>Dringend</option>
                      <option>Normal</option>
                      <option>Niedrig</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Order List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-100">
                {filteredOrders.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <p className="text-sm">Keine offenen Aufträge</p>
                  </div>
                ) : (
                  filteredOrders.map((order) => (
                    <DraggableOrderCard key={order.id} order={order} />
                  ))
                )}
              </div>
            </div>

            {/* Middle Column - Gantt/Timeline (50%) */}
            <div className="flex-1 min-w-[500px] border-r border-gray-400 bg-white flex flex-col" style={{ width: '50%' }}>
              {/* Header with Date and View Controls */}
              <div className="bg-gray-700 text-white px-4 py-3 flex items-center justify-between">
                {/* Date Controls */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={goToPreviousDay}
                    className="p-1.5 hover:bg-gray-600 rounded transition-colors"
                    aria-label="Vorheriger Tag"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    onClick={goToToday}
                    className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 rounded transition-colors"
                  >
                    Heute
                  </button>
                  <button
                    onClick={goToNextDay}
                    className="p-1.5 hover:bg-gray-600 rounded transition-colors"
                    aria-label="Nächster Tag"
                  >
                    <ChevronRight size={18} />
                  </button>
                  <div className="flex items-center gap-2 ml-2 px-3 py-1 bg-gray-600 rounded">
                    <Calendar size={14} />
                    <span className="text-sm font-medium">{formatDate(selectedDate)}</span>
                  </div>
                </div>

                {/* View Controls */}
                <div className="flex items-center gap-1 bg-gray-600 rounded p-0.5">
                  <button
                    onClick={() => setViewMode('day')}
                    className={`px-3 py-1 text-sm rounded transition-colors ${
                      viewMode === 'day'
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:text-white'
                    }`}
                  >
                    Tag
                  </button>
                  <button
                    onClick={() => setViewMode('week')}
                    className={`px-3 py-1 text-sm rounded transition-colors ${
                      viewMode === 'week'
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:text-white'
                    }`}
                  >
                    Woche
                  </button>
                </div>
              </div>

              {/* Timeline Content */}
              <div className="flex-1 overflow-auto bg-white">
                {/* Time Header */}
                <div className="flex border-b border-gray-400 bg-gray-200 sticky top-0 z-10">
                  <div className="w-40 min-w-[160px] border-r border-gray-400 px-3 py-2 font-semibold text-sm text-gray-700">
                    Techniker / Monteur
                  </div>
                  <div className="flex-1 flex">
                    {timeSlots.map((hour) => (
                      <div
                        key={hour}
                        className="flex-1 min-w-[60px] border-r border-gray-300 px-1 py-2 text-center text-xs font-medium text-gray-600"
                      >
                        {hour.toString().padStart(2, '0')}:00
                      </div>
                    ))}
                  </div>
                </div>

                {/* Technician Rows */}
                {mockTechnicians.map((technician) => (
                  <div
                    key={technician.id}
                    className="flex border-b border-gray-200 hover:bg-gray-50"
                  >
                    {/* Technician Name */}
                    <div className="w-40 min-w-[160px] border-r border-gray-300 px-3 py-3 flex items-center gap-2 bg-gray-50">
                      <span
                        className={`w-3 h-3 rounded-full ${
                          technician.specialty === 'elektro'
                            ? 'bg-purple-500'
                            : technician.specialty === 'sanitär'
                            ? 'bg-cyan-500'
                            : 'bg-gradient-to-r from-purple-500 to-cyan-500'
                        }`}
                      ></span>
                      <span className="text-sm font-medium text-gray-700 truncate">
                        {technician.name}
                      </span>
                    </div>

                    {/* Timeline Cells with Droppable Slots */}
                    <div className="flex-1 flex relative h-14">
                      {/* Droppable Grid lines */}
                      {timeSlots.map((hour) => (
                        <DroppableTimeSlot 
                          key={hour} 
                          technicianId={technician.id} 
                          hour={hour} 
                        />
                      ))}

                      {/* Task Blocks */}
                      {scheduledTasks
                        .filter((task) => task.resourceId === technician.id)
                        .map((task) => {
                          const left = ((task.startHour - 8) / TIMELINE_HOURS) * 100;
                          const width = (task.duration / TIMELINE_HOURS) * 100;
                          return (
                            <div
                              key={task.id}
                              className={`absolute top-1 bottom-1 ${task.color} rounded shadow-md flex items-center justify-center text-white text-xs font-medium cursor-pointer hover:opacity-90 transition-opacity border border-white/20`}
                              style={{
                                left: `${left}%`,
                                width: `${width}%`,
                              }}
                              title={`${task.title} - ${task.type}`}
                            >
                              <span className="truncate px-1">{task.title}</span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                ))}

                {/* Legend */}
                <div className="px-4 py-3 border-t border-gray-300 bg-gray-100">
                  <h4 className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                    Legende - Einsatztypen
                  </h4>
                  <div className="flex flex-wrap gap-4 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-purple-500"></span>
                      <span className="text-gray-700">Elektro</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-cyan-500"></span>
                      <span className="text-gray-700">Sanitär</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-red-500"></span>
                      <span className="text-gray-700">Notdienst</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-orange-500"></span>
                      <span className="text-gray-700">Heizung</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Map (30%) */}
            <div className="w-[30%] min-w-[280px] bg-white flex flex-col">
              {/* Header with Map Controls */}
              <div className="bg-gray-700 text-white px-4 py-3 flex items-center justify-between">
                <h2 className="font-semibold text-base">Karte</h2>
                <div className="flex items-center gap-1 bg-gray-600 rounded p-0.5">
                  <button
                    onClick={() => setMapType('map')}
                    className={`flex items-center gap-1 px-2 py-1 text-sm rounded transition-colors ${
                      mapType === 'map'
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:text-white'
                    }`}
                  >
                    <Map size={14} />
                    Karte
                  </button>
                  <button
                    onClick={() => setMapType('satellite')}
                    className={`flex items-center gap-1 px-2 py-1 text-sm rounded transition-colors ${
                      mapType === 'satellite'
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:text-white'
                    }`}
                  >
                    <Satellite size={14} />
                    Satellit
                  </button>
                </div>
              </div>

              {/* Map Content */}
              <div className="flex-1">
                <DispositionMap
                  orders={mockOrdersForMap}
                  monteure={mockMonteureForMap}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeOrder ? (
          <div className="bg-white border border-gray-300 rounded-lg p-3 shadow-xl border-l-4 border-l-blue-500 opacity-90 w-64">
            <div className="flex items-center gap-2 mb-1">
              {activeOrder.category === 'elektro' ? (
                <Zap size={16} className="text-purple-600" />
              ) : (
                <Droplet size={16} className="text-cyan-600" />
              )}
              <span className="text-xs font-mono text-gray-500">
                {activeOrder.orderNumber}
              </span>
            </div>
            <h4 className="font-bold text-gray-800 text-sm">{activeOrder.type}</h4>
            <p className="text-xs text-gray-600">{activeOrder.customerName}</p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

export default Disposition;
