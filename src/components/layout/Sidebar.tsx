import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  Home,
  Calendar,
  Users,
  PawPrint,
  FileText,
  Bell,
  MessageSquare,
  DollarSign,
  Settings,
  Activity,
  LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { Separator } from '@/components/ui/separator';

const navigation = [
  { name: 'דשבורד', href: '/dashboard', icon: Home },
  { name: 'יומן תורים', href: '/appointments', icon: Calendar },
  { name: 'לקוחות', href: '/clients', icon: Users },
  { name: 'חיות מחמד', href: '/pets', icon: PawPrint },
  { name: 'ביקורים', href: '/visits', icon: FileText },
  { name: 'תזכורות', href: '/reminders', icon: Bell },
  { name: 'הודעות WhatsApp', href: '/whatsapp', icon: MessageSquare },
  { name: 'מחירון', href: '/pricing', icon: DollarSign },
];

export const Sidebar = () => {
  const { signOut, user } = useAuth();

  return (
    <div className="flex h-screen w-64 flex-col bg-sidebar border-l border-sidebar-border">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-6 border-b border-sidebar-border">
        <div className="bg-sidebar-primary p-2 rounded-lg">
          <Activity className="h-6 w-6 text-sidebar-primary-foreground" />
        </div>
        <div className="text-right">
          <h1 className="text-lg font-bold text-sidebar-foreground">VetClinic</h1>
          <p className="text-xs text-sidebar-foreground/60">מערכת ניהול מרפאה</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/80'
              )
            }
          >
            <item.icon className="h-5 w-5 flex-shrink-0" />
            <span className="flex-1 text-right">{item.name}</span>
          </NavLink>
        ))}
      </nav>

      <Separator className="bg-sidebar-border" />

      {/* User section */}
      <div className="p-4 space-y-3">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors w-full',
              'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              isActive
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-sidebar-foreground/80'
            )
          }
        >
          <Settings className="h-5 w-5" />
          <span className="flex-1 text-right">הגדרות</span>
        </NavLink>

        <Button
          variant="ghost"
          onClick={signOut}
          className="w-full justify-start gap-3 text-sidebar-foreground/80 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent"
        >
          <LogOut className="h-5 w-5" />
          <span className="flex-1 text-right">התנתק</span>
        </Button>

        {user && (
          <div className="pt-3 border-t border-sidebar-border">
            <p className="text-xs text-sidebar-foreground/60 text-right truncate">
              {user.email}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
