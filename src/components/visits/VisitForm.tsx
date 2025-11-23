import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Tables } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useClinic } from '@/hooks/useClinic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Visit = Tables<'visits'>;
type Client = Tables<'clients'>;
type Pet = Tables<'pets'>;
type PriceItem = Tables<'price_items'>;

const visitSchema = z.object({
  client_id: z.string().min(1, 'יש לבחור לקוח'),
  pet_id: z.string().min(1, 'יש לבחור חיית מחמד'),
  visit_type: z.string().min(1, 'יש לבחור סוג ביקור').max(100),
  visit_date: z.string().min(1, 'יש להזין תאריך'),
  chief_complaint: z.string().max(1000).optional().or(z.literal('')),
  history: z.string().max(2000).optional().or(z.literal('')),
  physical_exam: z.string().max(2000).optional().or(z.literal('')),
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
}

export const VisitForm = ({ onSave, onCancel, visit, preSelectedClientId, preSelectedPetId }: VisitFormProps) => {
  const { clinicId } = useClinic();
  const [clients, setClients] = useState<Client[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [priceItems, setPriceItems] = useState<PriceItem[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>(preSelectedClientId || '');

  const { register, handleSubmit, reset, watch, setValue, control, formState: { errors } } = useForm<VisitFormData>({
    resolver: zodResolver(visitSchema),
    defaultValues: {
      client_id: preSelectedClientId || '',
      pet_id: preSelectedPetId || '',
      visit_type: '',
      visit_date: new Date().toISOString().slice(0, 16),
      chief_complaint: '',
      history: '',
      physical_exam: '',
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

  const onSubmit = (data: VisitFormData) => {
    // Build clean data with only the fields we need
    const cleanedData = {
      client_id: data.client_id,
      pet_id: data.pet_id,
      visit_type: data.visit_type,
      visit_date: data.visit_date,
      chief_complaint: data.chief_complaint || null,
      history: data.history || null,
      physical_exam: data.physical_exam || null,
      recommendations: data.recommendations || null,
      client_summary: data.client_summary || null,
      diagnoses: data.diagnoses?.length ? data.diagnoses : null,
      treatments: data.treatments?.length ? data.treatments : null,
      medications: data.medications?.length ? data.medications : null,
      status: data.status,
    };
    
    // Send with follow_ups and price_items as separate properties
    onSave({ 
      ...cleanedData,
      _follow_ups: data.follow_ups, 
      _price_items: data.price_items 
    });
  };

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-right">
            {visit ? 'עריכת ביקור' : 'הוספת ביקור חדש'}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="basic">פרטים</TabsTrigger>
              <TabsTrigger value="exam">בדיקה</TabsTrigger>
              <TabsTrigger value="diagnosis">אבחנה</TabsTrigger>
              <TabsTrigger value="treatment">טיפול</TabsTrigger>
              <TabsTrigger value="followup">פולואו אפ</TabsTrigger>
              <TabsTrigger value="billing">חיוב</TabsTrigger>
            </TabsList>

            {/* Basic Info */}
            <TabsContent value="basic" className="space-y-4 mt-4">
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>סוג ביקור *</Label>
                  <Input {...register('visit_type')} className="text-right" placeholder="בדיקה כללית, חיסון, ניתוח..." />
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

              <div className="space-y-2">
                <Label>תלונה עיקרית</Label>
                <Textarea {...register('chief_complaint')} className="text-right" placeholder="מה הבעיה שהביאה את הבעלים..." />
              </div>

              <div className="space-y-2">
                <Label>היסטוריה רפואית</Label>
                <Textarea {...register('history')} className="text-right min-h-[100px]" placeholder="היסטוריה רפואית רלוונטית..." />
              </div>
            </TabsContent>

            {/* Physical Exam */}
            <TabsContent value="exam" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>בדיקה גופנית</Label>
                <Textarea {...register('physical_exam')} className="text-right min-h-[200px]" placeholder="ממצאים מבדיקה גופנית..." />
              </div>
            </TabsContent>

            {/* Diagnosis */}
            <TabsContent value="diagnosis" className="space-y-4 mt-4">
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
                    <Input {...register(`diagnoses.${index}.diagnosis`)} className="text-right" placeholder="אבחנה" />
                    <Input {...register(`diagnoses.${index}.notes`)} className="text-right" placeholder="הערות" />
                  </div>
                </div>
              ))}
            </TabsContent>

            {/* Treatment */}
            <TabsContent value="treatment" className="space-y-4 mt-4">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <Label>טיפולים</Label>
                  <Button type="button" size="sm" onClick={() => appendTreatment({ treatment: '', notes: '' })}>
                    <Plus className="h-4 w-4 ml-2" />
                    הוסף טיפול
                  </Button>
                </div>
                {treatmentsFields.map((field, index) => (
                  <div key={field.id} className="flex gap-2 items-start mb-2">
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeTreatment(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <div className="flex-1 space-y-2">
                      <Input {...register(`treatments.${index}.treatment`)} className="text-right" placeholder="טיפול" />
                      <Input {...register(`treatments.${index}.notes`)} className="text-right" placeholder="הערות" />
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <div className="flex justify-between items-center mb-4">
                  <Label>תרופות</Label>
                  <Button type="button" size="sm" onClick={() => appendMedication({ medication: '', dosage: '', frequency: '' })}>
                    <Plus className="h-4 w-4 ml-2" />
                    הוסף תרופה
                  </Button>
                </div>
                {medicationsFields.map((field, index) => (
                  <div key={field.id} className="flex gap-2 items-start mb-2">
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeMedication(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <div className="flex-1 grid grid-cols-3 gap-2">
                      <Input {...register(`medications.${index}.medication`)} className="text-right" placeholder="תרופה" />
                      <Input {...register(`medications.${index}.dosage`)} className="text-right" placeholder="מינון" />
                      <Input {...register(`medications.${index}.frequency`)} className="text-right" placeholder="תדירות" />
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Label>המלצות</Label>
                <Textarea {...register('recommendations')} className="text-right min-h-[100px]" placeholder="המלצות לבעלים..." />
              </div>

              <div className="space-y-2">
                <Label>סיכום ללקוח</Label>
                <Textarea {...register('client_summary')} className="text-right min-h-[100px]" placeholder="סיכום בשפה פשוטה ללקוח..." />
              </div>
            </TabsContent>

            {/* Billing */}
            <TabsContent value="billing" className="space-y-4 mt-4">
              <div className="flex justify-between items-center">
                <Label>פריטי חיוב</Label>
                <Button type="button" size="sm" onClick={() => appendPriceItem({ item_id: '', quantity: 1 })}>
                  <Plus className="h-4 w-4 ml-2" />
                  הוסף פריט
                </Button>
              </div>
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
            </TabsContent>

            {/* Follow-up */}
            <TabsContent value="followup" className="space-y-4 mt-4">
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
                      <Select
                        value={watch(`follow_ups.${index}.reminder_type`) || 'follow_up'}
                        onValueChange={(value) => setValue(`follow_ups.${index}.reminder_type`, value)}
                      >
                        <SelectTrigger className="text-right">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="follow_up">בדיקת מעקב</SelectItem>
                          <SelectItem value="vaccination">חיסון</SelectItem>
                          <SelectItem value="medication">תרופות</SelectItem>
                          <SelectItem value="test_results">תוצאות בדיקה</SelectItem>
                          <SelectItem value="general">כללי</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>הערות</Label>
                    <Textarea 
                      {...register(`follow_ups.${index}.notes`)} 
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
            </TabsContent>
          </Tabs>

          <div className="flex gap-3 justify-start pt-4 mt-4 border-t">
            <Button type="submit">
              {visit ? 'עדכן' : 'הוסף ביקור'}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              ביטול
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};