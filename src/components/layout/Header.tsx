import { Settings, Menu, X, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NavLink } from 'react-router-dom';

interface HeaderProps {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export const Header = ({ isSidebarOpen, onToggleSidebar }: HeaderProps) => {
  return (
    <header className="h-16 bg-gray-900 flex items-center justify-between px-4 sticky top-0 z-50 shadow-md">
      {/* Right side - Logo and toggle */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          className="text-white hover:bg-white/10"
        >
          {isSidebarOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </Button>

        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-white">VetBuddy</h1>
          <img src="/logo.png" alt="VetBuddy Logo" className="h-10 w-10 object-contain" />
        </div>
      </div>

      {/* Left side - Calendar & Settings */}
      <div className="flex items-center gap-2">
        <NavLink to="/appointments">
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" title="יומן תורים">
            <Calendar className="h-5 w-5" />
          </Button>
        </NavLink>
        <NavLink to="/settings">
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
            <Settings className="h-5 w-5" />
          </Button>
        </NavLink>
      </div>
    </header>
  );
};
