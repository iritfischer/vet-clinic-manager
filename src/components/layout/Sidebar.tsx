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
  LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

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

interface SidebarProps {
  isOpen: boolean;
}

export const Sidebar = ({ isOpen }: SidebarProps) => {
  const { signOut, user } = useAuth();

  return (
    <div
      className={cn(
        'flex flex-col bg-sidebar border-l border-sidebar-border transition-all duration-300 overflow-hidden',
        isOpen ? 'w-64' : 'w-0'
      )}
    >
      {/* Navigation */}
      <nav className="flex-1 space-y-2 px-3 py-4 overflow-y-auto">
        {navigation.map((item) => (
          <Tooltip key={item.name} delayDuration={0}>
            <TooltipTrigger asChild>
              <NavLink
                to={item.href}
                className={({ isActive }) =>
                  cn(
                    'block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground/80'
                  )
                }
              >
                <div className="flex items-center gap-3">
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  <span>{item.name}</span>
                </div>
              </NavLink>
            </TooltipTrigger>
            {!isOpen && (
              <TooltipContent side="left">
                {item.name}
              </TooltipContent>
            )}
          </Tooltip>
        ))}
      </nav>

      <Separator className="bg-sidebar-border" />

      {/* User section */}
      <div className="p-4 space-y-4">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              'block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors w-full',
              'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              isActive
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-sidebar-foreground/80'
            )
          }
        >
          <div className="flex items-center gap-3">
            <Settings className="h-5 w-5 flex-shrink-0" />
            <span>הגדרות</span>
          </div>
        </NavLink>

        <Button
          variant="ghost"
          onClick={signOut}
          className="w-full justify-start text-sidebar-foreground/80 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent px-3 py-2.5"
        >
          <div className="flex items-center gap-3">
            <LogOut className="h-5 w-5 flex-shrink-0" />
            <span>התנתק</span>
          </div>
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
