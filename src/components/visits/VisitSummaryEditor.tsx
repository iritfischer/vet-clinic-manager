import { VisitSummaryData, DiagnosisItem, TreatmentItem, MedicationItem, VaccinationItem } from '@/lib/visitSummaryTypes';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2 } from 'lucide-react';

interface VisitSummaryEditorProps {
  data: VisitSummaryData;
  onChange: (data: VisitSummaryData) => void;
}

export const VisitSummaryEditor = ({ data, onChange }: VisitSummaryEditorProps) => {
  const updateField = <K extends keyof VisitSummaryData>(field: K, value: VisitSummaryData[K]) => {
    onChange({ ...data, [field]: value });
  };

  const addDiagnosis = () => {
    updateField('diagnoses', [...data.diagnoses, { diagnosis: '', notes: '' }]);
  };

  const updateDiagnosis = (idx: number, field: keyof DiagnosisItem, value: string) => {
    const updated = [...data.diagnoses];
    updated[idx] = { ...updated[idx], [field]: value };
    updateField('diagnoses', updated);
  };

  const removeDiagnosis = (idx: number) => {
    updateField('diagnoses', data.diagnoses.filter((_, i) => i !== idx));
  };

  const addTreatment = () => {
    updateField('treatments', [...data.treatments, { treatment: '', notes: '' }]);
  };

  const updateTreatment = (idx: number, field: keyof TreatmentItem, value: string) => {
    const updated = [...data.treatments];
    updated[idx] = { ...updated[idx], [field]: value };
    updateField('treatments', updated);
  };

  const removeTreatment = (idx: number) => {
    updateField('treatments', data.treatments.filter((_, i) => i !== idx));
  };

  const addMedication = () => {
    updateField('medications', [...data.medications, { medication: '', dosage: '', frequency: '', duration: '', quantity: 1 }]);
  };

  const updateMedication = (idx: number, field: keyof MedicationItem, value: string | number) => {
    const updated = [...data.medications];
    updated[idx] = { ...updated[idx], [field]: value };
    updateField('medications', updated);
  };

  const removeMedication = (idx: number) => {
    updateField('medications', data.medications.filter((_, i) => i !== idx));
  };

  const addVaccination = () => {
    updateField('vaccinations', [...(data.vaccinations || []), { vaccination_type: '', vaccination_date: '', next_vaccination_date: '' }]);
  };

  const updateVaccination = (idx: number, field: keyof VaccinationItem, value: string) => {
    const updated = [...(data.vaccinations || [])];
    updated[idx] = { ...updated[idx], [field]: value };
    updateField('vaccinations', updated);
  };

  const removeVaccination = (idx: number) => {
    updateField('vaccinations', (data.vaccinations || []).filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-6 max-h-[60vh] overflow-y-auto pl-2" dir="rtl">
      {/* Pet Info - Read Only */}
      <div className="pb-3">
        <h3 className="font-bold mb-2 border-b-2 border-gray-300 pb-2">פרטי חיית המחמד</h3>
        <div className="grid grid-cols-2 gap-2 text-sm pt-2">
          <div>שם: <strong>{data.petName}</strong></div>
          <div>תאריך ביקור: <strong>{data.visitDate}</strong></div>
        </div>
      </div>

      <Separator />

      {/* History */}
      <div>
        <Label className="text-base font-semibold mb-2 block">היסטוריה נוכחית</Label>
        <Textarea
          placeholder="תסמינים נוכחיים, מתי התחילו, שינויים אחרונים..."
          value={data.currentHistory || ''}
          onChange={(e) => updateField('currentHistory', e.target.value)}
          rows={2}
        />
      </div>

      <div>
        <Label className="text-base font-semibold mb-2 block">היסטוריה רפואית</Label>
        <Textarea
          placeholder="מצבים קודמים, ניתוחים, אלרגיות..."
          value={data.medicalHistory || ''}
          onChange={(e) => updateField('medicalHistory', e.target.value)}
          rows={2}
        />
      </div>

      <div>
        <Label className="text-base font-semibold mb-2 block">היסטוריה כללית</Label>
        <Textarea
          placeholder="מידע כללי על החיה..."
          value={data.generalHistory || ''}
          onChange={(e) => updateField('generalHistory', e.target.value)}
          rows={2}
        />
      </div>

      <Separator />

      {/* Physical Exam */}
      <div>
        <Label className="text-base font-semibold mb-2 block">בדיקה פיזיקלית</Label>
        <Textarea
          placeholder="ממצאי הבדיקה הפיזיקלית..."
          value={data.physicalExam || ''}
          onChange={(e) => updateField('physicalExam', e.target.value)}
          rows={3}
        />
      </div>

      <Separator />

      {/* Diagnoses */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <Label className="text-base font-semibold">אבחנות</Label>
          <Button type="button" variant="outline" size="sm" onClick={addDiagnosis}>
            <Plus className="h-4 w-4 ml-1" />
            הוסף
          </Button>
        </div>
        <div className="space-y-3">
          {data.diagnoses.map((d, idx) => (
            <div key={idx} className="flex gap-2 items-start border-b border-gray-200 pb-3">
              <div className="flex-1 space-y-2">
                <Input
                  placeholder="אבחנה"
                  value={d.diagnosis}
                  onChange={(e) => updateDiagnosis(idx, 'diagnosis', e.target.value)}
                />
                <Input
                  placeholder="הערות (אופציונלי)"
                  value={d.notes || ''}
                  onChange={(e) => updateDiagnosis(idx, 'notes', e.target.value)}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeDiagnosis(idx)}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {data.diagnoses.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">אין אבחנות</p>
          )}
        </div>
      </div>

      <Separator />

      {/* Treatments */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <Label className="text-base font-semibold">טיפולים</Label>
          <Button type="button" variant="outline" size="sm" onClick={addTreatment}>
            <Plus className="h-4 w-4 ml-1" />
            הוסף
          </Button>
        </div>
        <div className="space-y-3">
          {data.treatments.map((t, idx) => (
            <div key={idx} className="flex gap-2 items-start border-b border-gray-200 pb-3">
              <div className="flex-1 space-y-2">
                <Input
                  placeholder="טיפול"
                  value={t.treatment}
                  onChange={(e) => updateTreatment(idx, 'treatment', e.target.value)}
                />
                <Input
                  placeholder="הערות (אופציונלי)"
                  value={t.notes || ''}
                  onChange={(e) => updateTreatment(idx, 'notes', e.target.value)}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeTreatment(idx)}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {data.treatments.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">אין טיפולים</p>
          )}
        </div>
      </div>

      <Separator />

      {/* Medications */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <Label className="text-base font-semibold">תרופות</Label>
          <Button type="button" variant="outline" size="sm" onClick={addMedication}>
            <Plus className="h-4 w-4 ml-1" />
            הוסף
          </Button>
        </div>
        <div className="space-y-3">
          {data.medications.map((m, idx) => (
            <div key={idx} className="flex gap-2 items-start border-b border-gray-200 pb-3">
              <div className="flex-1 space-y-2">
                <Input
                  placeholder="שם התרופה"
                  value={m.medication}
                  onChange={(e) => updateMedication(idx, 'medication', e.target.value)}
                />
                <div className="grid grid-cols-4 gap-2">
                  <Input
                    placeholder="מינון"
                    value={m.dosage || ''}
                    onChange={(e) => updateMedication(idx, 'dosage', e.target.value)}
                  />
                  <Input
                    placeholder="תדירות"
                    value={m.frequency || ''}
                    onChange={(e) => updateMedication(idx, 'frequency', e.target.value)}
                  />
                  <Input
                    placeholder="משך"
                    value={m.duration || ''}
                    onChange={(e) => updateMedication(idx, 'duration', e.target.value)}
                  />
                  <Input
                    type="number"
                    min="1"
                    placeholder="כמות"
                    value={m.quantity || ''}
                    onChange={(e) => updateMedication(idx, 'quantity', parseInt(e.target.value) || 1)}
                  />
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeMedication(idx)}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {data.medications.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">אין תרופות</p>
          )}
        </div>
      </div>

      <Separator />

      {/* Vaccinations */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <Label className="text-base font-semibold">חיסונים</Label>
          <Button type="button" variant="outline" size="sm" onClick={addVaccination}>
            <Plus className="h-4 w-4 ml-1" />
            הוסף
          </Button>
        </div>
        <div className="space-y-3">
          {(data.vaccinations || []).map((v, idx) => (
            <div key={idx} className="flex gap-2 items-start border-b border-gray-200 pb-3">
              <div className="flex-1 space-y-2">
                <Input
                  placeholder="סוג החיסון"
                  value={v.vaccination_type}
                  onChange={(e) => updateVaccination(idx, 'vaccination_type', e.target.value)}
                />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-gray-500">תאריך חיסון</Label>
                    <Input
                      placeholder="dd/mm/yyyy"
                      value={v.vaccination_date || ''}
                      onChange={(e) => updateVaccination(idx, 'vaccination_date', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">תאריך חיסון הבא</Label>
                    <Input
                      placeholder="dd/mm/yyyy"
                      value={v.next_vaccination_date || ''}
                      onChange={(e) => updateVaccination(idx, 'next_vaccination_date', e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeVaccination(idx)}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {(!data.vaccinations || data.vaccinations.length === 0) && (
            <p className="text-sm text-muted-foreground text-center py-2">אין חיסונים</p>
          )}
        </div>
      </div>

      <Separator />

      {/* Recommendations */}
      <div>
        <Label className="text-base font-semibold mb-2 block">המלצות</Label>
        <Textarea
          placeholder="המלצות לבעלים..."
          value={data.recommendations || ''}
          onChange={(e) => updateField('recommendations', e.target.value)}
          rows={3}
        />
      </div>

      {/* Next Appointment */}
      <div>
        <Label className="text-base font-semibold mb-2 block">תור המשך</Label>
        <Input
          placeholder="לדוגמה: 15/12/2024 בשעה 10:00"
          value={data.nextAppointment || ''}
          onChange={(e) => updateField('nextAppointment', e.target.value)}
        />
      </div>

      {/* Notes to Owner */}
      <div>
        <Label className="text-base font-semibold mb-2 block">הערות לבעלים</Label>
        <Textarea
          placeholder="הערות חופשיות לבעלים..."
          value={data.notesToOwner || ''}
          onChange={(e) => updateField('notesToOwner', e.target.value)}
          rows={3}
        />
      </div>
    </div>
  );
};
