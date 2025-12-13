import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Tables } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AITextarea } from '@/components/ui/ai-textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, X, Calendar, Syringe, PlusCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useClinic } from '@/hooks/useClinic';
import { useVisitAutoSave } from '@/hooks/useVisitAutoSave';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, addDays } from 'date-fns';
import { he } from 'date-fns/locale';
import { TagInput } from '@/components/shared/TagInput';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type Visit = Tables<'visits'>;
type Client = Tables<'clients'>;
type Pet = Tables<'pets'>;
type PriceItem = Tables<'price_items'>;

// סוגי ביקור קבועים
const VISIT_TYPES = [
  { value: 'checkup', label: 'בדיקה כללית' },
  { value: 'vaccination', label: 'חיסון' },
  { value: 'surgery', label: 'ניתוח' },
  { value: 'dental', label: 'טיפול שיניים' },
  { value: 'emergency', label: 'חירום' },
  { value: 'grooming', label: 'טיפוח' },
  { value: 'other', label: 'אחר' },
];

// סוגי חיסונים עם מרווחי זמן לתזכורת הבאה (בימים)
const VACCINATION_TYPES = {
  dog: [
    { value: 'rabies', label: 'כלבת', nextDueDays: 365 },
    { value: 'dhpp', label: 'משושה (DHPP)', nextDueDays: 365 },
    { value: 'leptospirosis', label: 'לפטוספירוזיס', nextDueDays: 365 },
    { value: 'bordetella', label: 'בורדטלה (שיעול מלונות)', nextDueDays: 180 },
    { value: 'lyme', label: 'ליים', nextDueDays: 365 },
  ],
  cat: [
    { value: 'rabies', label: 'כלבת', nextDueDays: 365 },
    { value: 'fvrcp', label: 'משולש (FVRCP)', nextDueDays: 365 },
    { value: 'felv', label: 'לויקמיה (FeLV)', nextDueDays: 365 },
    { value: 'fiv', label: 'איידס חתולים (FIV)', nextDueDays: 365 },
  ],
  other: [
    { value: 'rabies', label: 'כלבת', nextDueDays: 365 },
    { value: 'other', label: 'אחר', nextDueDays: 365 },
  ],
};

const visitSchema = z.object({
  client_id: z.string().min(1, 'יש לבחור לקוח'),
  pet_id: z.string().min(1, 'יש לבחור חיית מחמד'),
  visit_type: z.string().min(1, 'יש לבחור סוג ביקור').max(100),
  vaccination_type: z.string().optional(),
  vaccination_date: z.string().optional(),
  visit_date: z.string().min(1, 'יש להזין תאריך'),
  chief_complaint: z.string().max(1000).optional().or(z.literal('')),
  general_history: z.string().max(2000).optional().or(z.literal('')),
  medical_history: z.string().max(2000).optional().or(z.literal('')),
  current_history: z.string().max(2000).optional().or(z.literal('')),
  physical_exam: z.string().max(2000).optional().or(z.literal('')),
  additional_tests: z.string().max(2000).optional().or(z.literal('')),
  diagnoses: z.array(z.object({
    diagnosis: z.string(),
    notes: z.string().optional(),
  })).optional(),
  treatments: z.array(z.object({
    treatment: z.string(),
    notes: z.string().optional(),
  })).optional(),
  medications: z.array(z.object({
    medication: z.string(),
    dosage: z.string().optional(),
    frequency: z.string().optional(),
  })).optional(),
  recommendations: z.string().max(2000).optional().or(z.literal('')),
  client_summary: z.string().max(2000).optional().or(z.literal('')),
  status: z.enum(['open', 'completed', 'cancelled']),
  price_items: z.array(z.object({
    item_id: z.string(),
    quantity: z.number(),
  })).optional(),
  follow_ups: z.array(z.object({
    due_date: z.string(),
    notes: z.string(),
    reminder_type: z.string(),
  })).optional(),
});

type VisitFormData = z.infer<typeof visitSchema>;

interface VisitFormProps {
  onSave: (data: any) => void;
  onCancel: () => void;
  visit?: Visit | null;
  preSelectedClientId?: string;
  preSelectedPetId?: string;
  visitId?: string;
  onFormDirtyChange?: (isDirty: boolean) => void;
  submitRef?: React.MutableRefObject<(() => void) | null>;
  draftDataToRestore?: Record<string, unknown> | null;
}

