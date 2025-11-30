import { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Filter,
  SortAsc,
  Map,
  Satellite,
} from 'lucide-react';
import DispositionMap from '../components/DispositionMap';
import Sidebar from '../components/Sidebar';
import { Auftrag, Monteur } from '../types/models';

// Mock data for open orders
const mockOpenOrders: Array<{
  id: number;
  type: string;
  address: string;
  orderNumber: string;
  priority: 'high' | 'normal' | 'low';
}> = [
  { id: 1, type: 'Abschleppen', address: 'Hauptstr. 12, Berlin', orderNumber: 'A-2024-001', priority: 'high' },
  { id: 2, type: 'Pannenhilfe', address: 'Bahnhofstr. 5, München', orderNumber: 'A-2024-002', priority: 'normal' },
  { id: 3, type: 'Abschleppen', address: 'Marktplatz 8, Hamburg', orderNumber: 'A-2024-003', priority: 'normal' },
  { id: 4, type: 'Transport', address: 'Industriestr. 22, Frankfurt', orderNumber: 'A-2024-004', priority: 'low' },
  { id: 5, type: 'Pannenhilfe', address: 'Königsallee 45, Düsseldorf', orderNumber: 'A-2024-005', priority: 'high' },
  { id: 6, type: 'Abschleppen', address: 'Schillerstr. 3, Stuttgart', orderNumber: 'A-2024-006', priority: 'normal' },
];

// Mock data for resources (timeline rows)
const mockResources: Array<{
  id: string;
  name: string;
  type: string;
}> = [
  { id: 'M18', name: 'M18 - LKW', type: 'truck' },
  { id: 'M23', name: 'M23 - Monteur', type: 'technician' },
  { id: 'M05', name: 'M05 - LKW', type: 'truck' },
  { id: 'M12', name: 'M12 - Monteur', type: 'technician' },
  { id: 'M31', name: 'M31 - LKW', type: 'truck' },
];

// Mock data for timeline tasks (startHour uses integer hours for consistency with timeSlots)
const mockTasks: Array<{
  id: number;
  resourceId: string;
  title: string;
  startHour: number;
  duration: number;
  color: string;
}> = [
  { id: 1, resourceId: 'M18', title: 'A-2024-010', startHour: 8, duration: 2, color: 'bg-blue-500' },
  { id: 2, resourceId: 'M18', title: 'A-2024-011', startHour: 11, duration: 1, color: 'bg-green-500' },
  { id: 3, resourceId: 'M23', title: 'A-2024-012', startHour: 9, duration: 3, color: 'bg-purple-500' },
  { id: 4, resourceId: 'M05', title: 'A-2024-013', startHour: 10, duration: 2, color: 'bg-orange-500' },
  { id: 5, resourceId: 'M05', title: 'A-2024-014', startHour: 14, duration: 2, color: 'bg-blue-500' },
  { id: 6, resourceId: 'M12', title: 'A-2024-015', startHour: 8, duration: 2, color: 'bg-green-500' },
  { id: 7, resourceId: 'M12', title: 'A-2024-016', startHour: 12, duration: 2, color: 'bg-purple-500' },
  { id: 8, resourceId: 'M31', title: 'A-2024-017', startHour: 13, duration: 3, color: 'bg-orange-500' },
];

// Time slots for the timeline (08:00 - 18:00), representing 10 hours of working time
const timeSlots = Array.from({ length: 11 }, (_, i) => i + 8);
// Timeline spans 10 hours (from 08:00 to 18:00)
const TIMELINE_HOURS = 10;

