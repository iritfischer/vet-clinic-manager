import { useState, useEffect, useRef } from 'react';
import { Settings, Menu, X, Calendar, Search, User, PawPrint } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NavLink, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useClinic } from '@/hooks/useClinic';
import { cn } from '@/lib/utils';

interface HeaderProps {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
}

interface SearchResult {
  id: string;
  type: 'client' | 'pet';
  name: string;
  phone?: string;
  ownerName?: string;
  clientId?: string;
}

export const Header = ({ isSidebarOpen, onToggleSidebar }: HeaderProps) => {
  const navigate = useNavigate();
  const { clinicId } = useClinic();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search function
  useEffect(() => {
    const search = async () => {
      if (!clinicId || searchQuery.length < 2) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const results: SearchResult[] = [];
        const query = searchQuery.trim();
        const isPhoneSearch = /^\d+$/.test(query.replace(/[-\s]/g, ''));

        // Search clients
        let clientQuery = supabase
          .from('clients')
          .select('id, first_name, last_name, phone_primary')
          .eq('clinic_id', clinicId)
          .eq('status', 'active')
          .limit(5);

        if (isPhoneSearch) {
          clientQuery = clientQuery.ilike('phone_primary', `%${query.replace(/[-\s]/g, '')}%`);
        } else {
          clientQuery = clientQuery.or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%`);
        }

        const { data: clients } = await clientQuery;

        if (clients) {
          clients.forEach(client => {
            results.push({
              id: client.id,
              type: 'client',
              name: `${client.first_name} ${client.last_name}`.trim(),
              phone: client.phone_primary,
            });
          });
        }

        // Search pets (by name only, not phone)
        if (!isPhoneSearch) {
          const { data: pets } = await supabase
            .from('pets')
            .select('id, name, client_id, clients!inner(first_name, last_name)')
            .eq('clinic_id', clinicId)
            .ilike('name', `%${query}%`)
            .limit(5);

          if (pets) {
            pets.forEach((pet: any) => {
              results.push({
                id: pet.id,
                type: 'pet',
                name: pet.name,
                ownerName: `${pet.clients.first_name} ${pet.clients.last_name}`.trim(),
                clientId: pet.client_id,
              });
            });
          }
        }

        setSearchResults(results);
        setSelectedIndex(-1);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(search, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, clinicId]);

  const handleResultClick = (result: SearchResult) => {
    if (result.type === 'client') {
      navigate(`/client/${result.id}`);
    } else if (result.type === 'pet' && result.clientId) {
      navigate(`/client/${result.clientId}`);
    }
    setSearchQuery('');
    setShowResults(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showResults || searchResults.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev < searchResults.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
          handleResultClick(searchResults[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowResults(false);
        inputRef.current?.blur();
        break;
    }
  };

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

      {/* Center - Global Search */}
      <div className="flex-1 max-w-md mx-4 relative" ref={searchRef}>
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            ref={inputRef}
            type="text"
            placeholder="חיפוש לקוח או חיה לפי שם / טלפון..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowResults(true);
            }}
            onFocus={() => searchQuery.length >= 2 && setShowResults(true)}
            onKeyDown={handleKeyDown}
            className="pr-10 bg-gray-800 border-gray-700 text-white placeholder:text-gray-400 focus:border-primary"
            dir="rtl"
          />
        </div>

        {/* Search Results Dropdown */}
        {showResults && searchQuery.length >= 2 && (
          <div className="absolute top-full mt-1 w-full bg-white rounded-lg shadow-lg border overflow-hidden z-50" dir="rtl">
            {isSearching ? (
              <div className="p-4 text-center text-gray-500">מחפש...</div>
            ) : searchResults.length === 0 ? (
              <div className="p-4 text-center text-gray-500">לא נמצאו תוצאות</div>
            ) : (
              <ul className="max-h-80 overflow-y-auto">
                {searchResults.map((result, index) => (
                  <li
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleResultClick(result)}
                    className={cn(
                      "px-4 py-3 cursor-pointer hover:bg-gray-100 flex items-center gap-3 border-b last:border-b-0",
                      selectedIndex === index && "bg-gray-100"
                    )}
                  >
                    <div className={cn(
                      "p-2 rounded-full",
                      result.type === 'client' ? "bg-blue-100" : "bg-green-100"
                    )}>
                      {result.type === 'client' ? (
                        <User className="h-4 w-4 text-blue-600" />
                      ) : (
                        <PawPrint className="h-4 w-4 text-green-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{result.name}</div>
                      <div className="text-sm text-gray-500">
                        {result.type === 'client' ? (
                          result.phone && <span dir="ltr">{result.phone}</span>
                        ) : (
                          <span>בעלים: {result.ownerName}</span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-gray-400">
                      {result.type === 'client' ? 'לקוח' : 'חיה'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
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
