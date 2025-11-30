import { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Truck,
  MapPin,
  ChevronDown,
  Search,
} from 'lucide-react';
import DispositionMap from '../components/DispositionMap';
import Sidebar from '../components/Sidebar';
import { Auftrag, Monteur } from '../types/models';

// Type definitions for Elektro & Sanitär domain - Resource represents a Technician/Vehicle
interface Resource {
  id: string;
  vehicleId: string; // e.g., "T-18"
  role: string; // e.g., "Elektriker", "Klempner"
  driverName: string; // e.g., "Marco Pfeiffer"
  status: string; // e.g., "(P) Am Einsatzort"
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
  isEmergency: boolean; // Red for emergencies, blue for standard
  category: 'elektro' | 'sanitär';
}

// Open Order for left column
interface OpenOrder {
  id: number;
  orderNumber: string;
  title: string;
  address: string;
  scheduledTime: string; // e.g., "30.11.2025 21:00"
  isFlexible: boolean; // "Termin nach Absprache" - dashed border
  category: 'elektro' | 'sanitär';
}

// Mock data for resources (Techniker/Fahrzeuge) - matching reference image style
const mockResources: Resource[] = [
  { id: 'R01', vehicleId: 'T-18', role: 'Elektro', driverName: 'Marco Pfeiffer', status: '(P) Am Einsatzort', specialty: 'elektro' },
  { id: 'R02', vehicleId: 'T-22', role: 'Sanitär', driverName: 'Hans Weber', status: '(P) Unterwegs', specialty: 'sanitär' },
  { id: 'R03', vehicleId: 'T-15', role: 'Elektro', driverName: 'Thomas Schmidt', status: '(P) Verfügbar', specialty: 'elektro' },
  { id: 'R04', vehicleId: 'T-09', role: 'Sanitär', driverName: 'Peter Müller', status: '(P) Am Einsatzort', specialty: 'sanitär' },
  { id: 'R05', vehicleId: 'T-31', role: 'Monteur', driverName: 'Andreas Becker', status: '(P) Pause', specialty: 'both' },
  { id: 'R06', vehicleId: 'T-27', role: 'Elektro', driverName: 'Stefan Wagner', status: '(P) Verfügbar', specialty: 'elektro' },
];

// Mock data for scheduled tasks - Sanitär & Elektro domain
const initialScheduledTasks: ScheduledTask[] = [
  { id: 101, resourceId: 'R01', title: 'Stromausfall', address: 'Hauptstr. 12', startHour: 19, duration: 2, isEmergency: true, category: 'elektro' },
  { id: 102, resourceId: 'R01', title: 'Steckdose defekt', address: 'Berliner Str. 5', startHour: 22, duration: 1, isEmergency: false, category: 'elektro' },
  { id: 103, resourceId: 'R02', title: 'Rohrbruch', address: 'Musterstr. 1', startHour: 20, duration: 3, isEmergency: true, category: 'sanitär' },
  { id: 104, resourceId: 'R03', title: 'Sicherung prüfen', address: 'Industrieweg 22', startHour: 21, duration: 2, isEmergency: false, category: 'elektro' },
  { id: 105, resourceId: 'R04', title: 'Wasserschaden', address: 'Parkstr. 8', startHour: 23, duration: 2, isEmergency: true, category: 'sanitär' },
  { id: 106, resourceId: 'R05', title: 'Wartung', address: 'Ringstr. 45', startHour: 19, duration: 2, isEmergency: false, category: 'elektro' },
  { id: 107, resourceId: 'R04', title: 'Heizungsausfall', address: 'Schulweg 3', startHour: 19, duration: 3, isEmergency: true, category: 'sanitär' },
  { id: 108, resourceId: 'R06', title: 'Licht Installation', address: 'Marktplatz 7', startHour: 24, duration: 2, isEmergency: false, category: 'elektro' },
];