function Disposition() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  // TODO: Implement week view mode in future iteration
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  // TODO: Pass mapType to DispositionMap when satellite view is supported
  const [mapType, setMapType] = useState<'map' | 'satellite'>('map');
  const [filterOpen, setFilterOpen] = useState(false);

  // Empty arrays for map - map shows placeholder when no API key is configured
  // In production, these would be populated from API calls
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

  const getPriorityColor = (priority: 'high' | 'normal' | 'low') => {
    switch (priority) {
      case 'high':
        return 'border-l-red-500';
      case 'normal':
        return 'border-l-yellow-500';
      case 'low':
        return 'border-l-green-500';
    }
  };

  return (
    <div className="h-screen bg-gray-100 overflow-hidden">
      <Sidebar isCollapsed={isSidebarCollapsed} onToggle={toggleSidebar} />
      <div
        className={`${
          isSidebarCollapsed ? 'ml-16' : 'ml-64'
        } transition-all duration-300 ease-in-out h-screen flex flex-col`}
      >
        {/* Main 3-Column Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Column - Open Orders (~25%) */}
          <div className="w-1/4 min-w-[280px] max-w-[360px] border-r border-gray-300 bg-white flex flex-col">
            {/* Header */}
            <div className="bg-slate-800 text-white px-4 py-3 flex items-center justify-between">
              <h2 className="font-semibold text-lg">Offene Aufträge</h2>
              <span className="bg-yellow-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                {mockOpenOrders.length}
              </span>
            </div>

            {/* Filter/Sort Controls */}
            <div className="px-3 py-2 border-b border-gray-200 flex items-center gap-2">
              <button
                onClick={() => setFilterOpen(!filterOpen)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <Filter size={14} />
                Filter
              </button>
              <button className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                <SortAsc size={14} />
                Sortieren
              </button>
            </div>

            {/* Filter Panel (mockup) */}
            {filterOpen && (
              <div className="px-3 py-2 border-b border-gray-200 bg-gray-50 text-sm">
                <div className="flex flex-wrap gap-2">
                  <select className="px-2 py-1 border border-gray-300 rounded text-xs">
                    <option>Alle Typen</option>
                    <option>Abschleppen</option>
                    <option>Pannenhilfe</option>
                    <option>Transport</option>
                  </select>
                  <select className="px-2 py-1 border border-gray-300 rounded text-xs">
                    <option>Alle Prioritäten</option>
                    <option>Hoch</option>
                    <option>Normal</option>
                    <option>Niedrig</option>
                  </select>
                </div>
              </div>
            )}

            {/* Order List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {mockOpenOrders.map((order) => (
                <div
                  key={order.id}
                  className={`bg-white border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer border-l-4 ${getPriorityColor(
                    order.priority
                  )}`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-xs font-mono text-gray-500">
                      {order.orderNumber}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
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
                  <h4 className="font-semibold text-gray-800 text-sm">
                    {order.type}
                  </h4>
                  <p className="text-xs text-gray-600 mt-1">{order.address}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Middle Column - Gantt/Timeline (~45%) */}
          <div className="flex-1 min-w-[400px] border-r border-gray-300 bg-white flex flex-col">
            {/* Header with Date and View Controls */}
            <div className="bg-slate-800 text-white px-4 py-3 flex items-center justify-between">
              {/* Date Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={goToPreviousDay}
                  className="p-1.5 hover:bg-slate-700 rounded transition-colors"
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
                  className="p-1.5 hover:bg-slate-700 rounded transition-colors"
                  aria-label="Nächster Tag"
                >
                  <ChevronRight size={18} />
                </button>
                <div className="flex items-center gap-2 ml-2 px-3 py-1 bg-slate-700 rounded">
                  <Calendar size={14} />
                  <span className="text-sm">{formatDate(selectedDate)}</span>
                </div>
              </div>

              {/* View Controls */}
              <div className="flex items-center gap-1 bg-slate-700 rounded p-0.5">
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
            <div className="flex-1 overflow-auto">
              {/* Time Header */}
              <div className="flex border-b border-gray-300 bg-gray-50 sticky top-0 z-10">
                <div className="w-32 min-w-[128px] border-r border-gray-300 px-3 py-2 font-semibold text-sm text-gray-600">
                  Ressource
                </div>
                <div className="flex-1 flex">
                  {timeSlots.map((hour) => (
                    <div
                      key={hour}
                      className="flex-1 min-w-[60px] border-r border-gray-200 px-1 py-2 text-center text-xs text-gray-500"
                    >
                      {hour.toString().padStart(2, '0')}:00
                    </div>
                  ))}
                </div>
              </div>

              {/* Resource Rows */}
              {mockResources.map((resource) => (
                <div
                  key={resource.id}
                  className="flex border-b border-gray-200 hover:bg-gray-50"
                >
                  {/* Resource Name */}
                  <div className="w-32 min-w-[128px] border-r border-gray-300 px-3 py-3 flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        resource.type === 'truck'
                          ? 'bg-blue-500'
                          : 'bg-purple-500'
                      }`}
                    ></span>
                    <span className="text-sm font-medium text-gray-700 truncate">
                      {resource.name}
                    </span>
                  </div>

                  {/* Timeline Cells */}
                  <div className="flex-1 flex relative h-14">
                    {/* Grid lines */}
                    {timeSlots.map((hour) => (
                      <div
                        key={hour}
                        className="flex-1 min-w-[60px] border-r border-gray-100"
                      ></div>
                    ))}

                    {/* Task Blocks */}
                    {mockTasks
                      .filter((task) => task.resourceId === resource.id)
                      .map((task) => {
                        const left = ((task.startHour - 8) / TIMELINE_HOURS) * 100;
                        const width = (task.duration / TIMELINE_HOURS) * 100;
                        return (
                          <div
                            key={task.id}
                            className={`absolute top-1 bottom-1 ${task.color} rounded shadow-sm flex items-center justify-center text-white text-xs font-medium cursor-pointer hover:opacity-90 transition-opacity`}
                            style={{
                              left: `${left}%`,
                              width: `${width}%`,
                            }}
                            title={task.title}
                          >
                            {task.title}
                          </div>
                        );
                      })}
                  </div>
                </div>
              ))}

              {/* Legend */}
              <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
                <h4 className="text-xs font-semibold text-gray-500 mb-2">
                  Legende
                </h4>
                <div className="flex flex-wrap gap-4 text-xs">
                  <div className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded bg-blue-500"></span>
                    <span>Abschleppen</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded bg-green-500"></span>
                    <span>Pannenhilfe</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded bg-purple-500"></span>
                    <span>Transport</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded bg-orange-500"></span>
                    <span>Sonstige</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Map (~30%) */}
          <div className="w-[30%] min-w-[300px] bg-white flex flex-col">
            {/* Header with Map Controls */}
            <div className="bg-slate-800 text-white px-4 py-3 flex items-center justify-between">
              <h2 className="font-semibold text-lg">Karte</h2>
              <div className="flex items-center gap-1 bg-slate-700 rounded p-0.5">
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
  );
}

export default Disposition;
