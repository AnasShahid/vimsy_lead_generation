import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Search,
  Users,
  Activity,
  FileText,
  Mail,
  BarChart3,
  Settings,
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/discovery', label: '1. Discovery', icon: Search },
  { to: '/enrichment', label: '2. Enrichment', icon: Users },
  { to: '/analysis', label: '3. Analysis', icon: Activity },
  { to: '/reports', label: '4. Reports', icon: FileText },
  { to: '/outreach', label: '5. Outreach', icon: Mail },
  { to: '/tracking', label: '6. Tracking', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  return (
    <aside className="w-64 bg-gray-900 text-gray-100 flex flex-col min-h-screen">
      <div className="p-5 border-b border-gray-700">
        <h1 className="text-xl font-bold tracking-tight">Vimsy Lead Gen</h1>
        <p className="text-xs text-gray-400 mt-1">WordPress Discovery Pipeline</p>
      </div>

      <nav className="flex-1 py-4">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-5 py-2.5 text-sm transition-colors ${
                isActive
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-700 text-xs text-gray-500">
        Pipeline v1.0
      </div>
    </aside>
  );
}
