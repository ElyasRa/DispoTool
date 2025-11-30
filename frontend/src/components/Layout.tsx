import { ReactNode } from 'react';
import { LogOut } from 'lucide-react';
import Sidebar from './Sidebar';

interface User {
  id: number;
  username: string;
  email: string;
  name: string;
  role: string;
}

interface LayoutProps {
  children: ReactNode;
  user: User | null;
  onLogout: () => void;
}

function Layout({ children, user, onLogout }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-100">
      <Sidebar />
      
      {/* Main Content */}
      <div className="ml-64">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
          <div className="flex justify-between items-center px-6 py-4">
            <div>
              {/* Breadcrumb or page title can go here */}
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                Willkommen, {user?.name}
              </span>
              <button
                onClick={onLogout}
                className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm transition-colors"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main>
          {children}
        </main>
      </div>
    </div>
  );
}

export default Layout;
