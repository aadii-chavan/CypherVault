import { Shield, KeyRound, Settings, LogOut } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface SidebarItem {
  icon: React.ElementType;
  label: string;
  href: string;
}

const sidebarItems: SidebarItem[] = [
  {
    icon: Shield,
    label: 'Vault',
    href: '/vault',
  },
  {
    icon: KeyRound,
    label: 'Password Generator',
    href: '/generator',
  },
  {
    icon: Settings,
    label: 'Settings',
    href: '/settings',
  },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-64 border-r bg-card">
        <div className="flex h-16 items-center gap-2 px-6">
          <Shield className="h-6 w-6 text-primary" />
          <span className="font-semibold text-xl">CypherVault</span>
        </div>

        <nav className="space-y-1 px-2">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  location.pathname === item.href
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-4 px-2 w-64">
          <button
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-500 transition-colors hover:bg-red-500/10"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
} 