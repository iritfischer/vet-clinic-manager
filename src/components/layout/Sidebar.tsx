import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  Home,
  Calendar,
  Users,
  UserPlus,
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
  { name: 'לידים', href: '/leads', icon: UserPlus },
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
        'flex flex-col bg-sidebar border-l border-sidebar-border transition-all duration-300',
        isOpen ? 'w-64 opacity-100' : 'w-0 opacity-0 overflow-hidden'
      )}
    >
      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto whitespace-nowrap">
        {navigation.map((item) => (
          <Tooltip key={item.name} delayDuration={0}>
            <TooltipTrigger asChild>
              <NavLink
                to={item.href}
                className={({ isActive }) =>
                  cn(
                    'block rounded-lg px-3 py-3 text-base font-medium transition-colors',
                    isActive
                      ? 'bg-orange-50 text-orange-600 border-l-2 border-orange-500'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )
                }
              >
                {({ isActive }) => (
                  <div className="flex items-center gap-3">
                    <item.icon className={cn("h-5 w-5 flex-shrink-0", isActive ? "text-orange-500" : "text-gray-400")} />
                    <span>{item.name}</span>
                  </div>
                )}
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
      <div className="p-4 space-y-2 whitespace-nowrap">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              'block rounded-lg px-3 py-3 text-base font-medium transition-colors w-full',
              isActive
                ? 'bg-orange-50 text-orange-600 border-l-2 border-orange-500'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            )
          }
        >
          {({ isActive }) => (
            <div className="flex items-center gap-3">
              <Settings className={cn("h-5 w-5 flex-shrink-0", isActive ? "text-orange-500" : "text-gray-400")} />
              <span>הגדרות</span>
            </div>
          )}
        </NavLink>

        <Button
          variant="ghost"
          onClick={signOut}
          className="w-full justify-start text-gray-600 hover:text-gray-900 hover:bg-gray-50 px-3 py-3 text-base"
        >
          <div className="flex items-center gap-3">
            <LogOut className="h-5 w-5 flex-shrink-0 text-gray-400" />
            <span>התנתק</span>
          </div>
        </Button>

        {user && (
          <div className="pt-3 border-t border-gray-200">
            <p className="text-sm text-gray-500 text-right truncate">
              {user.email}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
