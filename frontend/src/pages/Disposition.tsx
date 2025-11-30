import { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Truck,
  Phone,
  AlertTriangle,
} from 'lucide-react';
import DispositionMap from '../components/DispositionMap';
import Sidebar from '../components/Sidebar';
import { Auftrag, Monteur } from '../types/models';

// Type definitions for Elektro & Sanitär domain - Resource represents a Technician/Vehicle
interface Resource {
  id: string;
  vehicleId: string; // e.g., "M18"
  role: string; // e.g., "Elektriker", "Klempner"
  driverName: string; // e.g., "Marco Pfeiffer"
  hasAlert: boolean;
  specialty: 'elektro' | 'sanitär' | 'both';
}

// Task on the Gantt chart timeline
interface ScheduledTask {
  id: number;
  resourceId: string;
  title: string; // Job description, e.g., "Rohrbruch"
  address: string; // e.g., "Musterstr. 1"
  startHour: number;
  duration: number;
  isEmergency: boolean; // Red for emergencies, blue/green for standard
  category: 'elektro' | 'sanitär';
}

// Mock data for resources (Techniker/Fahrzeuge) - matching reference image style
const mockResources: Resource[] = [
  { id: 'R01', vehicleId: 'M18', role: 'Elektriker', driverName: 'Marco Pfeiffer', hasAlert: false, specialty: 'elektro' },
  { id: 'R02', vehicleId: 'M22', role: 'Klempner', driverName: 'Hans Weber', hasAlert: true, specialty: 'sanitär' },
  { id: 'R03', vehicleId: 'M15', role: 'Elektriker', driverName: 'Thomas Schmidt', hasAlert: false, specialty: 'elektro' },
  { id: 'R04', vehicleId: 'M09', role: 'Klempner', driverName: 'Peter Müller', hasAlert: false, specialty: 'sanitär' },
  { id: 'R05', vehicleId: 'M31', role: 'Monteur', driverName: 'Andreas Becker', hasAlert: true, specialty: 'both' },
  { id: 'R06', vehicleId: 'M27', role: 'Elektriker', driverName: 'Stefan Wagner', hasAlert: false, specialty: 'elektro' },
];

// Mock data for scheduled tasks - Sanitär & Elektro domain
const initialScheduledTasks: ScheduledTask[] = [
  { id: 101, resourceId: 'R01', title: 'Stromausfall', address: 'Hauptstr. 12', startHour: 8, duration: 2, isEmergency: true, category: 'elektro' },
  { id: 102, resourceId: 'R01', title: 'Steckdose defekt', address: 'Berliner Str. 5', startHour: 11, duration: 1, isEmergency: false, category: 'elektro' },
  { id: 103, resourceId: 'R02', title: 'Rohrbruch', address: 'Musterstr. 1', startHour: 9, duration: 3, isEmergency: true, category: 'sanitär' },
  { id: 104, resourceId: 'R03', title: 'Sicherung prüfen', address: 'Industrieweg 22', startHour: 10, duration: 2, isEmergency: false, category: 'elektro' },
  { id: 105, resourceId: 'R04', title: 'Wasserschaden', address: 'Parkstr. 8', startHour: 14, duration: 2, isEmergency: true, category: 'sanitär' },
  { id: 106, resourceId: 'R05', title: 'Wartung', address: 'Ringstr. 45', startHour: 8, duration: 2, isEmergency: false, category: 'elektro' },
  { id: 107, resourceId: 'R04', title: 'Heizungsausfall', address: 'Schulweg 3', startHour: 8, duration: 3, isEmergency: true, category: 'sanitär' },
  { id: 108, resourceId: 'R06', title: 'Licht Installation', address: 'Marktplatz 7', startHour: 13, duration: 2, isEmergency: false, category: 'elektro' },
];

