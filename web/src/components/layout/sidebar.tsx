import { NavLink } from 'react-router-dom';
import { Sparkles, ListTodo, Settings, Plug } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/', label: 'Generate', icon: Sparkles },
  { to: '/tasks', label: 'Tasks', icon: ListTodo },
  { to: '/settings', label: 'Settings', icon: Settings },
  { to: '/connections', label: 'Connections', icon: Plug },
];

export function Sidebar() {
  return (
    <aside className="flex h-full w-56 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
        <Sparkles className="h-5 w-5 text-primary" />
        <span className="font-semibold text-sidebar-foreground">Blog Agent</span>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/50',
              )
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
