import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { visitId } = await req.json();

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Fetch visit data with related information
    const { data: visit, error } = await supabaseClient
      .from('visits')
      .select(`
        *,
        clients:client_id(*),
        pets:pet_id(*),
        clinics:clinic_id(*)
      `)
      .eq('id', visitId)
      .single();

    if (error) throw error;

    // Generate HTML for PDF
    const html = `
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>סיכום ביקור - ${visit.pets?.name}</title>
        <style>
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
          body { 
            font-family: Arial, sans-serif; 
            padding: 40px;
            background: white;
            color: #000;
          }
          .header { 
            text-align: center; 
            margin-bottom: 30px; 
            border-bottom: 3px solid #2563eb; 
            padding-bottom: 20px; 
          }
          .clinic-name { 
            font-size: 28px; 
            font-weight: bold; 
            color: #2563eb;
            margin-bottom: 10px;
          }
          .clinic-info {
            font-size: 14px;
            color: #666;
          }
          .section { 
            margin: 25px 0; 
            page-break-inside: avoid;
          }
          .section-title { 
            font-size: 20px; 
            font-weight: bold; 
            margin-bottom: 15px; 
            color: #2563eb;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 8px;
          }
          .field { 
            margin: 12px 0;
            display: flex;
            align-items: baseline;
          }
          .label { 
            font-weight: bold; 
            min-width: 150px;
            color: #374151;
          }
          .value { 
            color: #000;
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 15px 0;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }
          th, td { 
            border: 1px solid #d1d5db; 
            padding: 12px; 
            text-align: right; 
          }
          th { 
            background-color: #2563eb;
            color: white;
            font-weight: bold;
          }
          tr:nth-child(even) {
            background-color: #f9fafb;
          }
          .print-button {
            position: fixed;
            top: 20px;
            left: 20px;
            padding: 12px 24px;
            background: #2563eb;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 16px;
            font-weight: bold;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          }
          .print-button:hover {
            background: #1d4ed8;
          }
          @media print {
            .print-button { display: none; }
          }
        </style>
      </head>
      <body>
        <button class="print-button no-print" onclick="window.print()">הדפס / שמור כ-PDF</button>
        
        <div class="header">
          <div class="clinic-name">${visit.clinics?.name || 'מרפאה וטרינרית'}</div>
          <div class="clinic-info">
            ${visit.clinics?.address ? `<div>${visit.clinics.address}</div>` : ''}
            ${visit.clinics?.phone ? `<div>טלפון: ${visit.clinics.phone}</div>` : ''}
            ${visit.clinics?.email ? `<div>דוא"ל: ${visit.clinics.email}</div>` : ''}
          </div>
        </div>

        <div class="section">
          <div class="section-title">פרטי הביקור</div>
          <div class="field">
            <span class="label">תאריך ביקור:</span>
            <span class="value">${new Date(visit.visit_date).toLocaleDateString('he-IL', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</span>
          </div>
          <div class="field">
            <span class="label">בעל החיה:</span>
            <span class="value">${visit.clients?.first_name} ${visit.clients?.last_name}</span>
          </div>
          ${visit.clients?.phone_primary ? `
          <div class="field">
            <span class="label">טלפון:</span>
            <span class="value">${visit.clients.phone_primary}</span>
          </div>
          ` : ''}
          <div class="field">
            <span class="label">שם החיה:</span>
            <span class="value">${visit.pets?.name}</span>
          </div>
          <div class="field">
            <span class="label">סוג:</span>
            <span class="value">${visit.pets?.species === 'dog' ? 'כלב' : visit.pets?.species === 'cat' ? 'חתול' : visit.pets?.species}</span>
          </div>
          ${visit.pets?.breed ? `
          <div class="field">
            <span class="label">גזע:</span>
            <span class="value">${visit.pets.breed}</span>
          </div>
          ` : ''}
          <div class="field">
            <span class="label">סוג ביקור:</span>
            <span class="value">${visit.visit_type}</span>
          </div>
        </div>

        ${visit.chief_complaint ? `
        <div class="section">
          <div class="section-title">תלונה עיקרית</div>
          <p style="margin: 0; line-height: 1.6;">${visit.chief_complaint}</p>
        </div>
        ` : ''}

        ${visit.diagnoses && visit.diagnoses.length > 0 ? `
        <div class="section">
          <div class="section-title">אבחנות</div>
          <table>
            <thead>
              <tr>
                <th>אבחנה</th>
                <th>הערות</th>
              </tr>
            </thead>
            <tbody>
              ${visit.diagnoses.map((d: any) => `
                <tr>
                  <td>${d.diagnosis}</td>
                  <td>${d.notes || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        ${visit.medications && visit.medications.length > 0 ? `
        <div class="section">
          <div class="section-title">תרופות שנרשמו</div>
          <table>
            <thead>
              <tr>
                <th>תרופה</th>
                <th>מינון</th>
              </tr>
            </thead>
            <tbody>
              ${visit.medications.map((m: any) => `
                <tr>
                  <td>${m.medication}</td>
                  <td>${m.dosage || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        ${visit.recommendations ? `
        <div class="section">
          <div class="section-title">המלצות</div>
          <p style="margin: 0; line-height: 1.6;">${visit.recommendations}</p>
        </div>
        ` : ''}

        ${visit.client_summary ? `
        <div class="section">
          <div class="section-title">סיכום ללקוח</div>
          <p style="margin: 0; line-height: 1.6; background: #f0f9ff; padding: 15px; border-radius: 6px;">${visit.client_summary}</p>
        </div>
        ` : ''}

        <div style="margin-top: 50px; padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;">
          <p>מסמך זה הופק באופן אוטומטי ממערכת ניהול המרפאה</p>
          <p>תאריך הפקה: ${new Date().toLocaleDateString('he-IL')}</p>
        </div>
      </body>
      </html>
    `;

    return new Response(html, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html; charset=utf-8',
      },
    });

  } catch (error) {
    console.error('PDF generation error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