// Mock data for open orders (left column)
const mockOpenOrders: OpenOrder[] = [
  { id: 1, orderNumber: '123', title: 'Rohrbruch, Termin...', address: 'Musterstraße 15, 12345 Berlin', scheduledTime: '30.11.2025 21:00', isFlexible: false, category: 'sanitär' },
  { id: 2, orderNumber: '124', title: 'Heizung defekt', address: 'Hauptstraße 22, 12345 Berlin', scheduledTime: '30.11.2025 21:00', isFlexible: false, category: 'sanitär' },
  { id: 3, orderNumber: '125', title: 'Stromausfall prüfen', address: 'Berliner Str. 8, 10115 Berlin', scheduledTime: '30.11.2025 22:00', isFlexible: false, category: 'elektro' },
  { id: 4, orderNumber: '126', title: 'Wasserschaden Bad', address: 'Parkweg 3, 10117 Berlin', scheduledTime: '30.11.2025 22:00', isFlexible: true, category: 'sanitär' },
  { id: 5, orderNumber: '127', title: 'Sicherungskasten', address: 'Industriestr. 44, 10119 Berlin', scheduledTime: '01.12.2025 08:00', isFlexible: false, category: 'elektro' },
  { id: 6, orderNumber: '128', title: 'Leitungsbruch', address: 'Schulweg 12, 10115 Berlin', scheduledTime: '01.12.2025 08:00', isFlexible: true, category: 'sanitär' },
  { id: 7, orderNumber: '129', title: 'Steckdose Installation', address: 'Marktplatz 7, 10117 Berlin', scheduledTime: '01.12.2025 09:00', isFlexible: false, category: 'elektro' },
  { id: 8, orderNumber: '130', title: 'WC verstopft', address: 'Ringstraße 55, 10119 Berlin', scheduledTime: '01.12.2025 10:00', isFlexible: false, category: 'sanitär' },
  { id: 9, orderNumber: '131', title: 'Lampe montieren', address: 'Bergstraße 9, 10115 Berlin', scheduledTime: '01.12.2025 11:00', isFlexible: true, category: 'elektro' },
  { id: 10, orderNumber: '132', title: 'Therme Wartung', address: 'Waldweg 2, 10117 Berlin', scheduledTime: '01.12.2025 12:00', isFlexible: false, category: 'sanitär' },
  { id: 11, orderNumber: '133', title: 'Kurzschluss', address: 'Bahnhofstr. 18, 10119 Berlin', scheduledTime: '01.12.2025 14:00', isFlexible: false, category: 'elektro' },
  { id: 12, orderNumber: '134', title: 'Abfluss verstopft', address: 'Seestraße 33, 10115 Berlin', scheduledTime: '01.12.2025 15:00', isFlexible: false, category: 'sanitär' },
  { id: 13, orderNumber: '135', title: 'Schalter defekt', address: 'Kirchplatz 5, 10117 Berlin', scheduledTime: '01.12.2025 16:00', isFlexible: true, category: 'elektro' },
];

// Time slots for the timeline - showing hours from 19 to 26 (next day 02:00)
const timeSlots = [19, 20, 21, 22, 23, 24, 25, 26];
// Timeline starts at hour 19
const TIMELINE_START_HOUR = 19;
// Timeline spans 8 hours
const TIMELINE_HOURS = 8;

