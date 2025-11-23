import { VisitSummaryData } from '@/lib/visitSummaryTypes';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Calendar, Phone, MapPin, Pill, Stethoscope, Heart, FileText, Clock } from 'lucide-react';

interface VisitSummaryPreviewProps {
  data: VisitSummaryData;
}

const visitTypeLabels: Record<string, string> = {
  checkup: 'בדיקה',
  vaccination: 'חיסון',
  surgery: 'ניתוח',
  dental: 'שיניים',
  emergency: 'חירום',
  grooming: 'טיפוח',
  other: 'אחר',
};

const speciesLabels: Record<string, string> = {
  dog: 'כלב',
  cat: 'חתול',
  other: 'אחר',
};

const sexLabels: Record<string, string> = {
  male: 'זכר',
  female: 'נקבה',
  unknown: 'לא ידוע',
};

export const VisitSummaryPreview = ({ data }: VisitSummaryPreviewProps) => {
  return (
    <Card className="w-full max-w-[400px] mx-auto bg-white shadow-lg overflow-hidden" dir="rtl">
      {/* Header with Logo */}
      <div className="bg-gradient-to-l from-primary/10 to-primary/5 p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-xl font-bold text-primary">{data.clinicName}</h1>
            {data.clinicPhone && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                <Phone className="h-3 w-3" />
                <span>{data.clinicPhone}</span>
              </div>
            )}
            {data.clinicAddress && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span className="text-xs">{data.clinicAddress}</span>
              </div>
            )}
          </div>
          {data.clinicLogo && (
            <img
              src={data.clinicLogo}
              alt={data.clinicName}
              className="h-16 w-16 object-contain rounded-lg bg-white p-1"
            />
          )}
        </div>
      </div>

      <CardContent className="p-4 space-y-4">
        {/* Visit Date & Type */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{data.visitDate}</span>
          </div>
          <Badge variant="outline">
            {visitTypeLabels[data.visitType] || data.visitType}
          </Badge>
        </div>

        <Separator />

        {/* Pet Info */}
        <div className="bg-accent/30 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <Heart className="h-4 w-4 text-primary" />
            <span className="font-bold text-lg">{data.petName}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
            <div>סוג: {speciesLabels[data.petSpecies] || data.petSpecies}</div>
            {data.petBreed && <div>גזע: {data.petBreed}</div>}
            {data.petSex && <div>מין: {sexLabels[data.petSex] || data.petSex}</div>}
            {data.petWeight && <div>משקל: {data.petWeight} ק"ג</div>}
            {data.petAge && <div>גיל: {data.petAge}</div>}
          </div>
        </div>

        {/* Diagnoses */}
        {data.diagnoses.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Stethoscope className="h-4 w-4 text-primary" />
              <h3 className="font-semibold">אבחנות</h3>
            </div>
            <div className="space-y-1">
              {data.diagnoses.map((d, idx) => (
                <div key={idx} className="text-sm bg-red-50 border-r-2 border-red-300 rounded px-3 py-1.5">
                  <p className="font-medium">{d.diagnosis}</p>
                  {d.notes && <p className="text-muted-foreground text-xs">{d.notes}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Treatments */}
        {data.treatments.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-primary" />
              <h3 className="font-semibold">טיפולים שבוצעו</h3>
            </div>
            <div className="space-y-1">
              {data.treatments.map((t, idx) => (
                <div key={idx} className="text-sm bg-blue-50 border-r-2 border-blue-300 rounded px-3 py-1.5">
                  <p className="font-medium">{t.treatment}</p>
                  {t.notes && <p className="text-muted-foreground text-xs">{t.notes}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Medications */}
        {data.medications.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Pill className="h-4 w-4 text-primary" />
              <h3 className="font-semibold">תרופות</h3>
            </div>
            <div className="space-y-2">
              {data.medications.map((m, idx) => (
                <div key={idx} className="text-sm bg-green-50 border-r-2 border-green-300 rounded px-3 py-2">
                  <p className="font-bold">{m.medication}</p>
                  <div className="text-xs text-muted-foreground space-y-0.5 mt-1">
                    {m.dosage && <p>מינון: {m.dosage}</p>}
                    {m.frequency && <p>תדירות: {m.frequency}</p>}
                    {m.duration && <p>משך: {m.duration}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {data.recommendations && (
          <div>
            <h3 className="font-semibold mb-2">המלצות</h3>
            <p className="text-sm bg-yellow-50 border-r-2 border-yellow-400 rounded px-3 py-2 whitespace-pre-wrap">
              {data.recommendations}
            </p>
          </div>
        )}

        {/* Next Appointment */}
        {data.nextAppointment && (
          <div className="flex items-center gap-2 bg-primary/10 rounded-lg p-3">
            <Clock className="h-4 w-4 text-primary" />
            <div>
              <span className="text-sm font-medium">תור המשך: </span>
              <span className="text-sm">{data.nextAppointment}</span>
            </div>
          </div>
        )}

        {/* Notes to Owner */}
        {data.notesToOwner && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
            <h3 className="font-semibold text-sm mb-1">הערות לבעלים</h3>
            <p className="text-sm whitespace-pre-wrap">{data.notesToOwner}</p>
          </div>
        )}

        <Separator />

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground pt-2">
          <p>להזמנת תורים וייעוץ:</p>
          <p className="font-medium text-primary">{data.clinicPhone}</p>
          <p className="mt-2">תודה שבחרתם ב{data.clinicName}!</p>
        </div>
      </CardContent>
    </Card>
  );
};
