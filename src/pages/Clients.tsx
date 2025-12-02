import { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Plus, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { useClinic } from '@/hooks/useClinic';
import { ClientsTable } from '@/components/clients/ClientsTable';
import { ClientDialog, ClientFormData } from '@/components/clients/ClientDialog';
import { useToast } from '@/hooks/use-toast';
import { TableToolbar } from '@/components/shared/TableToolbar';

type Client = Tables<'clients'>;

const Clients = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const { clinicId } = useClinic();
  const { toast } = useToast();

  // Filter clients based on search and status
  const filteredClients = useMemo(() => {
    return clients.filter(client => {
      const fullName = `${client.first_name} ${client.last_name}`.toLowerCase();
      const matchesSearch =
        fullName.includes(searchQuery.toLowerCase()) ||
        client.phone_primary?.includes(searchQuery) ||
        client.email?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || client.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [clients, searchQuery, statusFilter]);

  useEffect(() => {
    if (clinicId) {
      fetchClients();
    }
  }, [clinicId]);

  const fetchClients = async () => {
    if (!clinicId) return;

    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClients(data || []);
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (data: ClientFormData): Promise<string | void> => {
    if (!clinicId) return;

    try {
      if (editingClient) {
        const { error } = await supabase
          .from('clients')
          .update(data)
          .eq('id', editingClient.id);

        if (error) throw error;
        toast({ title: 'הלקוח עודכן בהצלחה' });
        setDialogOpen(false);
        setEditingClient(null);
        fetchClients();
      } else {
        const { data: newClient, error } = await supabase
          .from('clients')
          .insert({ ...data, clinic_id: clinicId })
          .select()
          .single();

        if (error) throw error;
        // Don't show toast here - the dialog will show success view
        // Don't close dialog - let the user decide to add pet or close
        setEditingClient(null);
        fetchClients();
        return newClient.id; // Return client ID for pet creation
      }
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'הלקוח נמחק בהצלחה' });
      fetchClients();
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingClient(null);
    fetchClients(); // Refresh in case a pet was added
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">ניהול לקוחות</h1>
            <p className="text-muted-foreground mt-2">
              ניהול כל הלקוחות של המרפאה
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 ml-2" />
            לקוח חדש
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <TableToolbar
              searchValue={searchQuery}
              onSearchChange={setSearchQuery}
              searchPlaceholder="חיפוש לפי שם, טלפון או אימייל..."
              filters={[
                {
                  key: 'status',
                  label: 'סטטוס',
                  options: [
                    { value: 'all', label: 'כל הסטטוסים' },
                    { value: 'active', label: 'פעיל' },
                    { value: 'inactive', label: 'לא פעיל' },
                  ],
                  value: statusFilter,
                  onChange: setStatusFilter,
                },
              ]}
              totalCount={clients.length}
              filteredCount={filteredClients.length}
            />
            <ClientsTable
              clients={filteredClients}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </>
        )}

        <ClientDialog
          open={dialogOpen}
          onClose={handleCloseDialog}
          onSave={handleSave}
          client={editingClient}
        />
      </div>
    </DashboardLayout>
  );
};

export default Clients;
