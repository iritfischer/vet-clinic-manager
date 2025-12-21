import { VisitSummaryData } from '@/lib/visitSummaryTypes';
import { Separator } from '@/components/ui/separator';
import { Calendar, Phone, MapPin, Pill, Stethoscope, Heart, FileText, Clock, Receipt, Globe, ClipboardList, History, Syringe } from 'lucide-react';

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

// neuterLabels removed - values are now stored in Hebrew directly in DB

export const VisitSummaryPreview = ({ data }: VisitSummaryPreviewProps) => {
  // Use dynamic primary color or default
  const primaryColor = data.primaryColor || '#E8833A';

  return (
    // A4 format: 210mm x 297mm (ratio ~1:1.414)
    <div
      className="w-[210mm] min-h-[297mm] mx-auto bg-white shadow-lg overflow-hidden print:shadow-none flex flex-col"
      dir="rtl"
      style={{
        aspectRatio: '210 / 297',
        maxWidth: '100%',
      }}
    >
      {/* Header with colored bar */}
      <div data-pdf-header="true">
        <div style={{ backgroundColor: primaryColor }} className="h-3" />
        <div className="bg-white p-6 pb-4">
          <div className="flex items-start justify-between gap-4">
            {/* Clinic info on the right (RTL) */}
            <div className="text-right flex-1">
              <h1 className="text-3xl font-bold mb-1" style={{ color: primaryColor }}>
                {data.clinicName}
              </h1>
              {data.clinicVetLicense && (
                <div className="text-lg text-gray-600">
                  וטרינר | מס׳ רישיון: {data.clinicVetLicense}
                </div>
              )}
            </div>

            {/* Logo on the left (RTL) with contact info beside it */}
            <div className="flex-shrink-0 flex items-center gap-3">
              <div className="text-sm text-gray-600 space-y-1">
                {data.clinicPhone && (
                  <div className="flex items-center justify-end gap-2">
                    <span>{data.clinicPhone}</span>
                    <Phone className="h-4 w-4 flex-shrink-0" />
                  </div>
                )}
                {data.clinicWebsite && (
                  <div className="flex items-center justify-end gap-2">
                    <span>{data.clinicWebsite}</span>
                    <Globe className="h-4 w-4 flex-shrink-0" />
                  </div>
                )}
              </div>
              {data.clinicLogo && (
                <img
                  src={data.clinicLogo}
                  alt={data.clinicName}
                  className="h-20 w-20 object-contain"
                />
              )}
            </div>
          </div>

          {/* Title with pet name and date */}
          <div className="text-center mt-6 mb-2">
            <h2
              className="text-2xl font-bold text-gray-800 border-b-2 pb-2 inline-block px-8"
              style={{ borderColor: primaryColor }}
            >
              סיכום ביקור{'\u200F'} - {data.petName}{'\u200F'} - {data.visitDate}
            </h2>
          </div>
        </div>
      </div>

      <div className="px-8 py-4 space-y-6 flex-1" data-pdf-content="true">
        {/* Pet Info */}
        <div
          className="rounded-lg p-5"
          style={{
            backgroundColor: `${primaryColor}10`,
            border: `2px solid ${primaryColor}30`
          }}
        >
          <div className="grid grid-cols-2 gap-3 text-lg text-gray-600">
            <div><span className="font-semibold">סוג:</span> {speciesLabels[data.petSpecies] || data.petSpecies}</div>
            {data.petBreed && <div><span className="font-semibold">גזע:</span> {data.petBreed}</div>}
            {data.petSex && <div><span className="font-semibold">מין:</span> {sexLabels[data.petSex] || data.petSex}</div>}
            {data.petNeuterStatus && data.petNeuterStatus !== 'none' && (
              <div><span className="font-semibold">{data.petSex === 'female' ? 'עיקור:' : 'סירוס:'}</span> {data.petNeuterStatus}</div>
            )}
            {data.petWeight && <div><span className="font-semibold">משקל:</span> {data.petWeight} ק"ג</div>}
            {data.petAge && <div><span className="font-semibold">גיל:</span> {data.petAge}</div>}
          </div>
        </div>

        {/* 1. היסטוריה כללית */}
        {data.generalHistory && (
          <div data-pdf-section="true" style={{ pageBreakInside: 'avoid' }}>
            <div className="flex items-center gap-3 mb-2 border-b-2 border-gray-300 pb-2">
              <History className="h-6 w-6" style={{ color: primaryColor }} />
              <h3 className="font-bold text-xl text-gray-800">היסטוריה כללית</h3>
            </div>
            <p className="text-lg whitespace-pre-wrap text-gray-700 pt-2">{data.generalHistory}</p>
          </div>
        )}

        {/* 2. היסטוריה רפואית */}
        {data.medicalHistory && (
          <div data-pdf-section="true" style={{ pageBreakInside: 'avoid' }}>
            <div className="flex items-center gap-3 mb-2 border-b-2 border-gray-300 pb-2">
              <History className="h-6 w-6" style={{ color: primaryColor }} />
              <h3 className="font-bold text-xl text-gray-800">היסטוריה רפואית</h3>
            </div>
            <p className="text-lg whitespace-pre-wrap text-gray-700 pt-2">{data.medicalHistory}</p>
          </div>
        )}

        {/* 3. היסטוריה נוכחית */}
        {data.currentHistory && (
          <div data-pdf-section="true" style={{ pageBreakInside: 'avoid' }}>
            <div className="flex items-center gap-3 mb-2 border-b-2 border-gray-300 pb-2">
              <History className="h-6 w-6" style={{ color: primaryColor }} />
              <h3 className="font-bold text-xl text-gray-800">היסטוריה נוכחית</h3>
            </div>
            <p className="text-lg whitespace-pre-wrap text-gray-700 pt-2">{data.currentHistory}</p>
          </div>
        )}

        {/* Physical Examination */}
        {data.physicalExam && (
          <div data-pdf-section="true" style={{ pageBreakInside: 'avoid' }}>
            <div className="flex items-center gap-3 mb-2 border-b-2 border-gray-300 pb-2">
              <ClipboardList className="h-6 w-6" style={{ color: primaryColor }} />
              <h3 className="font-bold text-xl text-gray-800">בדיקה פיזיקלית</h3>
            </div>
            <p className="text-lg whitespace-pre-wrap text-gray-700 pt-2">
              {data.physicalExam}
            </p>
          </div>
        )}

        {/* 5. טיפול (כולל אבחנות, טיפולים ותרופות) */}
        {(data.diagnoses.length > 0 || data.treatments.length > 0 || data.medications.length > 0) && (
          <div data-pdf-section="true" style={{ pageBreakInside: 'avoid' }}>
            <div className="flex items-center gap-3 mb-2 border-b-2 border-gray-300 pb-2">
              <Stethoscope className="h-6 w-6" style={{ color: primaryColor }} />
              <h3 className="font-bold text-xl text-gray-800">טיפול</h3>
            </div>
            <div className="space-y-4 pt-2">
              {/* אבחנות */}
              {data.diagnoses.length > 0 && (
                <div>
                  <p className="font-bold text-gray-800 mb-2">אבחנות:</p>
                  {data.diagnoses.map((d, idx) => (
                    <div key={idx} className="text-lg">
                      <p className="text-gray-700">{d.diagnosis}{d.notes ? ':' : ''}</p>
                      {d.notes && <p className="text-gray-500 mr-4">{d.notes}</p>}
                    </div>
                  ))}
                </div>
              )}

              {/* טיפולים */}
              {data.treatments.length > 0 && (
                <div>
                  <p className="font-bold text-gray-800 mb-2">טיפולים שבוצעו:</p>
                  {data.treatments.map((t, idx) => (
                    <div key={idx} className="text-lg">
                      <p className="text-gray-700">{t.treatment}{t.notes ? ':' : ''}</p>
                      {t.notes && <p className="text-gray-500 mr-4">{t.notes}</p>}
                    </div>
                  ))}
                </div>
              )}

              {/* תרופות */}
              {data.medications.length > 0 && (
                <div>
                  <p className="font-bold text-gray-800 mb-2">תרופות:</p>
                  {data.medications.map((m, idx) => (
                    <div key={idx} className="text-lg mb-2">
                      <p className="text-gray-700 font-medium">
                        {m.medication}
                        {m.quantity && m.quantity > 1 && <span className="text-gray-500 font-normal"> (x{m.quantity})</span>}
                      </p>
                      <div className="text-gray-500 mr-4">
                        {m.dosage && <p>מינון: {m.dosage}</p>}
                        {m.frequency && <p>תדירות: {m.frequency}</p>}
                        {m.duration && <p>משך: {m.duration}</p>}
                        {m.quantity && <p>כמות: {m.quantity}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 5.5. חיסונים */}
        {data.vaccinations && data.vaccinations.length > 0 && (
          <div data-pdf-section="true" style={{ pageBreakInside: 'avoid' }}>
            <div className="flex items-center gap-3 mb-2 border-b-2 border-gray-300 pb-2">
              <Syringe className="h-6 w-6" style={{ color: primaryColor }} />
              <h3 className="font-bold text-xl text-gray-800">חיסונים</h3>
            </div>
            <div className="space-y-2 pt-2">
              {data.vaccinations.map((v, idx) => (
                <div key={idx} className="text-lg">
                  <p className="text-gray-700 font-medium">{v.vaccination_type}</p>
                  <div className="text-gray-500 mr-4 text-base">
                    {v.vaccination_date && <p>תאריך חיסון: {v.vaccination_date}</p>}
                    {v.next_vaccination_date && <p>חיסון הבא: {v.next_vaccination_date}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 6. סיכום לבעלים */}
        {data.notesToOwner && (
          <div data-pdf-section="true" style={{ pageBreakInside: 'avoid' }}>
            <div className="flex items-center gap-3 mb-2 border-b-2 border-gray-300 pb-2">
              <FileText className="h-6 w-6" style={{ color: primaryColor }} />
              <h3 className="font-bold text-xl text-gray-800">סיכום לבעלים</h3>
            </div>
            <p className="text-lg whitespace-pre-wrap text-gray-700 pt-2">{data.notesToOwner}</p>
          </div>
        )}

        {/* 7. הנחיות להמשך */}
        {data.recommendations && (
          <div data-pdf-section="true" style={{ pageBreakInside: 'avoid' }}>
            <div className="flex items-center gap-3 mb-2 border-b-2 border-gray-300 pb-2">
              <Heart className="h-6 w-6" style={{ color: primaryColor }} />
              <h3 className="font-bold text-xl text-gray-800">הנחיות להמשך</h3>
            </div>
            <p className="text-lg whitespace-pre-wrap text-gray-700 pt-2">
              {data.recommendations}
            </p>
          </div>
        )}

        {/* 8. תור המשך */}
        {data.nextAppointment && (
          <div
            className="flex items-center gap-3 rounded-lg p-4"
            style={{
              backgroundColor: `${primaryColor}10`,
              border: `2px solid ${primaryColor}30`
            }}
          >
            <Clock className="h-6 w-6" style={{ color: primaryColor }} />
            <div className="text-lg">
              <span className="font-bold">תור המשך: </span>
              <span>{data.nextAppointment}</span>
            </div>
          </div>
        )}

        {/* 9. חיוב */}
        {data.charges && data.charges.length > 0 && (
          <div data-pdf-section="true" style={{ pageBreakInside: 'avoid' }}>
            <div className="flex items-center gap-3 mb-3 border-b-2 border-gray-300 pb-2">
              <Receipt className="h-6 w-6" style={{ color: primaryColor }} />
              <h3 className="font-bold text-xl text-gray-800">חיוב</h3>
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
                <span className="text-2xl" style={{ color: primaryColor }}>
                  {data.totalAmount?.toFixed(2)} ש"ח
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-auto" data-pdf-footer="true">
        <div className="bg-gray-50 py-4 px-6">
          <div className="flex items-center justify-between text-gray-600">
            {/* Right side (RTL) - clinic name */}
            <div className="font-semibold" style={{ color: primaryColor }}>
              {data.clinicName}
            </div>

            {/* Center - contact info */}
            <div className="flex items-center gap-4 text-sm">
              {data.clinicPhone && (
                <div className="flex items-center justify-end gap-2">
                  <span>{data.clinicPhone}</span>
                  <Phone className="h-4 w-4 flex-shrink-0" />
                </div>
              )}
              {data.clinicWebsite && (
                <div className="flex items-center justify-end gap-2">
                  <span>{data.clinicWebsite}</span>
                  <Globe className="h-4 w-4 flex-shrink-0" />
                </div>
              )}
              {data.clinicAddress && (
                <div className="flex items-center justify-end gap-2">
                  <span>{data.clinicAddress}</span>
                  <MapPin className="h-4 w-4 flex-shrink-0" />
                </div>
              )}
            </div>

            {/* Left side (RTL) - logo */}
            {data.clinicLogo && (
              <img
                src={data.clinicLogo}
                alt={data.clinicName}
                className="h-10 w-10 object-contain"
              />
            )}
          </div>
        </div>
        {/* Footer colored bar */}
        <div style={{ backgroundColor: primaryColor }} className="h-3" />
      </div>
    </div>
  );
};
