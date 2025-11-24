import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Tables } from '@/integrations/supabase/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useClinic } from '@/hooks/useClinic';

type Visit = Tables<'visits'> & {
  clients?: Tables<'clients'> | null;
  pets?: Tables<'pets'> | null;
};
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
});

type VisitFormData = z.infer<typeof visitSchema>;

interface VisitCardProps {
  visit?: Visit | null;
  mode?: 'view' | 'edit';
  onSave?: (data: any) => void;
  onCancel?: () => void;
}

const statusConfig = {
  open: { label: 'פתוח', variant: 'default' as const },
  completed: { label: 'הושלם', variant: 'secondary' as const },
  cancelled: { label: 'בוטל', variant: 'destructive' as const },
};

export const VisitCard = ({ visit, mode = 'view', onSave, onCancel }: VisitCardProps) => {
  const { clinicId } = useClinic();
  const [clients, setClients] = useState<Client[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [priceItems, setPriceItems] = useState<PriceItem[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>(visit?.client_id || '');

  const { register, handleSubmit, watch, setValue, control, formState: { errors } } = useForm<VisitFormData>({
    resolver: zodResolver(visitSchema),
    defaultValues: {
      client_id: visit?.client_id || '',
      pet_id: visit?.pet_id || '',
      visit_type: visit?.visit_type || '',
      visit_date: visit?.visit_date || new Date().toISOString().slice(0, 16),
      chief_complaint: visit?.chief_complaint || '',
      history: visit?.history || '',
      physical_exam: visit?.physical_exam || '',
      diagnoses: (visit?.diagnoses as any[]) || [],
      treatments: (visit?.treatments as any[]) || [],
      medications: (visit?.medications as any[]) || [],
      recommendations: visit?.recommendations || '',
      client_summary: visit?.client_summary || '',
      status: (visit?.status as 'open' | 'completed' | 'cancelled') || 'open',
      price_items: [],
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

  useEffect(() => {
    if (clinicId && mode === 'edit') {
      fetchClients();
      fetchPriceItems();
    }
  }, [clinicId, mode]);

  useEffect(() => {
    if (selectedClientId && mode === 'edit') {
      fetchPets(selectedClientId);
    } else if (mode === 'edit') {
      setPets([]);
    }
  }, [selectedClientId, mode]);

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

    onSave?.({
      ...cleanedData,
      _price_items: data.price_items
    });
  };

  // Get selected client and pet names for display
  const selectedClient = clients.find(c => c.id === watch('client_id'));
  const selectedPet = pets.find(p => p.id === watch('pet_id'));

  // View Mode
  if (mode === 'view' && visit) {
    return (
      <div className="space-y-6" dir="rtl">
        {/* Header Info */}
        <div className="flex items-center gap-4 flex-wrap pb-4 border-b justify-end">
          <div className="text-sm text-muted-foreground">
            <span className="font-medium">תאריך:</span>{' '}
            {format(new Date(visit.visit_date), 'dd/MM/yyyy HH:mm', { locale: he })}
          </div>
          {visit.clients && (
            <div className="text-sm">
              <span className="font-medium">לקוח:</span>{' '}
              {visit.clients.first_name} {visit.clients.last_name}
            </div>
          )}
          {visit.pets && (
            <div className="text-sm">
              <span className="font-medium">חיית מחמד:</span>{' '}
              {visit.pets.name} ({visit.pets.species})
            </div>
          )}
          <Badge variant="outline">{visit.visit_type}</Badge>
          <Badge variant={statusConfig[visit.status as keyof typeof statusConfig]?.variant || 'default'}>
            {statusConfig[visit.status as keyof typeof statusConfig]?.label || visit.status}
          </Badge>
        </div>

        {/* Visit Details */}
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            {visit.chief_complaint && (
              <div>
                <h4 className="font-semibold text-sm mb-2">תלונה עיקרית</h4>
                <p className="text-sm text-muted-foreground">{visit.chief_complaint}</p>
              </div>
            )}

            {visit.history && (
              <div>
                <h4 className="font-semibold text-sm mb-2">היסטוריה</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{visit.history}</p>
              </div>
            )}

            {visit.physical_exam && (
              <div>
                <h4 className="font-semibold text-sm mb-2">בדיקה גופנית</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{visit.physical_exam}</p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {visit.diagnoses && Array.isArray(visit.diagnoses) && visit.diagnoses.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2">אבחנות</h4>
                <div className="space-y-2">
                  {visit.diagnoses.map((diagnosis: any, idx: number) => (
                    <div key={idx} className="text-sm bg-accent/50 rounded p-2">
                      <p className="font-medium">{diagnosis.diagnosis}</p>
                      {diagnosis.notes && (
                        <p className="text-muted-foreground text-xs mt-1">{diagnosis.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {visit.treatments && Array.isArray(visit.treatments) && visit.treatments.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2">טיפולים</h4>
                <div className="space-y-2">
                  {visit.treatments.map((treatment: any, idx: number) => (
                    <div key={idx} className="text-sm bg-accent/50 rounded p-2">
                      <p className="font-medium">{treatment.treatment}</p>
                      {treatment.notes && (
                        <p className="text-muted-foreground text-xs mt-1">{treatment.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {visit.medications && Array.isArray(visit.medications) && visit.medications.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2">תרופות</h4>
                <div className="space-y-2">
                  {visit.medications.map((medication: any, idx: number) => (
                    <div key={idx} className="text-sm bg-accent/50 rounded p-2">
                      <p className="font-medium">{medication.medication}</p>
                      <div className="text-muted-foreground text-xs mt-1 space-y-0.5">
                        {medication.dosage && <p>מינון: {medication.dosage}</p>}
                        {medication.frequency && <p>תדירות: {medication.frequency}</p>}
                        {medication.duration && <p>משך: {medication.duration}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recommendations and Summary */}
        {(visit.recommendations || visit.client_summary) && (
          <div className="space-y-4 pt-4 border-t">
            {visit.recommendations && (
              <div>
                <h4 className="font-semibold text-sm mb-2">המלצות</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{visit.recommendations}</p>
              </div>
            )}

            {visit.client_summary && (
              <div>
                <h4 className="font-semibold text-sm mb-2">סיכום ללקוח</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-primary/5 rounded p-3">
                  {visit.client_summary}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Edit Mode - Same structure as View Mode but with form inputs
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" dir="rtl">
      {/* Header Info - Same layout as view mode */}
      <div className="flex items-center gap-4 flex-wrap pb-4 border-b justify-end">
        <div className="text-sm">
          <span className="font-medium">תאריך:</span>{' '}
          <Input
            type="datetime-local"
            {...register('visit_date')}
            className="inline-block w-auto h-8 text-sm"
          />
          {errors.visit_date && (
            <p className="text-xs text-destructive mt-1">{errors.visit_date.message}</p>
          )}
        </div>

        <div className="text-sm">
          <span className="font-medium">לקוח:</span>{' '}
          <Select
            value={watch('client_id') || ''}
            onValueChange={(value) => {
              setValue('client_id', value, { shouldValidate: true });
              setSelectedClientId(value);
              setValue('pet_id', '');
            }}
          >
            <SelectTrigger className="inline-flex w-auto h-8 text-sm min-w-[150px]">
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
            <p className="text-xs text-destructive mt-1">{errors.client_id.message}</p>
          )}
        </div>

        <div className="text-sm">
          <span className="font-medium">חיית מחמד:</span>{' '}
          <Select
            value={watch('pet_id') || ''}
            onValueChange={(value) => setValue('pet_id', value, { shouldValidate: true })}
            disabled={!selectedClientId}
          >
            <SelectTrigger className="inline-flex w-auto h-8 text-sm min-w-[120px]">
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
            <p className="text-xs text-destructive mt-1">{errors.pet_id.message}</p>
          )}
        </div>

        <Input
          {...register('visit_type')}
          placeholder="סוג ביקור"
          className="w-auto h-8 text-sm min-w-[120px] text-right"
        />
        {errors.visit_type && (
          <p className="text-xs text-destructive">{errors.visit_type.message}</p>
        )}

        <Select
          value={watch('status') || 'open'}
          onValueChange={(value: 'open' | 'completed' | 'cancelled') => setValue('status', value)}
        >
          <SelectTrigger className="w-auto h-8 text-sm min-w-[100px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="open">פתוח</SelectItem>
            <SelectItem value="completed">הושלם</SelectItem>
            <SelectItem value="cancelled">בוטל</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Visit Details - Same grid layout as view mode */}
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-sm mb-2">תלונה עיקרית</h4>
            <Textarea
              {...register('chief_complaint')}
              className="text-sm text-muted-foreground text-right"
              placeholder="מה הבעיה שהביאה את הבעלים..."
              rows={3}
            />
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-2">היסטוריה</h4>
            <Textarea
              {...register('history')}
              className="text-sm text-muted-foreground text-right"
              placeholder="היסטוריה רפואית רלוונטית..."
              rows={4}
            />
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-2">בדיקה גופנית</h4>
            <Textarea
              {...register('physical_exam')}
              className="text-sm text-muted-foreground text-right"
              placeholder="ממצאים מבדיקה גופנית..."
              rows={4}
            />
          </div>
        </div>

        <div className="space-y-4">
          {/* Diagnoses */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-semibold text-sm">אבחנות</h4>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-6 text-xs"
                onClick={() => appendDiagnosis({ diagnosis: '', notes: '' })}
              >
                <Plus className="h-3 w-3 ml-1" />
                הוסף
              </Button>
            </div>
            <div className="space-y-2">
              {diagnosesFields.map((field, index) => (
                <div key={field.id} className="text-sm bg-accent/50 rounded p-2 relative">
                  <Input
                    {...register(`diagnoses.${index}.diagnosis`)}
                    className="font-medium mb-1 h-7 text-sm text-right"
                    placeholder="אבחנה"
                  />
                  <Input
                    {...register(`diagnoses.${index}.notes`)}
                    className="text-muted-foreground text-xs h-6 text-right"
                    placeholder="הערות"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-1 left-1 h-5 w-5"
                    onClick={() => removeDiagnosis(index)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Treatments */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-semibold text-sm">טיפולים</h4>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-6 text-xs"
                onClick={() => appendTreatment({ treatment: '', notes: '' })}
              >
                <Plus className="h-3 w-3 ml-1" />
                הוסף
              </Button>
            </div>
            <div className="space-y-2">
              {treatmentsFields.map((field, index) => (
                <div key={field.id} className="text-sm bg-accent/50 rounded p-2 relative">
                  <Input
                    {...register(`treatments.${index}.treatment`)}
                    className="font-medium mb-1 h-7 text-sm text-right"
                    placeholder="טיפול"
                  />
                  <Input
                    {...register(`treatments.${index}.notes`)}
                    className="text-muted-foreground text-xs h-6 text-right"
                    placeholder="הערות"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-1 left-1 h-5 w-5"
                    onClick={() => removeTreatment(index)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Medications */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-semibold text-sm">תרופות</h4>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-6 text-xs"
                onClick={() => appendMedication({ medication: '', dosage: '', frequency: '' })}
              >
                <Plus className="h-3 w-3 ml-1" />
                הוסף
              </Button>
            </div>
            <div className="space-y-2">
              {medicationsFields.map((field, index) => (
                <div key={field.id} className="text-sm bg-accent/50 rounded p-2 relative">
                  <Input
                    {...register(`medications.${index}.medication`)}
                    className="font-medium mb-1 h-7 text-sm text-right"
                    placeholder="תרופה"
                  />
                  <div className="text-muted-foreground text-xs space-y-1">
                    <div className="flex gap-2">
                      <span>מינון:</span>
                      <Input
                        {...register(`medications.${index}.dosage`)}
                        className="h-5 text-xs flex-1 text-right"
                        placeholder="מינון"
                      />
                    </div>
                    <div className="flex gap-2">
                      <span>תדירות:</span>
                      <Input
                        {...register(`medications.${index}.frequency`)}
                        className="h-5 text-xs flex-1 text-right"
                        placeholder="תדירות"
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-1 left-1 h-5 w-5"
                    onClick={() => removeMedication(index)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations and Summary - Same layout as view mode */}
      <div className="space-y-4 pt-4 border-t">
        <div>
          <h4 className="font-semibold text-sm mb-2">המלצות</h4>
          <Textarea
            {...register('recommendations')}
            className="text-sm text-muted-foreground text-right"
            placeholder="המלצות לבעלים..."
            rows={3}
          />
        </div>

        <div>
          <h4 className="font-semibold text-sm mb-2">סיכום ללקוח</h4>
          <Textarea
            {...register('client_summary')}
            className="text-sm text-muted-foreground bg-primary/5 rounded p-3 text-right"
            placeholder="סיכום בשפה פשוטה ללקוח..."
            rows={3}
          />
        </div>
      </div>

      {/* Billing */}
      <div className="pt-4 border-t">
        <div className="flex justify-between items-center mb-2">
          <h4 className="font-semibold text-sm">פריטי חיוב</h4>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-6 text-xs"
            onClick={() => appendPriceItem({ item_id: '', quantity: 1 })}
          >
            <Plus className="h-3 w-3 ml-1" />
            הוסף פריט
          </Button>
        </div>
        <div className="space-y-2">
          {priceItemsFields.map((field, index) => (
            <div key={field.id} className="flex gap-2 items-center">
              <Select
                value={watch(`price_items.${index}.item_id`) || ''}
                onValueChange={(value) => setValue(`price_items.${index}.item_id`, value)}
              >
                <SelectTrigger className="flex-1 h-8 text-sm">
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
                className="w-16 h-8 text-sm text-center"
                placeholder="כמות"
              />
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => removePriceItem(index)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-4 border-t">
        <Button type="submit" size="sm">
          {visit ? 'עדכן ביקור' : 'הוסף ביקור'}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            ביטול
          </Button>
        )}
      </div>
    </form>
  );
};