// Time slots for the timeline - showing hours from 8 to 20 (expanded view)
const timeSlots = Array.from({ length: 13 }, (_, i) => i + 8);
// Timeline spans 12 hours (from 08:00 to 20:00)
const TIMELINE_HOURS = 12;

function Disposition() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'hours' | 'days'>('hours');
  const [groupBy, setGroupBy] = useState<'all' | 'elektro' | 'sanitär'>('all');
  
  // State for scheduled tasks
  const [scheduledTasks] = useState<ScheduledTask[]>(initialScheduledTasks);

  // Empty arrays for map - map shows placeholder when no API key is configured
  const mockOrdersForMap: Auftrag[] = [];
  const mockMonteureForMap: Monteur[] = [];

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

  // Filter resources based on group
  const filteredResources = groupBy === 'all' 
    ? mockResources 
    : mockResources.filter(r => r.specialty === groupBy || r.specialty === 'both');

  return (
    <div className="h-screen bg-gray-200 overflow-hidden">
      <Sidebar isCollapsed={isSidebarCollapsed} onToggle={toggleSidebar} />
      <div
        className={`${
          isSidebarCollapsed ? 'ml-16' : 'ml-64'
        } transition-all duration-300 ease-in-out h-screen flex flex-col`}
      >
        {/* Main 2-Column Split-View Layout - Gantt Chart (Left) + Map (Right) */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Gantt Chart (55-60% width) */}
          <div className="w-[58%] min-w-[600px] border-r border-gray-400 bg-white flex flex-col">
            {/* Gantt Header - Date selector, View options (Hours), Group dropdown */}
            <div className="bg-gray-700 text-white px-4 py-2 flex items-center justify-between">
              {/* Date Navigation */}
              <div className="flex items-center gap-2">
                <button
                  onClick={goToPreviousDay}
                  className="p-1.5 hover:bg-gray-600 rounded transition-colors"
                  aria-label="Vorheriger Tag"
                >
                  <ChevronLeft size={18} />
                </button>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-600 rounded">
                  <Calendar size={14} />
                  <span className="text-sm font-medium">{formatDate(selectedDate)}</span>
                </div>
                <button
                  onClick={goToNextDay}
                  className="p-1.5 hover:bg-gray-600 rounded transition-colors"
                  aria-label="Nächster Tag"
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              {/* View Mode Toggle + Group Dropdown */}
              <div className="flex items-center gap-3">
                {/* View Mode Toggle (Hours) */}
                <div className="flex items-center gap-1 bg-gray-600 rounded p-0.5">
                  <button
                    onClick={() => setViewMode('hours')}
                    className={`px-3 py-1 text-sm rounded transition-colors ${
                      viewMode === 'hours'
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:text-white'
                    }`}
                  >
                    Stunden
                  </button>
                  <button
                    onClick={() => setViewMode('days')}
                    className={`px-3 py-1 text-sm rounded transition-colors ${
                      viewMode === 'days'
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:text-white'
                    }`}
                  >
                    Tage
                  </button>
                </div>

                {/* Group Dropdown */}
                <select
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value as 'all' | 'elektro' | 'sanitär')}
                  className="px-3 py-1.5 text-sm bg-gray-600 text-white border border-gray-500 rounded cursor-pointer hover:bg-gray-500 transition-colors"
                >
                  <option value="all">Gruppe: Alle</option>
                  <option value="elektro">Gruppe: Elektro</option>
                  <option value="sanitär">Gruppe: Sanitär</option>
                </select>
              </div>
            </div>

            {/* Gantt Chart Content */}
            <div className="flex-1 overflow-auto bg-gray-100">
              {/* Time Header Row */}
              <div className="flex border-b border-gray-300 bg-gray-200 sticky top-0 z-10">
                {/* Resource Column Header */}
                <div className="w-48 min-w-[192px] border-r border-gray-300 px-2 py-2 flex items-center">
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Techniker / Fahrzeug
                  </span>
                </div>
                {/* Timeline Hours */}
                <div className="flex-1 flex">
                  {timeSlots.map((hour) => (
                    <div
                      key={hour}
                      className="flex-1 min-w-[50px] border-r border-gray-300 py-2 text-center text-xs font-medium text-gray-600"
                    >
                      {hour}
                    </div>
                  ))}
                </div>
              </div>

              {/* Resource Rows */}
              {filteredResources.map((resource) => (
                <div
                  key={resource.id}
                  className="flex border-b border-gray-200 bg-white hover:bg-gray-50 transition-colors"
                >
                  {/* Resource Header Cell - Matching reference image style */}
                  <div className="w-48 min-w-[192px] border-r border-gray-300 px-2 py-2 bg-gray-50">
                    {/* Top Row: ID */}
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-gray-800">
                        {resource.vehicleId}
                      </span>
                      {resource.hasAlert && (
                        <AlertTriangle size={14} className="text-amber-500" />
                      )}
                    </div>
                    
                    {/* Middle Row: ID + Details with Icons */}
                    <div className="flex items-center gap-1 mb-1.5">
                      <span className="text-xs text-gray-600">
                        {resource.vehicleId} - {resource.role}
                      </span>
                      <div className="flex items-center gap-0.5 ml-auto">
                        <Truck size={12} className="text-gray-400" />
                        <Phone size={12} className="text-gray-400" />
                      </div>
                    </div>
                    
                    {/* Bottom Row: Driver Name in Dark Grey Badge */}
                    <div className="inline-block bg-gray-700 text-white text-xs px-2 py-0.5 rounded">
                      {resource.driverName}
                    </div>
                  </div>

                  {/* Timeline Area with Task Bars */}
                  <div className="flex-1 flex relative" style={{ minHeight: '72px' }}>
                    {/* Grid Lines */}
                    {timeSlots.map((hour) => (
                      <div
                        key={hour}
                        className="flex-1 min-w-[50px] border-r border-gray-100"
                      />
                    ))}

                    {/* Task Bars */}
                    {scheduledTasks
                      .filter((task) => task.resourceId === resource.id)
                      .map((task) => {
                        const left = ((task.startHour - 8) / TIMELINE_HOURS) * 100;
                        const width = (task.duration / TIMELINE_HOURS) * 100;
                        
                        // Red for emergencies, Blue/Green for standard
                        const bgColor = task.isEmergency 
                          ? 'bg-red-500' 
                          : task.category === 'elektro' 
                            ? 'bg-blue-500' 
                            : 'bg-green-500';
                        
                        return (
                          <div
                            key={task.id}
                            className={`absolute top-2 bottom-2 ${bgColor} rounded shadow-md flex flex-col justify-center px-2 text-white text-xs cursor-pointer hover:opacity-90 transition-opacity overflow-hidden`}
                            style={{
                              left: `${left}%`,
                              width: `${width}%`,
                              minWidth: '60px',
                            }}
                            title={`${task.title}, ${task.address}`}
                          >
                            <span className="font-medium truncate">{task.title}</span>
                            <span className="text-[10px] opacity-90 truncate">{task.address}</span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              ))}

              {/* Legend */}
              <div className="px-4 py-3 border-t border-gray-300 bg-gray-200">
                <h4 className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                  Legende - Auftragstypen
                </h4>
                <div className="flex flex-wrap gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-red-500"></span>
                    <span className="text-gray-700">Notfall / Dringend</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-blue-500"></span>
                    <span className="text-gray-700">Elektro</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-green-500"></span>
                    <span className="text-gray-700">Sanitär</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Map (40-45% width) */}
          <div className="flex-1 min-w-[300px] bg-white flex flex-col">
            {/* Map Header */}
            <div className="bg-gray-700 text-white px-4 py-2 flex items-center justify-between">
              <h2 className="font-semibold text-sm">Karte - Techniker Standorte</h2>
            </div>

            {/* Map Content - Full Height */}
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
