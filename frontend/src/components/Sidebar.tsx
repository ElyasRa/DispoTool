import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Inbox,
  PlusCircle,
  Car,
  ClipboardList,
  Hourglass,
  BadgeEuro,
  FileText,
  AlertTriangle,
  HardHat,
  Users,
  Settings,
} from 'lucide-react';

interface NavItem {
  to: string;
  icon: React.ReactNode;
  label: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: 'HAUPTMENÜ',
    items: [
      { to: '/', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    ],
  },
  {
    title: 'AUFTRÄGE',
    items: [
      { to: '/anfragen', icon: <Inbox size={20} />, label: 'Anfragen' },
      { to: '/neuer-auftrag', icon: <PlusCircle size={20} />, label: 'Neuer Auftrag' },
      { to: '/disposition', icon: <Car size={20} />, label: 'Disposition' },
      { to: '/auftragsverwaltung', icon: <ClipboardList size={20} />, label: 'Auftragsverwaltung' },
      { to: '/offene-auftraege', icon: <Hourglass size={20} />, label: 'Offene Aufträge' },
    ],
  },
  {
    title: 'FINANZEN',
    items: [
      { to: '/abrechnung-erstellen', icon: <BadgeEuro size={20} />, label: 'Abrechnung erstellen' },
      { to: '/offene-rechnungen', icon: <FileText size={20} />, label: 'Offene Rechnungen' },
      { to: '/mahnwesen', icon: <AlertTriangle size={20} />, label: 'Mahnwesen' },
    ],
  },
  {
    title: 'VERWALTUNG',
    items: [
      { to: '/monteurverwaltung', icon: <HardHat size={20} />, label: 'Monteurverwaltung' },
      { to: '/benutzerverwaltung', icon: <Users size={20} />, label: 'Benutzerverwaltung' },
      { to: '/einstellungen', icon: <Settings size={20} />, label: 'Einstellungen' },
    ],
  },
];

function Sidebar() {
  return (
    <aside className="w-64 bg-slate-900 min-h-screen fixed left-0 top-0 flex flex-col">
      {/* Logo / Brand */}
      <div className="p-4 border-b border-slate-700">
        <h1 className="text-xl font-bold text-white">DispoTool</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        {navSections.map((section) => (
          <div key={section.title} className="mb-6">
            <h2 className="px-4 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {section.title}
            </h2>
            <ul>
              {section.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm transition-colors ${
                        isActive
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`
                    }
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;
