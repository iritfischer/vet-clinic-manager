import { Activity, Settings, Menu, X, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NavLink } from 'react-router-dom';

interface HeaderProps {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export const Header = ({ isSidebarOpen, onToggleSidebar }: HeaderProps) => {
  return (
    <header className="h-16 bg-background border-b border-border flex items-center justify-between px-4 sticky top-0 z-50">
      {/* Right side - Logo and toggle */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          className="hover:bg-accent"
        >
          {isSidebarOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </Button>

        <div className="flex items-center gap-3">
          <div className="bg-primary p-2 rounded-lg">
            <Activity className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="text-right">
            <h1 className="text-lg font-bold">VetClinic</h1>
            <p className="text-xs text-muted-foreground">מערכת ניהול מרפאה</p>
          </div>
        </div>
      </div>

      {/* Left side - Calendar & Settings */}
      <div className="flex items-center gap-2">
        <NavLink to="/appointments">
          <Button variant="ghost" size="icon" className="hover:bg-accent" title="יומן תורים">
            <Calendar className="h-5 w-5" />
          </Button>
        </NavLink>
        <NavLink to="/settings">
          <Button variant="ghost" size="icon" className="hover:bg-accent">
            <Settings className="h-5 w-5" />
          </Button>
        </NavLink>
      </div>
    </header>
  );
};