function Disposition() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'hours' | 'days'>('hours');
  const [groupBy, setGroupBy] = useState<'all' | 'elektro' | 'sanitär'>('all');
  const [mapType, setMapType] = useState<'karte' | 'satellit'>('karte');
  
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

  // Group open orders by scheduled time
  const groupedOrders = mockOpenOrders.reduce((acc, order) => {
    if (!acc[order.scheduledTime]) {
      acc[order.scheduledTime] = [];
    }
    acc[order.scheduledTime].push(order);
    return acc;
  }, {} as Record<string, OpenOrder[]>);

  return (
    <div className="h-screen bg-gray-200 overflow-hidden">
      <Sidebar isCollapsed={isSidebarCollapsed} onToggle={toggleSidebar} />
      <div
        className={`${
          isSidebarCollapsed ? 'ml-16' : 'ml-64'
        } transition-all duration-300 ease-in-out h-screen flex flex-col`}
      >
        {/* Main 3-Column Split-View Layout */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left Column - Offene Aufträge (20-25% width) */}
          <div className="w-[22%] min-w-[280px] border-r border-gray-300 bg-gray-100 flex flex-col">
            {/* Header with Counter */}
            <div className="bg-gray-700 text-white px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-sm">Offene Aufträge</h2>
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {mockOpenOrders.length}
                </span>
              </div>
            </div>

            {/* Filters */}
            <div className="p-3 border-b border-gray-300 bg-white space-y-2">
              {/* Filialfilter Dropdown */}
              <div className="relative">
                <button className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-100">
                  <span>Filialfilter</span>
                  <ChevronDown size={16} />
                </button>
              </div>
              {/* Suche Dropdown */}
              <div className="relative">
                <div className="flex items-center px-3 py-2 bg-gray-50 border border-gray-300 rounded text-sm text-gray-700">
                  <Search size={16} className="mr-2 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Suche..." 
                    className="bg-transparent outline-none flex-1 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Orders List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              {Object.entries(groupedOrders).map(([time, orders]) => (
                <div key={time}>
                  {/* Time Group Header */}
                  <div className="text-xs font-semibold text-gray-500 mb-2">{time}</div>
                  
                  {/* Order Cards */}
                  <div className="space-y-2">
                    {orders.map((order) => (
                      <div
                        key={order.id}
                        className={`bg-white rounded shadow-sm p-3 cursor-pointer hover:shadow-md transition-shadow ${
                          order.isFlexible 
                            ? 'border-l-4 border-dashed border-gray-400' 
                            : 'border-l-4 border-black'
                        }`}
                      >
                        {/* Pin Icon + Title */}
                        <div className="flex items-start gap-2 mb-1">
                          <MapPin size={14} className="text-gray-500 mt-0.5 flex-shrink-0" />
                          <span className="font-semibold text-sm text-gray-800 leading-tight">
                            {order.title}
                          </span>
                        </div>
                        
                        {/* Address */}
                        <div className="text-xs text-gray-500 ml-6 mb-2">
                          {order.address}
                        </div>
                        
                        {/* Order Label */}
                        <div className="ml-6">
                          <span className="inline-block bg-yellow-400 text-yellow-900 text-xs font-medium px-2 py-0.5 rounded">
                            Auftrag #{order.orderNumber}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Center Column - Gantt Chart / Resource Planer (45-50% width) */}
          <div className="w-[45%] min-w-[500px] border-r border-gray-300 bg-white flex flex-col">
            {/* Gantt Header - Date selector, Hour selector, Group dropdown */}
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
                <div className="w-52 min-w-[208px] border-r border-gray-300 px-2 py-2 flex items-center">
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
                      {hour > 24 ? hour - 24 : hour}
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
                  <div className="w-52 min-w-[208px] border-r border-gray-300 bg-gray-50 flex flex-col">
                    {/* Top content area */}
                    <div className="flex-1 px-3 py-2">
                      {/* Top Row: ID with role */}
                      <div className="text-xs font-bold text-gray-800 mb-1">
                        {resource.vehicleId} - {resource.role}
                      </div>
                      
                      {/* Icons Row - Two green icons */}
                      <div className="flex items-center gap-2 mb-1.5">
                        <Truck size={14} className="text-green-500" />
                        <MapPin size={14} className="text-green-500" />
                      </div>
                      
                      {/* Status Badge - Red background */}
                      <div className="mb-1.5">
                        <span className="inline-block bg-red-600 text-white text-[10px] px-2 py-0.5 rounded">
                          {resource.status}
                        </span>
                      </div>
                      
                      {/* Action Link - Blue text */}
                      <div>
                        <button className="text-blue-600 text-xs hover:underline">
                          Fahrzeit anzeigen
                        </button>
                      </div>
                    </div>
                    
                    {/* Bottom: Grey Name Box - Stuck to bottom */}
                    <div className="bg-gray-600 text-white text-xs px-3 py-1.5 font-medium">
                      {resource.driverName}
                    </div>
                  </div>

                  {/* Timeline Area with Task Bars */}
                  <div className="flex-1 flex relative" style={{ minHeight: '110px' }}>
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
                        const left = ((task.startHour - TIMELINE_START_HOUR) / TIMELINE_HOURS) * 100;
                        const width = (task.duration / TIMELINE_HOURS) * 100;
                        
                        // Red for emergencies, Blue for standard
                        const bgColor = task.isEmergency 
                          ? 'bg-red-500' 
                          : 'bg-blue-500';
                        
                        return (
                          <div
                            key={task.id}
                            className={`absolute top-3 ${bgColor} rounded shadow-md flex flex-col justify-center px-2 text-white text-xs cursor-pointer hover:opacity-90 transition-opacity overflow-hidden`}
                            style={{
                              left: `${left}%`,
                              width: `${width}%`,
                              minWidth: '60px',
                              height: '50px',
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
                    <span className="text-gray-700">Standard</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Map (30-35% width) */}
          <div className="flex-1 min-w-[300px] bg-white flex flex-col relative">
            {/* Map Header */}
            <div className="bg-gray-700 text-white px-4 py-2 flex items-center justify-between">
              <h2 className="font-semibold text-sm">Karte - Techniker Standorte</h2>
            </div>

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
