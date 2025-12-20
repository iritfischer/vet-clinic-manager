import { Document, Page, View, Text, Image, StyleSheet, Font } from '@react-pdf/renderer';
import { VisitSummaryData } from '@/lib/visitSummaryTypes';

// Register Hebrew font (Noto Sans Hebrew from Google Fonts)
Font.register({
  family: 'NotoSansHebrew',
  fonts: [
    {
      src: 'https://fonts.gstatic.com/s/notosanshebrew/v50/or3HQ7v33eiDljA1IufXTtVf7V6RvEEdhQlk0LlGxCyaeNKYZC0sqk3xXGiXd4qtog.ttf',
      fontWeight: 'normal'
    },
    {
      src: 'https://fonts.gstatic.com/s/notosanshebrew/v50/or3HQ7v33eiDljA1IufXTtVf7V6RvEEdhQlk0LlGxCyaeNKYZC0sqk3xXGiXkI2tog.ttf',
      fontWeight: 'bold'
    },
  ],
});

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

const neuterLabels: Record<string, string> = {
  neutered: 'מעוקר/מסורס',
  intact: 'לא מעוקר',
};

const createStyles = (primaryColor: string) => StyleSheet.create({
  page: {
    fontFamily: 'NotoSansHebrew',
    fontSize: 11,
    paddingTop: 20,
    paddingBottom: 60,
    paddingHorizontal: 30,
    direction: 'rtl',
  },
  // Header
  headerBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 8,
    backgroundColor: primaryColor,
  },
  header: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
    paddingTop: 15,
  },
  clinicName: {
    fontSize: 22,
    fontWeight: 700,
    color: primaryColor,
    textAlign: 'right',
  },
  clinicInfo: {
    fontSize: 10,
    color: '#666',
    textAlign: 'right',
  },
  logo: {
    width: 60,
    height: 60,
    objectFit: 'contain',
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    textAlign: 'center',
    marginBottom: 15,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: primaryColor,
  },
  // Visit info bar
  visitInfoBar: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 6,
    marginBottom: 12,
  },
  visitDate: {
    fontSize: 14,
    fontWeight: 700,
  },
  visitType: {
    backgroundColor: primaryColor,
    color: 'white',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 4,
    fontWeight: 700,
  },
  // Pet info
  petInfoBox: {
    backgroundColor: `${primaryColor}15`,
    borderWidth: 1,
    borderColor: `${primaryColor}40`,
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
  },
  petName: {
    fontSize: 16,
    fontWeight: 700,
    marginBottom: 8,
    textAlign: 'right',
  },
  petDetailsGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
  },
  petDetail: {
    width: '48%',
    textAlign: 'right',
  },
  // Section
  section: {
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingBottom: 6,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 700,
    textAlign: 'right',
  },
  sectionContent: {
    textAlign: 'right',
  },
  // Items (diagnoses, treatments, etc.)
  itemTitle: {
    fontWeight: 700,
    textAlign: 'right',
    marginBottom: 2,
  },
  itemNotes: {
    color: '#666',
    textAlign: 'right',
    marginBottom: 6,
  },
  // Medications
  medicationItem: {
    marginBottom: 8,
  },
  medicationName: {
    fontSize: 12,
    fontWeight: 700,
    textAlign: 'right',
  },
  medicationDetail: {
    color: '#666',
    textAlign: 'right',
  },
  // Charges
  chargesBox: {
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 6,
  },
  chargeRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  chargeTotal: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    paddingTop: 8,
    marginTop: 4,
  },
  totalLabel: {
    fontWeight: 700,
    fontSize: 13,
  },
  totalAmount: {
    fontWeight: 700,
    fontSize: 16,
    color: primaryColor,
  },
  // Next appointment
  appointmentBox: {
    backgroundColor: `${primaryColor}15`,
    borderWidth: 1,
    borderColor: `${primaryColor}40`,
    padding: 10,
    borderRadius: 6,
    marginBottom: 12,
  },
  appointmentText: {
    textAlign: 'right',
    fontWeight: 700,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  footerContent: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 30,
    backgroundColor: '#f5f5f5',
  },
  footerText: {
    fontSize: 9,
    color: '#666',
  },
  footerBar: {
    height: 8,
    backgroundColor: primaryColor,
  },
  // Text alignment helper
  rtlText: {
    textAlign: 'right',
  },
  label: {
    fontWeight: 700,
  },
});

