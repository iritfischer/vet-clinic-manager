import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  UserPlus,
  Search,
  MoreVertical,
  Phone,
  Mail,
  ArrowUpCircle,
  Trash2,
  Edit,
  MessageCircle,
  PawPrint,
  RefreshCw,
} from 'lucide-react';
import { useLeads } from '@/hooks/useLeads';
import { LeadDialog } from '@/components/whatsapp/LeadDialog';
import { ConvertToClientDialog } from '@/components/whatsapp/ConvertToClientDialog';
import { Lead, LeadFormData, LeadStatus } from '@/types/leads';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

const statusConfig: Record<LeadStatus, { label: string; color: string }> = {
  new: { label: 'חדש', color: 'bg-blue-100 text-blue-800' },
  contacted: { label: 'יצרנו קשר', color: 'bg-yellow-100 text-yellow-800' },
  converted: { label: 'הומר ללקוח', color: 'bg-green-100 text-green-800' },
  lost: { label: 'אבוד', color: 'bg-gray-100 text-gray-800' },
};

const Leads = () => {
  const navigate = useNavigate();
  const {
    leads,
    loading,
    fetchLeads,
    createLead,
    updateLead,
    deleteLead,
    convertLeadToClient,
  } = useLeads();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Dialog states
  const [leadDialogOpen, setLeadDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [convertingLead, setConvertingLead] = useState<Lead | null>(null);
  const [converting, setConverting] = useState(false);

  // Filter leads
  const filteredLeads = leads.filter((lead) => {
    // Search filter
    const matchesSearch =
      !searchQuery ||
      lead.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lead.last_name && lead.last_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      lead.phone.includes(searchQuery) ||
      (lead.email && lead.email.toLowerCase().includes(searchQuery.toLowerCase()));

    // Status filter
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Handlers
  const handleCreateLead = async (data: LeadFormData) => {
    await createLead(data);
    setLeadDialogOpen(false);
  };

  const handleEditLead = (lead: Lead) => {
    setEditingLead(lead);
    setLeadDialogOpen(true);
  };

  const handleUpdateLead = async (data: LeadFormData) => {
    if (editingLead) {
      await updateLead(editingLead.id, data);
      setEditingLead(null);
      setLeadDialogOpen(false);
    }
  };

  const handleDeleteLead = async (lead: Lead) => {
    if (confirm(`האם למחוק את הליד ${lead.first_name}?`)) {
      await deleteLead(lead.id);
    }
  };

  const handleOpenConvert = (lead: Lead) => {
    setConvertingLead(lead);
    setConvertDialogOpen(true);
  };

  const handleConvert = async (createPet: boolean) => {
    if (!convertingLead) return;
    setConverting(true);
    const result = await convertLeadToClient(convertingLead.id, createPet);
    setConverting(false);
    if (result) {
      setConvertDialogOpen(false);
      setConvertingLead(null);
      // Navigate to new client
      navigate(`/client/${result.clientId}`);
    }
  };

  const handleGoToWhatsApp = (_lead: Lead) => {
    navigate('/whatsapp');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <UserPlus className="h-8 w-8 text-yellow-600" />
            <div>
              <h1 className="text-3xl font-bold">לידים</h1>
              <p className="text-muted-foreground">
                ניהול לקוחות פוטנציאליים מ-WhatsApp
              </p>
            </div>
          </div>
          <Button onClick={() => setLeadDialogOpen(true)}>
            <UserPlus className="h-4 w-4 ml-2" />
            ליד חדש
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          {(['all', 'new', 'contacted', 'converted'] as const).map((status) => {
            const count =
              status === 'all'
                ? leads.length
                : leads.filter((l) => l.status === status).length;
            const config = status === 'all'
              ? { label: 'סה"כ', color: 'bg-primary/10 text-primary' }
              : statusConfig[status];

            return (
              <Card
                key={status}
                className={`cursor-pointer transition-all ${
                  statusFilter === status ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => setStatusFilter(status)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">{count}</span>
                    <Badge className={config.color}>{config.label}</Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Filters */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="חיפוש לפי שם, טלפון או אימייל..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="סטטוס" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הסטטוסים</SelectItem>
              <SelectItem value="new">חדש</SelectItem>
              <SelectItem value="contacted">יצרנו קשר</SelectItem>
              <SelectItem value="converted">הומר ללקוח</SelectItem>
              <SelectItem value="lost">אבוד</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchLeads}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">טוען...</p>
              </div>
            ) : filteredLeads.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <UserPlus className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">אין לידים להצגה</p>
                {searchQuery || statusFilter !== 'all' ? (
                  <Button
                    variant="link"
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilter('all');
                    }}
                  >
                    נקה פילטרים
                  </Button>
                ) : null}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">שם</TableHead>
                    <TableHead className="text-right">טלפון</TableHead>
                    <TableHead className="text-right">אימייל</TableHead>
                    <TableHead className="text-right">חיה</TableHead>
                    <TableHead className="text-right">סטטוס</TableHead>
                    <TableHead className="text-right">נוצר</TableHead>
                    <TableHead className="text-right">פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell className="font-medium">
                        {lead.first_name} {lead.last_name || ''}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1" dir="ltr">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          {lead.phone}
                        </div>
                      </TableCell>
                      <TableCell>
                        {lead.email ? (
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            {lead.email}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {lead.pet_name ? (
                          <div className="flex items-center gap-1">
                            <PawPrint className="h-3 w-3 text-muted-foreground" />
                            {lead.pet_name}
                            {lead.pet_species && (
                              <span className="text-xs text-muted-foreground">
                                ({lead.pet_species})
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusConfig[lead.status as LeadStatus]?.color || ''}>
                          {statusConfig[lead.status as LeadStatus]?.label || lead.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(lead.created_at), 'dd/MM/yyyy', { locale: he })}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditLead(lead)}>
                              <Edit className="h-4 w-4 ml-2" />
                              ערוך
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleGoToWhatsApp(lead)}>
                              <MessageCircle className="h-4 w-4 ml-2" />
                              עבור לשיחה
                            </DropdownMenuItem>
                            {lead.status !== 'converted' && (
                              <DropdownMenuItem onClick={() => handleOpenConvert(lead)}>
                                <ArrowUpCircle className="h-4 w-4 ml-2" />
                                המר ללקוח
                              </DropdownMenuItem>
                            )}
                            {lead.status === 'converted' && lead.converted_client_id && (
                              <DropdownMenuItem
                                onClick={() => navigate(`/client/${lead.converted_client_id}`)}
                              >
                                <ArrowUpCircle className="h-4 w-4 ml-2" />
                                עבור ללקוח
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => handleDeleteLead(lead)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 ml-2" />
                              מחק
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Lead Dialog */}
      <LeadDialog
        open={leadDialogOpen}
        onClose={() => {
          setLeadDialogOpen(false);
          setEditingLead(null);
        }}
        onSave={editingLead ? handleUpdateLead : handleCreateLead}
        lead={editingLead}
      />

      {/* Convert Dialog */}
      <ConvertToClientDialog
        open={convertDialogOpen}
        onClose={() => {
          setConvertDialogOpen(false);
          setConvertingLead(null);
        }}
        onConvert={handleConvert}
        lead={convertingLead}
        converting={converting}
      />
    </DashboardLayout>
  );
};

export default Leads;