export const VisitForm = ({ onSave, onCancel, visit, preSelectedClientId, preSelectedPetId, visitId: propVisitId, onFormDirtyChange, submitRef, draftDataToRestore }: VisitFormProps) => {
  const { clinicId } = useClinic();
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [priceItems, setPriceItems] = useState<PriceItem[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>(preSelectedClientId || '');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // State for new price item dialog
  const [showNewPriceItemDialog, setShowNewPriceItemDialog] = useState(false);
  const [newPriceItem, setNewPriceItem] = useState({
    name: '',
    category: '',
    price_before_vat: '',
    price_with_vat: '',
  });
  const [savingPriceItem, setSavingPriceItem] = useState(false);


  const formMethods = useForm<VisitFormData>({
    resolver: zodResolver(visitSchema),
    defaultValues: {
      client_id: preSelectedClientId || '',
      pet_id: preSelectedPetId || '',
      visit_type: '',
      vaccination_type: '',
      vaccination_date: new Date().toISOString().slice(0, 10),
      visit_date: new Date().toISOString().slice(0, 16),
      chief_complaint: '',
      general_history: '',
      medical_history: '',
      current_history: '',
      physical_exam: '',
      additional_tests: '',
      diagnoses: [],
      treatments: [],
      medications: [],
      recommendations: '',
      client_summary: '',
      status: 'open',
      price_items: [],
      follow_ups: [],
    },
  });

  const { register, handleSubmit, watch, setValue, reset, control, formState: { errors, isDirty } } = formMethods;

  // Reset form when visit or draftDataToRestore changes to null (new visit)
  useEffect(() => {
    if (!visit && !draftDataToRestore) {
      reset({
        client_id: preSelectedClientId || '',
        pet_id: preSelectedPetId || '',
        visit_type: '',
        vaccination_type: '',
        vaccination_date: new Date().toISOString().slice(0, 10),
        visit_date: new Date().toISOString().slice(0, 16),
        chief_complaint: '',
        general_history: '',
        medical_history: '',
        current_history: '',
        physical_exam: '',
        additional_tests: '',
        diagnoses: [],
        treatments: [],
        medications: [],
        recommendations: '',
        client_summary: '',
        status: 'open',
        price_items: [],
        follow_ups: [],
      });
      setSelectedClientId(preSelectedClientId || '');
      setAddedToPricing(new Set());
      setItemsNeedingPrice(new Map());
      setNewItemPrices(new Map());
    }
  }, [visit, draftDataToRestore, reset, preSelectedClientId, preSelectedPetId]);

  // Use the auto-save hook
  const visitId = propVisitId || visit?.id;
  useVisitAutoSave({
    visitId,
    clinicId,
    formMethods,
    enabled: !!visitId,
  });

  // Warn before leaving page with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = 'יש שינויים שלא נשמרו. האם לצאת?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Notify parent when form changes - directly track any change
  useEffect(() => {
    if (!onFormDirtyChange) return;

    // Subscribe to all form changes
    const subscription = watch((data, { name }) => {
      // Any change means the form is dirty
      if (name) {
        onFormDirtyChange(true);
      }
    });

    return () => subscription.unsubscribe();
  }, [watch, onFormDirtyChange]);

  // Handle cancel with confirmation if there are unsaved changes
  const handleCancelClick = () => {
    if (isDirty) {
      setShowCancelConfirm(true);
    } else {
      onCancel();
    }
  };

  const handleConfirmCancel = () => {
    setShowCancelConfirm(false);
    onCancel();
  };

  const { fields: diagnosesFields, append: appendDiagnosis, remove: removeDiagnosis } = useFieldArray({
    control,
    name: 'diagnoses',
  });

  const { fields: treatmentsFields, append: appendTreatment, remove: removeTreatment } = useFieldArray({
    control,
    name: 'treatments',
  });

  const { fields: medicationsFields, append: appendMedication, remove: removeMedication } = useFieldArray({
    control,
    name: 'medications',
  });

  // Track which items have already been added to pricing to avoid duplicates
  const [addedToPricing, setAddedToPricing] = useState<Set<string>>(new Set());
  // Track items that need price input (not found in pricing)
  const [itemsNeedingPrice, setItemsNeedingPrice] = useState<Map<string, { type: 'medication' | 'treatment'; index: number; name: string; category: string }>>(new Map());
  // Track price inputs for new items
  const [newItemPrices, setNewItemPrices] = useState<Map<string, { price_with_vat: string; price_without_vat: string }>>(new Map());
  const medications = watch('medications') || [];
  const treatments = watch('treatments') || [];

  // Helper function to find price item (without creating)
  const findPriceItem = async (name: string, category: string): Promise<string | null> => {
    if (!clinicId || !name) return null;

    const { data: existingItems } = await supabase
      .from('price_items')
      .select('id')
      .eq('clinic_id', clinicId)
      .eq('name', name)
      .eq('category', category)
      .limit(1);

    if (existingItems && existingItems.length > 0) {
      return existingItems[0].id;
    }
    return null;
  };

  // Helper function to create price item and add to pricing
  const createAndAddPriceItem = async (name: string, category: string, priceWithVat: number, priceWithoutVat: number): Promise<string | null> => {
    if (!clinicId) return null;

    try {
      const { data: newItem, error } = await supabase
        .from('price_items')
        .insert({
          clinic_id: clinicId,
          name: name,
          category: category,
          price_without_vat: priceWithoutVat,
          price_with_vat: priceWithVat,
          is_discountable: true,
        })
        .select()
        .single();

      if (error) throw error;

      // Refresh price items list
      await fetchPriceItems();

      return newItem.id;
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error.message || 'שגיאה ביצירת פריט החיוב',
        variant: 'destructive',
      });
      return null;
    }
  };

  // Auto-add medications to pricing when medication name is entered
  useEffect(() => {
    if (!clinicId) return;
    
    medications.forEach(async (med, index) => {
      const medicationName = med.medication?.trim() || '';
      const key = medicationName ? `medication-${index}-${medicationName}` : `medication-${index}-empty`;
      
      if (medicationName) {
        if (!addedToPricing.has(key)) {
          const priceItemId = await findPriceItem(medicationName, 'תרופות');
          if (priceItemId) {
            // Item exists - add automatically
            const currentPriceItems = watch('price_items') || [];
            const exists = currentPriceItems.some(pi => pi.item_id === priceItemId);
            if (!exists) {
              appendPriceItem({ item_id: priceItemId, quantity: 1 });
            }
            setAddedToPricing(prev => new Set(prev).add(key));
            // Remove from items needing price if it was there
            setItemsNeedingPrice(prev => {
              const newMap = new Map(prev);
              newMap.delete(key);
              return newMap;
            });
          } else {
            // Item doesn't exist - mark as needing price input
            setItemsNeedingPrice(prev => {
              const newMap = new Map(prev);
              newMap.set(key, { type: 'medication', index, name: medicationName, category: 'תרופות' });
              return newMap;
            });
          }
        }
      } else {
        // Medication name cleared - remove from tracking
        setItemsNeedingPrice(prev => {
          const newMap = new Map(prev);
          newMap.delete(key);
          return newMap;
        });
        setAddedToPricing(prev => {
          const newSet = new Set(prev);
          newSet.delete(key);
          return newSet;
        });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [medications, clinicId, addedToPricing]);

  // Auto-add treatments to pricing when treatment name is entered
  useEffect(() => {
    if (!clinicId) return;
    
    treatments.forEach(async (treatment, index) => {
      const treatmentName = treatment.treatment?.trim() || '';
      const key = treatmentName ? `treatment-${index}-${treatmentName}` : `treatment-${index}-empty`;
      
      if (treatmentName) {
        if (!addedToPricing.has(key)) {
          const priceItemId = await findPriceItem(treatmentName, 'טיפולים');
          if (priceItemId) {
            // Item exists - add automatically
            const currentPriceItems = watch('price_items') || [];
            const exists = currentPriceItems.some(pi => pi.item_id === priceItemId);
            if (!exists) {
              appendPriceItem({ item_id: priceItemId, quantity: 1 });
            }
            setAddedToPricing(prev => new Set(prev).add(key));
            // Remove from items needing price if it was there
            setItemsNeedingPrice(prev => {
              const newMap = new Map(prev);
              newMap.delete(key);
              return newMap;
            });
          } else {
            // Item doesn't exist - mark as needing price input
            setItemsNeedingPrice(prev => {
              const newMap = new Map(prev);
              newMap.set(key, { type: 'treatment', index, name: treatmentName, category: 'טיפולים' });
              return newMap;
            });
          }
        }
      } else {
        // Treatment name cleared - remove from tracking
        setItemsNeedingPrice(prev => {
          const newMap = new Map(prev);
          newMap.delete(key);
          return newMap;
        });
        setAddedToPricing(prev => {
          const newSet = new Set(prev);
          newSet.delete(key);
          return newSet;
        });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [treatments, clinicId, addedToPricing]);

  // Auto-add vaccinations to pricing when vaccination type is selected
  const visitType = watch('visit_type');
  const vaccinationType = watch('vaccination_type');
  useEffect(() => {
    if (visitType?.includes('vaccination') && vaccinationType && vaccinationType.trim()) {
      const key = `vaccination-${vaccinationType}`;
      if (!addedToPricing.has(key)) {
        findPriceItem(vaccinationType.trim(), 'חיסונים').then(priceItemId => {
          if (priceItemId) {
            // Check if already in price_items to avoid duplicates
            const currentPriceItems = watch('price_items') || [];
            const exists = currentPriceItems.some(pi => pi.item_id === priceItemId);
            if (!exists) {
              appendPriceItem({ item_id: priceItemId, quantity: 1 });
            }
            setAddedToPricing(prev => new Set(prev).add(key));
          }
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visitType, vaccinationType]);

  const { fields: priceItemsFields, append: appendPriceItem, remove: removePriceItem } = useFieldArray({
    control,
    name: 'price_items',
  });

  const { fields: followUpsFields, append: appendFollowUp, remove: removeFollowUp } = useFieldArray({
    control,
    name: 'follow_ups',
  });

  useEffect(() => {
    if (clinicId) {
      fetchClients();
      fetchPriceItems();
    }
  }, [clinicId]);

  useEffect(() => {
    if (selectedClientId) {
      fetchPets(selectedClientId);
    } else {
      setPets([]);
    }
  }, [selectedClientId]);

  useEffect(() => {
    if (preSelectedClientId) {
      setSelectedClientId(preSelectedClientId);
    }
  }, [preSelectedClientId]);

  // Restore draft data if available
  useEffect(() => {
    if (draftDataToRestore && !visit) {
      Object.entries(draftDataToRestore).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          setValue(key as keyof VisitFormData, value as any);
          
          // Also update selectedClientId if client_id is being restored
          if (key === 'client_id' && typeof value === 'string') {
            setSelectedClientId(value);
          }
        }
      });
    }
  }, [draftDataToRestore, visit, setValue]);

  // Load existing visit data when editing
  useEffect(() => {
    const loadVisitData = async () => {
      if (!visit) return;

      // Parse visit_type for vaccination
      let visitType = visit.visit_type;
      let vaccinationType = '';
      if (visit.visit_type?.startsWith('vaccination:')) {
        const parts = visit.visit_type.split(':');
        visitType = 'vaccination';
        vaccinationType = parts[1] || '';
      }

      // Load price items for this visit
      let priceItemsData: { item_id: string; quantity: number }[] = [];
      if (clinicId) {
        const { data: visitPriceItems } = await supabase
          .from('visit_price_items')
          .select('*')
          .eq('visit_id', visit.id);

        if (visitPriceItems && visitPriceItems.length > 0) {
          priceItemsData = visitPriceItems.map((item: any) => ({
            item_id: item.price_item_id,
            quantity: item.quantity,
          }));
        }
      }

      // Use reset to set all values at once - this keeps isDirty = false
      reset({
        client_id: visit.client_id,
        pet_id: visit.pet_id,
        visit_type: visitType,
        vaccination_type: vaccinationType,
        vaccination_date: new Date().toISOString().slice(0, 10),
        visit_date: visit.visit_date.slice(0, 16),
        chief_complaint: visit.chief_complaint || '',
        general_history: (visit as any).general_history || '',
        medical_history: (visit as any).medical_history || '',
        current_history: (visit as any).current_history || '',
        physical_exam: visit.physical_exam || '',
        additional_tests: (visit as any).additional_tests || '',
        diagnoses: Array.isArray(visit.diagnoses) ? visit.diagnoses as any : [],
        treatments: Array.isArray(visit.treatments) ? visit.treatments as any : [],
        medications: Array.isArray(visit.medications) ? visit.medications as any : [],
        recommendations: visit.recommendations || '',
        client_summary: visit.client_summary || '',
        status: visit.status as 'open' | 'completed' | 'cancelled',
        price_items: priceItemsData,
        follow_ups: [],
      });

      // Set selected client to fetch pets
      setSelectedClientId(visit.client_id);
    };

    loadVisitData();
  }, [visit, clinicId, reset]);

  const fetchClients = async () => {
    if (!clinicId) return;
    const { data } = await supabase
      .from('clients')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('status', 'active')
      .order('first_name');
    if (data) setClients(data);
  };

  const fetchPets = async (clientId: string) => {
    if (!clinicId) return;
    const { data } = await supabase
      .from('pets')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('client_id', clientId)
      .eq('status', 'active')
      .order('name');
    if (data) setPets(data);
  };

  const fetchPriceItems = async () => {
    if (!clinicId) return;
    const { data } = await supabase
      .from('price_items')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('name');
    if (data) setPriceItems(data);
  };


  // Handle creating new price item
  const handleCreatePriceItem = async () => {
    if (!clinicId || !newPriceItem.name || !newPriceItem.price_with_vat) {
      toast({
        title: 'שגיאה',
        description: 'יש למלא שם ומחיר',
        variant: 'destructive',
      });
      return;
    }

    setSavingPriceItem(true);
    try {
      const priceWithVat = parseFloat(newPriceItem.price_with_vat);
      const priceBeforeVat = newPriceItem.price_before_vat
        ? parseFloat(newPriceItem.price_before_vat)
        : priceWithVat / 1.17; // Default 17% VAT

      const { data, error } = await supabase
        .from('price_items')
        .insert({
          clinic_id: clinicId,
          name: newPriceItem.name,
          category: newPriceItem.category || 'כללי',
          price_without_vat: priceBeforeVat,
          price_with_vat: priceWithVat,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'הצלחה',
        description: 'פריט החיוב נוסף בהצלחה',
      });

      // Refresh price items list
      await fetchPriceItems();

      // Add the new item to the visit
      if (data) {
        appendPriceItem({ item_id: data.id, quantity: 1 });
      }

      // Reset form and close dialog
      setNewPriceItem({ name: '', category: '', price_before_vat: '', price_with_vat: '' });
      setShowNewPriceItemDialog(false);
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSavingPriceItem(false);
    }
  };

  const onSubmit = (data: VisitFormData) => {
    // בנה את visit_type - אם יש חיסון ברשימה, הוסף את סוג החיסון
    let finalVisitType = data.visit_type;
    if (data.visit_type?.includes('vaccination') && data.vaccination_type) {
      // החלף את 'vaccination' עם 'vaccination:סוג_החיסון'
      finalVisitType = data.visit_type.replace('vaccination', `vaccination:${data.vaccination_type}`);
    }

    // Build clean data with only the fields we need
    const cleanedData = {
      client_id: data.client_id,
      pet_id: data.pet_id,
      visit_type: finalVisitType,
      visit_date: data.visit_date,
      chief_complaint: data.chief_complaint || null,
      general_history: data.general_history || null,
      medical_history: data.medical_history || null,
      current_history: data.current_history || null,
      physical_exam: data.physical_exam || null,
      additional_tests: data.additional_tests || null,
      recommendations: data.recommendations || null,
      client_summary: data.client_summary || null,
      diagnoses: data.diagnoses?.length ? data.diagnoses : null,
      treatments: data.treatments?.length ? data.treatments : null,
      medications: data.medications?.length ? data.medications : null,
      status: data.status,
    };

    // אם זה ביקור חיסון, צור תזכורת אוטומטית לחיסון הבא
    let followUps = [...(data.follow_ups || [])];

    if (data.visit_type?.includes('vaccination') && data.vaccination_type) {
      // ברירת מחדל: שנה קדימה (365 ימים)
      const vaccinationDate = new Date(data.vaccination_date || data.visit_date);
      const nextDueDate = addDays(vaccinationDate, 365);

      // הוסף תזכורת אוטומטית לחיסון הבא
      followUps.push({
        due_date: nextDueDate.toISOString().slice(0, 10),
        notes: `חיסון ${data.vaccination_type}`,
        reminder_type: 'vaccination',
      });
    }

    // Send with follow_ups and price_items as separate properties
    onSave({
      ...cleanedData,
      _follow_ups: followUps,
      _price_items: data.price_items
    });
  };

  // Set up submit ref for external triggering (after onSubmit is defined)
  useEffect(() => {
    if (submitRef) {
      submitRef.current = () => {
        handleSubmit(onSubmit)();
      };
    }
    return () => {
      if (submitRef) {
        submitRef.current = null;
      }
    };
  }, [submitRef, handleSubmit, onSubmit]);

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-right">
            {visit ? 'עריכת ביקור' : 'הוספת ביקור חדש'}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={handleCancelClick}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="max-h-[calc(90vh-120px)] overflow-y-auto">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Section 1: פרטים בסיסיים */}
          <div className="space-y-4 pb-4 border-b">
            <h3 className="text-lg font-semibold text-right">פרטים בסיסיים</h3>
            
            {/* בחירת לקוח וחיית מחמד - רק אם לא pre-selected */}
            {!preSelectedClientId && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>לקוח *</Label>
                  <Select
                    value={watch('client_id') || ''}
                    onValueChange={(value) => {
                      setValue('client_id', value, { shouldValidate: true });
                      setSelectedClientId(value);
                      setValue('pet_id', '');
                    }}
                  >
                    <SelectTrigger className="text-right">
                      <SelectValue placeholder="בחר לקוח" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.first_name} {client.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.client_id && (
                    <p className="text-sm text-destructive">{errors.client_id.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>חיית מחמד *</Label>
                  <Select
                    value={watch('pet_id') || ''}
                    onValueChange={(value) => setValue('pet_id', value, { shouldValidate: true })}
                    disabled={!selectedClientId}
                  >
                    <SelectTrigger className="text-right">
                      <SelectValue placeholder="בחר חיית מחמד" />
                    </SelectTrigger>
                    <SelectContent>
                      {pets.map((pet) => (
                        <SelectItem key={pet.id} value={pet.id}>
                          {pet.name} ({pet.species})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.pet_id && (
                    <p className="text-sm text-destructive">{errors.pet_id.message}</p>
                  )}
                </div>
              </div>
            )}

            {/* אם יש pre-selected, רק להציג את המידע */}
            {preSelectedClientId && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>לקוח</Label>
                  <div className="p-2 bg-muted/50 rounded-md text-right">
                    {clients.find(c => c.id === preSelectedClientId)?.first_name} {clients.find(c => c.id === preSelectedClientId)?.last_name}
                  </div>
                </div>
                {preSelectedPetId && (
                  <div className="space-y-2">
                    <Label>חיית מחמד</Label>
                    <div className="p-2 bg-muted/50 rounded-md text-right">
                      {pets.find(p => p.id === preSelectedPetId)?.name} ({pets.find(p => p.id === preSelectedPetId)?.species})
                    </div>
                  </div>
                )}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>סוג ביקור *</Label>
                <TagInput
                  category="visit_type"
                  value={watch('visit_type')?.split(',').filter(Boolean) || []}
                  onChange={(values) => {
                    const valueStr = Array.isArray(values) ? values.join(',') : values;
                    setValue('visit_type', valueStr, { shouldValidate: true });
                    // נקה את סוג החיסון אם אין חיסון ברשימה
                    const valuesArr = Array.isArray(values) ? values : [values];
                    if (!valuesArr.includes('vaccination')) {
                      setValue('vaccination_type', '');
                    }
                  }}
                  placeholder="בחר סוג ביקור"
                  multiple={true}
                />
                {errors.visit_type && (
                  <p className="text-sm text-destructive">{errors.visit_type.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>תאריך ושעה *</Label>
                <Input type="datetime-local" {...register('visit_date')} />
                {errors.visit_date && (
                  <p className="text-sm text-destructive">{errors.visit_date.message}</p>
                )}
              </div>
            </div>

            {/* בחירת סוג חיסון - מופיע רק כשסוג הביקור כולל חיסון */}
            {watch('visit_type')?.includes('vaccination') && (
                <div className="space-y-4 bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-blue-800 flex items-center gap-2">
                        <Syringe className="h-4 w-4" />
                        סוג החיסון *
                      </Label>
                      <TagInput
                        category="vaccination_type"
                        value={watch('vaccination_type') || ''}
                        onChange={(value) => setValue('vaccination_type', value as string)}
                        placeholder="בחר סוג חיסון"
                        allowCreate={true}
                        className="bg-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-blue-800 flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        תאריך החיסון
                      </Label>
                      <Input
                        type="date"
                        {...register('vaccination_date')}
                        className="bg-white text-right"
                        defaultValue={new Date().toISOString().slice(0, 10)}
                      />
                    </div>
                  </div>

                  {/* תצוגת תאריך החיסון הבא - חיסון שנתי כברירת מחדל */}
                  {watch('vaccination_type') && (() => {
                    const vaccinationDateStr = watch('vaccination_date') || new Date().toISOString().slice(0, 10);
                    const vaccinationDate = new Date(vaccinationDateStr);
                    // ברירת מחדל: שנה קדימה (365 ימים)
                    const nextVaccinationDate = addDays(vaccinationDate, 365);

                    return (
                      <div className="bg-green-100 border border-green-300 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-green-800 flex-wrap">
                          <Calendar className="h-4 w-4" />
                          <span className="font-medium">חיסון הבא:</span>
                          <span className="font-bold">
                            {format(nextVaccinationDate, 'dd/MM/yyyy', { locale: he })}
                          </span>
                          <span className="text-sm text-green-600">(שנה)</span>
                        </div>
                        <p className="text-xs text-green-600 mt-1">
                          תזכורת תיווצר אוטומטית בעת שמירת הביקור
                        </p>
                      </div>
                    );
                  })()}
                </div>
              )}
          </div>

          {/* Section 2: בדיקה */}
          <div className="space-y-4 pb-4 border-b">
            <h3 className="text-lg font-semibold text-right">בדיקה</h3>
              {/* תלונה עיקרית - תגיות */}
              <div className="space-y-2">
                <Label>תלונה עיקרית</Label>
                <TagInput
                  category="chief_complaint"
                  value={watch('chief_complaint')?.split(',').filter(Boolean) || []}
                  onChange={(values) => setValue('chief_complaint', Array.isArray(values) ? values.join(', ') : values)}
                  placeholder="בחר או הקלד תלונה עיקרית"
                  allowCreate={true}
                  multiple={true}
                />
              </div>

              {/* היסטוריה כללית - טקסט חופשי */}
              <div className="space-y-2">
                <Label>היסטוריה כללית</Label>
                <AITextarea
                  value={watch('general_history') || ''}
                  onValueChange={(value) => setValue('general_history', value)}
                  aiContext="visit_notes"
                  className="text-right min-h-[80px]"
                  placeholder="היסטוריה כללית של החיה..."
                />
              </div>

              {/* היסטוריה רפואית - טקסט חופשי */}
              <div className="space-y-2">
                <Label>היסטוריה רפואית</Label>
                <AITextarea
                  value={watch('medical_history') || ''}
                  onValueChange={(value) => setValue('medical_history', value)}
                  aiContext="visit_notes"
                  className="text-right min-h-[80px]"
                  placeholder="מחלות קודמות, ניתוחים, אלרגיות..."
                />
              </div>

              {/* היסטוריה נוכחית - טקסט חופשי */}
              <div className="space-y-2">
                <Label>היסטוריה נוכחית</Label>
                <AITextarea
                  value={watch('current_history') || ''}
                  onValueChange={(value) => setValue('current_history', value)}
                  aiContext="visit_notes"
                  className="text-right min-h-[80px]"
                  placeholder="מה קרה? מתי התחיל? האם השתנה משהו באחרונה?..."
                />
              </div>

              {/* בדיקה פיזיקלית - טקסט חופשי */}
              <div className="space-y-2">
                <Label>בדיקה פיזיקלית</Label>
                <AITextarea
                  value={watch('physical_exam') || ''}
                  onValueChange={(value) => setValue('physical_exam', value)}
                  aiContext="visit_notes"
                  className="text-right min-h-[100px]"
                  placeholder="ממצאים מבדיקה גופנית: טמפרטורה, דופק, נשימה, ריריות, בלוטות לימפה..."
                />
              </div>

              {/* בדיקות נוספות - טקסט חופשי */}
              <div className="space-y-2">
                <Label>בדיקות נוספות</Label>
                <AITextarea
                  value={watch('additional_tests') || ''}
                  onValueChange={(value) => setValue('additional_tests', value)}
                  aiContext="visit_notes"
                  className="text-right min-h-[80px]"
                  placeholder="צילומים, בדיקות דם, שתן, אולטרסאונד..."
                />
              </div>
          </div>

          {/* Section 3: אבחנה */}
          <div className="space-y-4 pb-4 border-b">
            <h3 className="text-lg font-semibold text-right">אבחנה</h3>
              <div className="flex justify-between items-center">
                <Label>אבחנות</Label>
                <Button type="button" size="sm" onClick={() => appendDiagnosis({ diagnosis: '', notes: '' })}>
                  <Plus className="h-4 w-4 ml-2" />
                  הוסף אבחנה
                </Button>
              </div>
              {diagnosesFields.map((field, index) => (
                <div key={field.id} className="flex gap-2 items-start">
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeDiagnosis(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <div className="flex-1 space-y-2">
                    <TagInput
                      category="diagnosis"
                      value={watch(`diagnoses.${index}.diagnosis`) || ''}
                      onChange={(value) => setValue(`diagnoses.${index}.diagnosis`, value as string)}
                      placeholder="בחר או הקלד אבחנה"
                      allowCreate={true}
                    />
                    <Input {...register(`diagnoses.${index}.notes`)} className="text-right" placeholder="הערות" />
                  </div>
                </div>
              ))}
          </div>

          {/* Section 4: טיפול */}
          <div className="space-y-4 pb-4 border-b">
            <h3 className="text-lg font-semibold text-right">טיפול</h3>
              <div>
                <div className="flex justify-between items-center mb-4">
                  <Label>טיפולים</Label>
                  <Button type="button" size="sm" onClick={() => appendTreatment({ treatment: '', notes: '' })}>
                    <Plus className="h-4 w-4 ml-2" />
                    הוסף טיפול
                  </Button>
                </div>
                {treatmentsFields.map((field, index) => {
                  const treatmentName = watch(`treatments.${index}.treatment`) || '';
                  const key = treatmentName ? `treatment-${index}-${treatmentName}` : `treatment-${index}-empty`;
                  const needsPrice = itemsNeedingPrice.has(key);
                  const priceData = newItemPrices.get(key) || { price_with_vat: '', price_without_vat: '' };
                  
                  return (
                    <div key={field.id} className="flex gap-2 items-start mb-2">
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeTreatment(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <div className="flex-1 space-y-2">
                        <TagInput
                          category="treatment"
                          value={treatmentName}
                          onChange={(value) => setValue(`treatments.${index}.treatment`, value as string)}
                          placeholder="בחר או הקלד טיפול"
                          allowCreate={true}
                        />
                        <Input {...register(`treatments.${index}.notes`)} className="text-right" placeholder="הערות" />
                        {needsPrice && (
                          <div className="bg-yellow-50 border border-yellow-200 rounded p-2 space-y-2">
                            <Label className="text-xs text-yellow-800">הפריט לא נמצא במחירון - הזן מחיר:</Label>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label className="text-xs">מחיר ללא מע״מ</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={priceData.price_without_vat}
                                  onChange={(e) => {
                                    const withoutVat = e.target.value;
                                    const withVat = withoutVat ? (parseFloat(withoutVat) * 1.17).toFixed(2) : '';
                                    setNewItemPrices(prev => {
                                      const newMap = new Map(prev);
                                      newMap.set(key, { price_without_vat: withoutVat, price_with_vat: withVat });
                                      return newMap;
                                    });
                                  }}
                                  placeholder="0.00"
                                  className="text-right text-sm"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">מחיר כולל מע״מ</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={priceData.price_with_vat}
                                  onChange={(e) => {
                                    const withVat = e.target.value;
                                    const withoutVat = withVat ? (parseFloat(withVat) / 1.17).toFixed(2) : '';
                                    setNewItemPrices(prev => {
                                      const newMap = new Map(prev);
                                      newMap.set(key, { price_without_vat: withoutVat, price_with_vat: withVat });
                                      return newMap;
                                    });
                                  }}
                                  placeholder="0.00"
                                  className="text-right text-sm"
                                />
                              </div>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="default"
                              className="w-full"
                              disabled={!priceData.price_with_vat || parseFloat(priceData.price_with_vat) <= 0}
                              onClick={async () => {
                                const priceWithVat = parseFloat(priceData.price_with_vat);
                                const priceWithoutVat = parseFloat(priceData.price_without_vat);
                                if (priceWithVat > 0 && treatmentName) {
                                  // Save current scroll position
                                  const scrollContainer = document.querySelector('.max-h-\\[calc\\(90vh-120px\\)\\]') || window;
                                  const scrollY = scrollContainer === window ? window.scrollY : (scrollContainer as Element).scrollTop;
                                  
                                  const priceItemId = await createAndAddPriceItem(treatmentName, 'טיפולים', priceWithVat, priceWithoutVat);
                                  if (priceItemId) {
                                    const currentPriceItems = watch('price_items') || [];
                                    const exists = currentPriceItems.some(pi => pi.item_id === priceItemId);
                                    if (!exists) {
                                      appendPriceItem({ item_id: priceItemId, quantity: 1 });
                                    }
                                    setAddedToPricing(prev => new Set(prev).add(key));
                                    setItemsNeedingPrice(prev => {
                                      const newMap = new Map(prev);
                                      newMap.delete(key);
                                      return newMap;
                                    });
                                    setNewItemPrices(prev => {
                                      const newMap = new Map(prev);
                                      newMap.delete(key);
                                      return newMap;
                                    });
                                    
                                    // Restore scroll position after state updates
                                    requestAnimationFrame(() => {
                                      if (scrollContainer === window) {
                                        window.scrollTo(0, scrollY);
                                      } else {
                                        (scrollContainer as Element).scrollTop = scrollY;
                                      }
                                    });
                                    
                                    toast({
                                      title: 'הצלחה',
                                      description: 'הפריט נוסף לתמחור',
                                    });
                                  }
                                }
                              }}
                            >
                              הוסף לתמחור
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div>
                <div className="flex justify-between items-center mb-4">
                  <Label>תרופות</Label>
                  <Button type="button" size="sm" onClick={() => appendMedication({ medication: '', dosage: '', frequency: '' })}>
                    <Plus className="h-4 w-4 ml-2" />
                    הוסף תרופה
                  </Button>
                </div>
                {medicationsFields.map((field, index) => {
                  const medicationName = watch(`medications.${index}.medication`) || '';
                  const key = medicationName ? `medication-${index}-${medicationName}` : `medication-${index}-empty`;
                  const needsPrice = itemsNeedingPrice.has(key);
                  const priceData = newItemPrices.get(key) || { price_with_vat: '', price_without_vat: '' };
                  
                  return (
                    <div key={field.id} className="flex gap-2 items-start mb-2">
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeMedication(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <div className="flex-1 space-y-2">
                        <div className="grid grid-cols-3 gap-2">
                          <TagInput
                            category="medication"
                            value={medicationName}
                            onChange={(value) => setValue(`medications.${index}.medication`, value as string)}
                            placeholder="בחר או הקלד תרופה"
                            allowCreate={true}
                          />
                          <Input {...register(`medications.${index}.dosage`)} className="text-right" placeholder="מינון" />
                          <Input {...register(`medications.${index}.frequency`)} className="text-right" placeholder="תדירות" />
                        </div>
                        {needsPrice && (
                          <div className="bg-yellow-50 border border-yellow-200 rounded p-2 space-y-2">
                            <Label className="text-xs text-yellow-800">הפריט לא נמצא במחירון - הזן מחיר:</Label>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label className="text-xs">מחיר ללא מע״מ</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={priceData.price_without_vat}
                                  onChange={(e) => {
                                    const withoutVat = e.target.value;
                                    const withVat = withoutVat ? (parseFloat(withoutVat) * 1.17).toFixed(2) : '';
                                    setNewItemPrices(prev => {
                                      const newMap = new Map(prev);
                                      newMap.set(key, { price_without_vat: withoutVat, price_with_vat: withVat });
                                      return newMap;
                                    });
                                  }}
                                  placeholder="0.00"
                                  className="text-right text-sm"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">מחיר כולל מע״מ</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={priceData.price_with_vat}
                                  onChange={(e) => {
                                    const withVat = e.target.value;
                                    const withoutVat = withVat ? (parseFloat(withVat) / 1.17).toFixed(2) : '';
                                    setNewItemPrices(prev => {
                                      const newMap = new Map(prev);
                                      newMap.set(key, { price_without_vat: withoutVat, price_with_vat: withVat });
                                      return newMap;
                                    });
                                  }}
                                  placeholder="0.00"
                                  className="text-right text-sm"
                                />
                              </div>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="default"
                              className="w-full"
                              disabled={!priceData.price_with_vat || parseFloat(priceData.price_with_vat) <= 0}
                              onClick={async (e) => {
                                const priceWithVat = parseFloat(priceData.price_with_vat);
                                const priceWithoutVat = parseFloat(priceData.price_without_vat);
                                if (priceWithVat > 0 && medicationName) {
                                  // Save current scroll position from the scrollable container
                                  const scrollContainer = (e.currentTarget as HTMLElement).closest('.overflow-y-auto') as HTMLElement;
                                  const scrollY = scrollContainer?.scrollTop ?? window.scrollY;
                                  
                                  const priceItemId = await createAndAddPriceItem(medicationName, 'תרופות', priceWithVat, priceWithoutVat);
                                  if (priceItemId) {
                                    const currentPriceItems = watch('price_items') || [];
                                    const exists = currentPriceItems.some(pi => pi.item_id === priceItemId);
                                    if (!exists) {
                                      appendPriceItem({ item_id: priceItemId, quantity: 1 });
                                    }
                                    setAddedToPricing(prev => new Set(prev).add(key));
                                    setItemsNeedingPrice(prev => {
                                      const newMap = new Map(prev);
                                      newMap.delete(key);
                                      return newMap;
                                    });
                                    setNewItemPrices(prev => {
                                      const newMap = new Map(prev);
                                      newMap.delete(key);
                                      return newMap;
                                    });
                                    
                                    // Restore scroll position after state updates
                                    setTimeout(() => {
                                      if (scrollContainer) {
                                        scrollContainer.scrollTop = scrollY;
                                      } else {
                                        window.scrollTo(0, scrollY);
                                      }
                                    }, 0);
                                    
                                    toast({
                                      title: 'הצלחה',
                                      description: 'הפריט נוסף לתמחור',
                                    });
                                  }
                                }
                              }}
                            >
                              הוסף לתמחור
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-2">
                <Label>המלצות</Label>
                <AITextarea
                  value={watch('recommendations') || ''}
                  onValueChange={(value) => setValue('recommendations', value)}
                  aiContext="recommendations"
                  className="text-right min-h-[100px]"
                  placeholder="המלצות לבעלים..."
                />
              </div>

              <div className="space-y-2">
                <Label>סיכום ללקוח</Label>
                <AITextarea
                  value={watch('client_summary') || ''}
                  onValueChange={(value) => setValue('client_summary', value)}
                  aiContext="client_summary"
                  className="text-right min-h-[100px]"
                  placeholder="סיכום בשפה פשוטה ללקוח..."
                />
              </div>
          </div>

          {/* Section 5: פולואו אפ */}
          <div className="space-y-4 pb-4 border-b">
            <h3 className="text-lg font-semibold text-right">פולואו אפ</h3>
            <div className="bg-muted/50 p-4 rounded-lg mb-4" dir="rtl">
              <p className="text-sm text-muted-foreground">
                הוסף תזכורות לפולואו אפ שיופיעו ביומן ובדף התזכורות
              </p>
            </div>
            
            <div className="flex justify-between items-center">
              <Label>תזכורות פולואו אפ</Label>
              <Button 
                type="button" 
                size="sm" 
                onClick={() => appendFollowUp({ 
                  due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10), 
                  notes: '', 
                  reminder_type: 'follow_up' 
                })}
              >
                <Plus className="h-4 w-4 ml-2" />
                הוסף תזכורת
              </Button>
            </div>
            
            {followUpsFields.map((field, index) => (
              <div key={field.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <Label>תזכורת #{index + 1}</Label>
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeFollowUp(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>תאריך</Label>
                    <Input 
                      type="date" 
                      {...register(`follow_ups.${index}.due_date`)} 
                      className="text-right" 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>סוג תזכורת</Label>
                    <TagInput
                      category="reminder_type"
                      value={watch(`follow_ups.${index}.reminder_type`) || 'follow_up'}
                      onChange={(value) => setValue(`follow_ups.${index}.reminder_type`, value as string)}
                      placeholder="בחר סוג תזכורת"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>הערות</Label>
                  <AITextarea
                    value={watch(`follow_ups.${index}.notes`) || ''}
                    onValueChange={(value) => setValue(`follow_ups.${index}.notes`, value)}
                    aiContext="general"
                    className="text-right"
                    placeholder="למה צריך לעשות פולואו אפ..."
                    rows={3}
                  />
                </div>
              </div>
            ))}
            
            {followUpsFields.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                לא הוגדרו תזכורות פולואו אפ
              </div>
            )}
          </div>

          {/* Section 6: חיוב */}
          <div className="space-y-4 pb-4 border-b">
            <h3 className="text-lg font-semibold text-right">חיוב</h3>
              <div className="flex justify-between items-center">
                <Label>פריטי חיוב</Label>
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => setShowNewPriceItemDialog(true)}>
                    <PlusCircle className="h-4 w-4 ml-2" />
                    צור פריט חדש
                  </Button>
                  <Button type="button" size="sm" onClick={() => appendPriceItem({ item_id: '', quantity: 1 })}>
                    <Plus className="h-4 w-4 ml-2" />
                    הוסף פריט קיים
                  </Button>
                </div>
              </div>

              {/* הודעה אם אין פריטים */}
              {priceItems.length === 0 && (
                <div className="text-center py-4 text-muted-foreground bg-muted/30 rounded-lg">
                  <p>אין פריטי חיוב במערכת</p>
                  <Button
                    type="button"
                    variant="link"
                    onClick={() => setShowNewPriceItemDialog(true)}
                    className="mt-2"
                  >
                    <PlusCircle className="h-4 w-4 ml-2" />
                    צור פריט חיוב ראשון
                  </Button>
                </div>
              )}

              {priceItemsFields.map((field, index) => (
                <div key={field.id} className="flex gap-2 items-start">
                  <Button type="button" variant="ghost" size="icon" onClick={() => removePriceItem(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Select
                    value={watch(`price_items.${index}.item_id`) || ''}
                    onValueChange={(value) => setValue(`price_items.${index}.item_id`, value)}
                  >
                    <SelectTrigger className="flex-1 text-right">
                      <SelectValue placeholder="בחר פריט" />
                    </SelectTrigger>
                    <SelectContent>
                      {priceItems.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name} - ₪{item.price_with_vat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min="1"
                    {...register(`price_items.${index}.quantity`, { valueAsNumber: true })}
                    className="w-24 text-right"
                    placeholder="כמות"
                  />
                </div>
              ))}

              {/* סכום כולל */}
              {priceItemsFields.length > 0 && (
                <div className="border-t pt-4 mt-4">
                  <div className="flex justify-between items-center text-lg font-semibold">
                    <span>סה״כ לחיוב:</span>
                    <span>
                      ₪{priceItemsFields.reduce((total, _, index) => {
                        const itemId = watch(`price_items.${index}.item_id`);
                        const quantity = watch(`price_items.${index}.quantity`) || 1;
                        const item = priceItems.find(p => p.id === itemId);
                        return total + (item?.price_with_vat || 0) * quantity;
                      }, 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-start pt-4">
            <Button type="submit">
              {visit ? 'עדכן' : 'הוסף ביקור'}
            </Button>
            <Button type="button" variant="outline" onClick={handleCancelClick}>
              ביטול
            </Button>
          </div>
        </form>
      </CardContent>

      {/* Dialog for creating new price item */}
      <Dialog open={showNewPriceItemDialog} onOpenChange={setShowNewPriceItemDialog}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>יצירת פריט חיוב חדש</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>שם הפריט *</Label>
              <Input
                value={newPriceItem.name}
                onChange={(e) => setNewPriceItem(prev => ({ ...prev, name: e.target.value }))}
                placeholder="למשל: בדיקה כללית"
                className="text-right"
              />
            </div>

            <div className="space-y-2">
              <Label>קטגוריה</Label>
              <Select
                value={newPriceItem.category}
                onValueChange={(value) => setNewPriceItem(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger className="text-right">
                  <SelectValue placeholder="בחר קטגוריה" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="בדיקות">בדיקות</SelectItem>
                  <SelectItem value="טיפולים">טיפולים</SelectItem>
                  <SelectItem value="ניתוחים">ניתוחים</SelectItem>
                  <SelectItem value="חיסונים">חיסונים</SelectItem>
                  <SelectItem value="תרופות">תרופות</SelectItem>
                  <SelectItem value="מעבדה">מעבדה</SelectItem>
                  <SelectItem value="אשפוז">אשפוז</SelectItem>
                  <SelectItem value="כללי">כללי</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>מחיר כולל מע״מ *</Label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.01"
                    value={newPriceItem.price_with_vat}
                    onChange={(e) => {
                      const withVat = e.target.value;
                      const beforeVat = withVat ? (parseFloat(withVat) / 1.17).toFixed(2) : '';
                      setNewPriceItem(prev => ({
                        ...prev,
                        price_with_vat: withVat,
                        price_before_vat: beforeVat,
                      }));
                    }}
                    placeholder="0.00"
                    className="text-right pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">₪</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>מחיר לפני מע״מ</Label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.01"
                    value={newPriceItem.price_before_vat}
                    onChange={(e) => setNewPriceItem(prev => ({ ...prev, price_before_vat: e.target.value }))}
                    placeholder="0.00"
                    className="text-right pr-8 bg-muted/30"
                    readOnly
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">₪</span>
                </div>
                <p className="text-xs text-muted-foreground">מחושב אוטומטית (17% מע״מ)</p>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button onClick={handleCreatePriceItem} disabled={savingPriceItem} className="flex-1">
                {savingPriceItem ? 'שומר...' : 'צור והוסף לביקור'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowNewPriceItemDialog(false)}>
                ביטול
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation dialog for unsaved changes */}
      <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-right">יש שינויים שלא נשמרו</AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              האם את בטוחה שברצונך לצאת? השינויים שלא נשמרו יאבדו.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>המשך לערוך</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmCancel}>
              צא בלי לשמור
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </Card>
  );
};