interface VisitSummaryPdfProps {
  data: VisitSummaryData;
}

export const VisitSummaryPdf = ({ data }: VisitSummaryPdfProps) => {
  const primaryColor = data.primaryColor || '#E8833A';
  const styles = createStyles(primaryColor);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header Bar */}
        <View style={styles.headerBar} fixed />

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.clinicName}>{data.clinicName}</Text>
            {data.clinicVetLicense && (
              <Text style={styles.clinicInfo}>וטרינר | מס׳ רישיון: {data.clinicVetLicense}</Text>
            )}
          </View>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 10 }}>
            <View style={{ alignItems: 'flex-end' }}>
              {data.clinicPhone && (
                <Text style={styles.clinicInfo}>{data.clinicPhone}</Text>
              )}
              {data.clinicWebsite && (
                <Text style={styles.clinicInfo}>{data.clinicWebsite}</Text>
              )}
            </View>
            {data.clinicLogo && (
              <Image src={data.clinicLogo} style={styles.logo} />
            )}
          </View>
        </View>

        {/* Title with pet name and date */}
        <Text style={styles.title}>סיכום ביקור{'\u200F'} - {data.petName}{'\u200F'} - {data.visitDate}</Text>

        {/* Pet Info */}
        <View style={styles.petInfoBox}>
          <View style={styles.petDetailsGrid}>
            <Text style={styles.petDetail}>
              <Text style={styles.label}>סוג: </Text>
              {speciesLabels[data.petSpecies] || data.petSpecies}
            </Text>
            {data.petBreed && (
              <Text style={styles.petDetail}>
                <Text style={styles.label}>גזע: </Text>
                {data.petBreed}
              </Text>
            )}
            {data.petSex && (
              <Text style={styles.petDetail}>
                <Text style={styles.label}>מין: </Text>
                {sexLabels[data.petSex] || data.petSex}
              </Text>
            )}
            {data.petNeuterStatus && data.petNeuterStatus !== 'none' && (
              <Text style={styles.petDetail}>
                <Text style={styles.label}>עיקור: </Text>
                {neuterLabels[data.petNeuterStatus] || 'לא ידוע'}
              </Text>
            )}
            {data.petWeight && (
              <Text style={styles.petDetail}>
                <Text style={styles.label}>משקל: </Text>
                {data.petWeight} ק"ג
              </Text>
            )}
            {data.petAge && (
              <Text style={styles.petDetail}>
                <Text style={styles.label}>גיל: </Text>
                {data.petAge}
              </Text>
            )}
          </View>
        </View>

        {/* 1. היסטוריה כללית */}
        {data.generalHistory && (
          <View style={styles.section} wrap={false}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>היסטוריה כללית</Text>
            </View>
            <Text style={styles.sectionContent}>{data.generalHistory}</Text>
          </View>
        )}

        {/* 2. היסטוריה רפואית */}
        {data.medicalHistory && (
          <View style={styles.section} wrap={false}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>היסטוריה רפואית</Text>
            </View>
            <Text style={styles.sectionContent}>{data.medicalHistory}</Text>
          </View>
        )}

        {/* 3. היסטוריה נוכחית */}
        {data.currentHistory && (
          <View style={styles.section} wrap={false}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>היסטוריה נוכחית</Text>
            </View>
            <Text style={styles.sectionContent}>{data.currentHistory}</Text>
          </View>
        )}

        {/* 4. בדיקה פיזיקלית */}
        {data.physicalExam && (
          <View style={styles.section} wrap={false}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>בדיקה פיזיקלית</Text>
            </View>
            <Text style={styles.sectionContent}>{data.physicalExam}</Text>
          </View>
        )}

        {/* 5. טיפול (כולל אבחנות, טיפולים ותרופות) */}
        {(data.diagnoses.length > 0 || data.treatments.length > 0 || data.medications.length > 0) && (
          <View style={styles.section} wrap={false}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>טיפול</Text>
            </View>

            {/* אבחנות */}
            {data.diagnoses.length > 0 && (
              <View style={{ marginBottom: 8 }}>
                <Text style={styles.itemTitle}>אבחנות:</Text>
                {data.diagnoses.map((d, idx) => (
                  <View key={idx}>
                    <Text style={styles.sectionContent}>{d.diagnosis}{d.notes ? ':' : ''}</Text>
                    {d.notes && <Text style={styles.itemNotes}>{d.notes}</Text>}
                  </View>
                ))}
              </View>
            )}

            {/* טיפולים */}
            {data.treatments.length > 0 && (
              <View style={{ marginBottom: 8 }}>
                <Text style={styles.itemTitle}>טיפולים שבוצעו:</Text>
                {data.treatments.map((t, idx) => (
                  <View key={idx}>
                    <Text style={styles.sectionContent}>{t.treatment}{t.notes ? ':' : ''}</Text>
                    {t.notes && <Text style={styles.itemNotes}>{t.notes}</Text>}
                  </View>
                ))}
              </View>
            )}

            {/* תרופות */}
            {data.medications.length > 0 && (
              <View>
                <Text style={styles.itemTitle}>תרופות:</Text>
                {data.medications.map((m, idx) => (
                  <View key={idx} style={styles.medicationItem}>
                    <Text style={styles.medicationName}>
                      {m.medication}
                      {m.quantity && m.quantity > 1 ? ` (x${m.quantity})` : ''}
                    </Text>
                    {m.dosage && <Text style={styles.medicationDetail}>מינון: {m.dosage}</Text>}
                    {m.frequency && <Text style={styles.medicationDetail}>תדירות: {m.frequency}</Text>}
                    {m.duration && <Text style={styles.medicationDetail}>משך: {m.duration}</Text>}
                    {m.quantity && <Text style={styles.medicationDetail}>כמות: {m.quantity}</Text>}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* 5.5 חיסונים */}
        {data.vaccinations && data.vaccinations.length > 0 && (
          <View style={styles.section} wrap={false}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>חיסונים</Text>
            </View>
            {data.vaccinations.map((v, idx) => (
              <View key={idx} style={{ marginBottom: 6 }}>
                <Text style={styles.medicationName}>{v.vaccination_type}</Text>
                {v.vaccination_date && (
                  <Text style={styles.medicationDetail}>תאריך חיסון: {v.vaccination_date}</Text>
                )}
                {v.next_vaccination_date && (
                  <Text style={styles.medicationDetail}>חיסון הבא: {v.next_vaccination_date}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* 6. סיכום לבעלים */}
        {data.notesToOwner && (
          <View style={styles.section} wrap={false}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>סיכום לבעלים</Text>
            </View>
            <Text style={styles.sectionContent}>{data.notesToOwner}</Text>
          </View>
        )}

        {/* 7. הנחיות להמשך */}
        {data.recommendations && (
          <View style={styles.section} wrap={false}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>הנחיות להמשך</Text>
            </View>
            <Text style={styles.sectionContent}>{data.recommendations}</Text>
          </View>
        )}

        {/* תור המשך - אם יש */}
        {data.nextAppointment && (
          <View style={styles.appointmentBox}>
            <Text style={styles.appointmentText}>תור המשך: {data.nextAppointment}</Text>
          </View>
        )}

        {/* 8. חיוב */}
        {data.charges && data.charges.length > 0 && (
          <View style={styles.section} wrap={false}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>חיוב</Text>
            </View>
            <View style={styles.chargesBox}>
              {data.charges.map((charge, idx) => (
                <View key={idx} style={styles.chargeRow}>
                  <Text>
                    {charge.name}
                    {charge.quantity > 1 && ` x${charge.quantity}`}
                  </Text>
                  <Text>{charge.total.toFixed(2)} ש"ח</Text>
                </View>
              ))}
              <View style={styles.chargeTotal}>
                <Text style={styles.totalLabel}>סה"כ</Text>
                <Text style={styles.totalAmount}>{data.totalAmount?.toFixed(2)} ש"ח</Text>
              </View>
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <View style={styles.footerContent}>
            <Text style={[styles.footerText, { color: primaryColor, fontWeight: 700 }]}>
              {data.clinicName}
            </Text>
            <View style={{ flexDirection: 'row-reverse', gap: 15 }}>
              {data.clinicPhone && <Text style={styles.footerText}>{data.clinicPhone}</Text>}
              {data.clinicWebsite && <Text style={styles.footerText}>{data.clinicWebsite}</Text>}
              {data.clinicAddress && <Text style={styles.footerText}>{data.clinicAddress}</Text>}
            </View>
          </View>
          <View style={styles.footerBar} />
        </View>
      </Page>
    </Document>
  );
};
