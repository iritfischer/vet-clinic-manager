import { VisitSummaryData } from '@/lib/visitSummaryTypes';
import { Separator } from '@/components/ui/separator';
import { Calendar, Phone, MapPin, Pill, Stethoscope, Heart, FileText, Clock, Receipt } from 'lucide-react';

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

// נתן הרופא logo - default logo
const DEFAULT_LOGO = '/logo.png';

export const VisitSummaryPreview = ({ data }: VisitSummaryPreviewProps) => {
  const logo = data.clinicLogo || DEFAULT_LOGO;

  return (
    // A4 format: 210mm x 297mm (ratio ~1:1.414)
    <div
      className="w-[210mm] min-h-[297mm] mx-auto bg-white shadow-lg overflow-hidden print:shadow-none"
      dir="rtl"
      style={{
        aspectRatio: '210 / 297',
        maxWidth: '100%',
      }}
    >
      {/* Header with Logo */}
      <div className="bg-white p-8 pb-4">
        <div className="flex items-start justify-between gap-6">
          {/* Logo on the left */}
          <img
            src={logo}
            alt={data.clinicName}
            className="h-24 w-24 object-contain"
          />

          {/* Clinic Info on the right */}
          <div className="flex-1 text-right">
            <h1 className="text-3xl font-bold text-[#E8833A] mb-2">ד״ר נתן ג׳רארד שטיין</h1>
            {data.clinicPhone && (
              <div className="flex items-center justify-end gap-2 text-lg text-gray-600">
                <span>{data.clinicPhone}</span>
                <Phone className="h-5 w-5" />
              </div>
            )}
            {data.clinicAddress && (
              <div className="flex items-center justify-end gap-2 text-gray-600">
                <span>{data.clinicAddress}</span>
                <MapPin className="h-5 w-5" />
              </div>
            )}
          </div>
        </div>

        {/* Title */}
        <div className="text-center mt-6 mb-4">
          <h2 className="text-2xl font-bold text-gray-800 border-b-2 border-[#E8833A] pb-2 inline-block px-8">
            סיכום ביקור
          </h2>
        </div>
      </div>

      <div className="px-8 py-4 space-y-6 flex-1">
        {/* Visit Date & Type */}
        <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Calendar className="h-6 w-6 text-[#E8833A]" />
            <span className="font-semibold text-xl">{data.visitDate}</span>
          </div>
          <span className="bg-[#E8833A] text-white text-lg px-4 py-2 rounded-lg font-semibold">
            {visitTypeLabels[data.visitType] || data.visitType}
          </span>
        </div>

        {/* Pet Info */}
        <div className="bg-orange-50 border-2 border-[#E8833A]/30 rounded-lg p-5">
          <div className="flex items-center gap-3 mb-3">
            <Heart className="h-6 w-6 text-[#E8833A]" />
            <span className="font-bold text-2xl text-gray-800">{data.petName}</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-lg text-gray-600">
            <div><span className="font-semibold">סוג:</span> {speciesLabels[data.petSpecies] || data.petSpecies}</div>
            {data.petBreed && <div><span className="font-semibold">גזע:</span> {data.petBreed}</div>}
            {data.petSex && <div><span className="font-semibold">מין:</span> {sexLabels[data.petSex] || data.petSex}</div>}
            {data.petWeight && <div><span className="font-semibold">משקל:</span> {data.petWeight} ק"ג</div>}
            {data.petAge && <div><span className="font-semibold">גיל:</span> {data.petAge}</div>}
          </div>
        </div>

        {/* Diagnoses */}
        {data.diagnoses.length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-3">
              <Stethoscope className="h-6 w-6 text-[#E8833A]" />
              <h3 className="font-bold text-xl text-gray-800">אבחנות</h3>
            </div>
            <div className="space-y-2">
              {data.diagnoses.map((d, idx) => (
                <div key={idx} className="text-lg bg-red-50 border-r-4 border-red-400 rounded-lg px-4 py-3">
                  <p className="font-semibold text-gray-800">{d.diagnosis}</p>
                  {d.notes && <p className="text-gray-600 mt-1">{d.notes}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Treatments */}
        {data.treatments.length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-3">
              <FileText className="h-6 w-6 text-[#E8833A]" />
              <h3 className="font-bold text-xl text-gray-800">טיפולים שבוצעו</h3>
            </div>
            <div className="space-y-2">
              {data.treatments.map((t, idx) => (
                <div key={idx} className="text-lg bg-blue-50 border-r-4 border-blue-400 rounded-lg px-4 py-3">
                  <p className="font-semibold text-gray-800">{t.treatment}</p>
                  {t.notes && <p className="text-gray-600 mt-1">{t.notes}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Medications */}
        {data.medications.length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-3">
              <Pill className="h-6 w-6 text-[#E8833A]" />
              <h3 className="font-bold text-xl text-gray-800">תרופות</h3>
            </div>
            <div className="space-y-3">
              {data.medications.map((m, idx) => (
                <div key={idx} className="text-lg bg-green-50 border-r-4 border-green-400 rounded-lg px-4 py-3">
                  <p className="font-bold text-gray-800 text-xl">{m.medication}</p>
                  <div className="text-gray-600 space-y-1 mt-2">
                    {m.dosage && <p><span className="font-semibold">מינון:</span> {m.dosage}</p>}
                    {m.frequency && <p><span className="font-semibold">תדירות:</span> {m.frequency}</p>}
                    {m.duration && <p><span className="font-semibold">משך:</span> {m.duration}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {data.recommendations && (
          <div>
            <h3 className="font-bold text-xl text-gray-800 mb-3">המלצות</h3>
            <p className="text-lg bg-yellow-50 border-r-4 border-yellow-500 rounded-lg px-4 py-3 whitespace-pre-wrap text-gray-700">
              {data.recommendations}
            </p>
          </div>
        )}

        {/* Charges */}
        {data.charges && data.charges.length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-3">
              <Receipt className="h-6 w-6 text-[#E8833A]" />
              <h3 className="font-bold text-xl text-gray-800">חיובים</h3>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              {data.charges.map((charge, idx) => (
                <div key={idx} className="flex justify-between items-center text-lg border-b border-gray-200 pb-2 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2">
                    <span>{charge.name}</span>
                    {charge.quantity > 1 && (
                      <span className="text-gray-500">x{charge.quantity}</span>
                    )}
                  </div>
                  <span className="font-semibold">{charge.total.toFixed(2)} ש"ח</span>
                </div>
              ))}
              <Separator className="my-3" />
              <div className="flex justify-between items-center font-bold text-xl">
                <span>סה"כ</span>
                <span className="text-[#E8833A] text-2xl">{data.totalAmount?.toFixed(2)} ש"ח</span>
              </div>
            </div>
          </div>
        )}

        {/* Next Appointment */}
        {data.nextAppointment && (
          <div className="flex items-center gap-3 bg-orange-50 border-2 border-[#E8833A]/30 rounded-lg p-4">
            <Clock className="h-6 w-6 text-[#E8833A]" />
            <div className="text-lg">
              <span className="font-bold">תור המשך: </span>
              <span>{data.nextAppointment}</span>
            </div>
          </div>
        )}

        {/* Notes to Owner */}
        {data.notesToOwner && (
          <div className="bg-purple-50 border-2 border-purple-300 rounded-lg p-4">
            <h3 className="font-bold text-lg mb-2 text-purple-800">הערות לבעלים</h3>
            <p className="text-lg whitespace-pre-wrap text-gray-700">{data.notesToOwner}</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-auto border-t-2 border-[#E8833A]/20 bg-gray-50 p-6">
        <div className="text-center">
          <p className="text-lg text-gray-600">להזמנת תורים וייעוץ:</p>
          <p className="font-bold text-2xl text-[#E8833A]">{data.clinicPhone}</p>
          <p className="mt-3 text-lg text-gray-600">תודה שבחרתם בד״ר נתן ג׳רארד שטיין!</p>
        </div>
      </div>
    </div>
  );
};
