import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Settings as SettingsIcon,
  MessageCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Shield,
  Smartphone,
  Loader2,
  Tags,
  Building2,
  Upload,
  Globe,
  Phone,
  Palette,
} from 'lucide-react';
import { useWhatsApp } from '@/hooks/useWhatsApp';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { setWebhookUrl, getWebhookSettings } from '@/lib/whatsappService';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { TagManagement } from '@/components/settings/TagManagement';
import { useClinic } from '@/hooks/useClinic';
import { supabase } from '@/integrations/supabase/client';

const Settings = () => {
  const { toast } = useToast();
  const { enrollMFA, verifyMFA, unenrollMFA, getMFAFactors } = useAuth();
  const {
    settings,
    loading,
    checking,
    isConfigured,
    isAuthorized,
    saveSettings,
    checkStatus,
  } = useWhatsApp();

  // Settings form state
  const [instanceId, setInstanceId] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [enabled, setEnabled] = useState(false);

  // Webhook state
  const [settingWebhook, setSettingWebhook] = useState(false);
  const [webhookStatus, setWebhookStatus] = useState<string | null>(null);
  const [allSettings, setAllSettings] = useState<any>(null);

  // Clinic settings state
  const { clinicId } = useClinic();
  const [clinicName, setClinicName] = useState('');
  const [clinicPhone, setClinicPhone] = useState('');
  const [clinicWebsite, setClinicWebsite] = useState('');
  const [clinicVetLicense, setClinicVetLicense] = useState('');
  const [clinicLogo, setClinicLogo] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState('#E8833A');
  const [clinicLoading, setClinicLoading] = useState(false);
  const [savingClinic, setSavingClinic] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // MFA state
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [showMFASetup, setShowMFASetup] = useState(false);
  const [mfaQrCode, setMfaQrCode] = useState<string | null>(null);
  const [mfaSecret, setMfaSecret] = useState<string | null>(null);
  const [mfaSetupFactorId, setMfaSetupFactorId] = useState<string | null>(null);
  const [mfaVerifyCode, setMfaVerifyCode] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);

  // Load MFA status
  useEffect(() => {
    const loadMFAStatus = async () => {
      const { factors } = await getMFAFactors();
      if (factors && factors.length > 0) {
        setMfaEnabled(true);
        setMfaFactorId(factors[0].id);
      }
    };
    loadMFAStatus();
  }, []);

  // Load clinic settings
  useEffect(() => {
    const loadClinicSettings = async () => {
      if (!clinicId) return;
      setClinicLoading(true);
      try {
        const { data: clinic, error } = await supabase
          .from('clinics')
          .select('*')
          .eq('id', clinicId)
          .single();

        if (error) throw error;

        if (clinic) {
          setClinicName(clinic.name || '');
          setClinicPhone(clinic.phone || '');
          setClinicLogo(clinic.logo_url || null);
          const settings = clinic.settings as Record<string, any> || {};
          setClinicWebsite(settings.website || '');
          setClinicVetLicense(settings.vetLicense || '');
          setPrimaryColor(settings.primaryColor || '#E8833A');
        }
      } catch (error) {
        console.error('Error loading clinic settings:', error);
      } finally {
        setClinicLoading(false);
      }
    };
    loadClinicSettings();
  }, [clinicId]);

  // Handle logo upload
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !clinicId) return;

    setUploadingLogo(true);
    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${clinicId}-logo.${fileExt}`;
      const filePath = `clinic-logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('sum')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('sum')
        .getPublicUrl(filePath);

      setClinicLogo(urlData.publicUrl);
      toast({ title: 'הצלחה', description: 'הלוגו הועלה בהצלחה' });
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      toast({ title: 'שגיאה', description: 'שגיאה בהעלאת הלוגו', variant: 'destructive' });
    } finally {
      setUploadingLogo(false);
    }
  };

  // Save clinic settings
  const handleSaveClinicSettings = async () => {
    if (!clinicId) return;
    setSavingClinic(true);
    try {
      // First get current settings to preserve whatsapp config
      const { data: currentClinic } = await supabase
        .from('clinics')
        .select('settings')
        .eq('id', clinicId)
        .single();

      const currentSettings = (currentClinic?.settings as Record<string, any>) || {};

      const { error } = await supabase
        .from('clinics')
        .update({
          name: clinicName,
          phone: clinicPhone,
          logo_url: clinicLogo,
          settings: {
            ...currentSettings,
            website: clinicWebsite,
            vetLicense: clinicVetLicense,
            primaryColor: primaryColor,
          },
        })
        .eq('id', clinicId);

      if (error) throw error;
      toast({ title: 'הצלחה', description: 'הגדרות המרפאה נשמרו בהצלחה' });
    } catch (error: any) {
      console.error('Error saving clinic settings:', error);
      toast({ title: 'שגיאה', description: 'שגיאה בשמירת ההגדרות', variant: 'destructive' });
    } finally {
      setSavingClinic(false);
    }
  };

  const handleEnableMFA = async () => {
    setMfaLoading(true);
    try {
      const { data, error } = await enrollMFA();
      if (error) {
        toast({ title: 'שגיאה', description: error.message, variant: 'destructive' });
        return;
      }
      if (data) {
        setMfaQrCode(data.totp.qr_code);
        setMfaSecret(data.totp.secret);
        setMfaSetupFactorId(data.id);
        setShowMFASetup(true);
      }
    } catch (error: any) {
      toast({ title: 'שגיאה', description: error.message, variant: 'destructive' });
    } finally {
      setMfaLoading(false);
    }
  };

  const handleVerifyMFASetup = async () => {
    if (!mfaSetupFactorId || mfaVerifyCode.length !== 6) return;
    setMfaLoading(true);
    try {
      const { error } = await verifyMFA(mfaSetupFactorId, mfaVerifyCode);
      if (error) {
        toast({ title: 'שגיאה', description: 'קוד אימות שגוי', variant: 'destructive' });
        return;
      }
      setMfaEnabled(true);
      setMfaFactorId(mfaSetupFactorId);
      setShowMFASetup(false);
      setMfaVerifyCode('');
      toast({ title: 'הצלחה', description: 'אימות דו-שלבי הופעל בהצלחה!' });
    } catch (error: any) {
      toast({ title: 'שגיאה', description: error.message, variant: 'destructive' });
    } finally {
      setMfaLoading(false);
    }
  };

  const handleDisableMFA = async () => {
    if (!mfaFactorId) return;
    setMfaLoading(true);
    try {
      const { error } = await unenrollMFA(mfaFactorId);
      if (error) {
        toast({ title: 'שגיאה', description: error.message, variant: 'destructive' });
        return;
      }
      setMfaEnabled(false);
      setMfaFactorId(null);
      toast({ title: 'הצלחה', description: 'אימות דו-שלבי בוטל' });
    } catch (error: any) {
      toast({ title: 'שגיאה', description: error.message, variant: 'destructive' });
    } finally {
      setMfaLoading(false);
    }
  };

  // Load settings into form
  useEffect(() => {
    if (settings) {
      setInstanceId(settings.instanceId || '');
      setApiToken(settings.apiToken || '');
      setEnabled(settings.isEnabled || false);
    }
  }, [settings]);

  // Webhook URL state
  const [currentWebhookUrl, setCurrentWebhookUrl] = useState<string | null>(null);
  const [incomingWebhookEnabled, setIncomingWebhookEnabled] = useState<string | null>(null);

  // Check webhook settings when settings change
  const checkWebhookSettings = async () => {
    if (instanceId && apiToken) {
      const result = await getWebhookSettings({ instanceId, apiToken, isEnabled: true });
      console.log('Full webhook settings:', result);
      setAllSettings(result);
      setCurrentWebhookUrl(result.webhookUrl || null);
      setIncomingWebhookEnabled(result.incomingWebhook || null);
      if (result.webhookUrl && result.incomingWebhook === 'yes') {
        const isCorrect = result.webhookUrl.includes('whatsapp-webhook');
        setWebhookStatus(isCorrect ? 'מוגדר' : 'URL שגוי');
      } else if (result.webhookUrl && result.incomingWebhook !== 'yes') {
        setWebhookStatus('Incoming כבוי');
      } else {
        setWebhookStatus('לא מוגדר');
      }
    }
  };

  useEffect(() => {
    checkWebhookSettings();
  }, [instanceId, apiToken]);

  // Handle save settings
  const handleSaveSettings = async () => {
    await saveSettings({
      instanceId,
      apiToken,
      isEnabled: enabled,
    });
  };

  // Setup webhook for receiving incoming messages
  const handleSetupWebhook = async () => {
    if (!instanceId || !apiToken) {
      toast({
        title: 'שגיאה',
        description: 'יש להזין Instance ID ו-API Token קודם',
        variant: 'destructive',
      });
      return;
    }

    setSettingWebhook(true);
    try {
      const webhookUrl = 'https://dgazghyyaeknkyxlvhdu.supabase.co/functions/v1/whatsapp-webhook';

      const result = await setWebhookUrl(
        { instanceId, apiToken, isEnabled: true },
        webhookUrl
      );

      if (result.success) {
        setWebhookStatus('מוגדר');
        toast({
          title: 'הצלחה',
          description: 'Webhook להודעות נכנסות הוגדר בהצלחה',
        });
      } else {
        toast({
          title: 'שגיאה',
          description: result.error || 'שגיאה בהגדרת webhook',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSettingWebhook(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">טוען...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6" dir="rtl">
        {/* Header */}
        <div className="flex items-center gap-3">
          <SettingsIcon className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">הגדרות</h1>
            <p className="text-muted-foreground">הגדרות מערכת ואינטגרציות</p>
          </div>
        </div>

        <Tabs defaultValue="clinic" className="space-y-6" dir="rtl">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="clinic" className="flex items-center gap-2 flex-row-reverse">
              <Building2 className="h-4 w-4" />
              מרפאה
            </TabsTrigger>
            <TabsTrigger value="whatsapp" className="flex items-center gap-2 flex-row-reverse">
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </TabsTrigger>
            <TabsTrigger value="tags" className="flex items-center gap-2 flex-row-reverse">
              <Tags className="h-4 w-4" />
              תגיות
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2 flex-row-reverse">
              <Shield className="h-4 w-4" />
              אבטחה
            </TabsTrigger>
          </TabsList>

          {/* Clinic Tab */}
          <TabsContent value="clinic" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Building2 className="h-6 w-6 text-orange-600" />
                  </div>
                  <div>
                    <CardTitle>פרטי המרפאה</CardTitle>
                    <CardDescription>
                      הגדר את פרטי המרפאה שיופיעו במסמכים ובסיכומי ביקור
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {clinicLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    {/* Logo Upload */}
                    <div className="space-y-3">
                      <Label>לוגו המרפאה</Label>
                      <div className="flex items-center gap-4">
                        {clinicLogo ? (
                          <img
                            src={clinicLogo}
                            alt="לוגו המרפאה"
                            className="w-24 h-24 object-contain border rounded-lg bg-white p-2"
                          />
                        ) : (
                          <div className="w-24 h-24 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted/50">
                            <Upload className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                        <div className="space-y-2">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            className="hidden"
                            id="logo-upload"
                          />
                          <Button
                            variant="outline"
                            onClick={() => document.getElementById('logo-upload')?.click()}
                            disabled={uploadingLogo}
                          >
                            {uploadingLogo ? (
                              <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                            ) : (
                              <Upload className="h-4 w-4 ml-2" />
                            )}
                            {clinicLogo ? 'החלף לוגו' : 'העלה לוגו'}
                          </Button>
                          <p className="text-xs text-muted-foreground">
                            מומלץ: תמונה מרובעת, מינימום 200x200 פיקסלים
                          </p>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Clinic Details */}
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="clinicName">שם המרפאה / הרופא</Label>
                        <Input
                          id="clinicName"
                          placeholder="ד״ר ישראל ישראלי"
                          value={clinicName}
                          onChange={(e) => setClinicName(e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="clinicVetLicense">מספר רישיון וטרינר</Label>
                        <Input
                          id="clinicVetLicense"
                          placeholder="1234"
                          value={clinicVetLicense}
                          onChange={(e) => setClinicVetLicense(e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="clinicPhone">
                          <Phone className="h-4 w-4 inline ml-1" />
                          טלפון
                        </Label>
                        <Input
                          id="clinicPhone"
                          placeholder="054-1234567"
                          value={clinicPhone}
                          onChange={(e) => setClinicPhone(e.target.value)}
                          dir="ltr"
                          className="text-right"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="clinicWebsite">
                          <Globe className="h-4 w-4 inline ml-1" />
                          אתר אינטרנט
                        </Label>
                        <Input
                          id="clinicWebsite"
                          placeholder="www.example.com"
                          value={clinicWebsite}
                          onChange={(e) => setClinicWebsite(e.target.value)}
                          dir="ltr"
                          className="text-right"
                        />
                      </div>
                    </div>

                    <Separator />

                    {/* Color Picker */}
                    <div className="space-y-3">
                      <Label>
                        <Palette className="h-4 w-4 inline ml-1" />
                        צבע ראשי למסמכים
                      </Label>
                      <div className="flex items-center gap-4">
                        <input
                          type="color"
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          className="w-16 h-10 rounded border cursor-pointer"
                        />
                        <Input
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          className="w-32"
                          dir="ltr"
                        />
                        <div
                          className="px-4 py-2 rounded text-white font-medium"
                          style={{ backgroundColor: primaryColor }}
                        >
                          תצוגה מקדימה
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        צבע זה ישמש ככותרות וכפסים בסיכומי ביקור
                      </p>
                    </div>

                    <Separator />

                    {/* Save Button */}
                    <Button
                      onClick={handleSaveClinicSettings}
                      disabled={savingClinic}
                      className="w-full"
                    >
                      {savingClinic ? (
                        <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                      ) : (
                        <CheckCircle className="h-4 w-4 ml-2" />
                      )}
                      שמור הגדרות מרפאה
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* WhatsApp Tab */}
          <TabsContent value="whatsapp" className="space-y-6">
            {/* WhatsApp Settings Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <MessageCircle className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <CardTitle>הגדרות WhatsApp</CardTitle>
                      <CardDescription>
                        חיבור חשבון WhatsApp דרך Green API לשליחת וקבלת הודעות
                      </CardDescription>
                    </div>
                  </div>
                  {isConfigured && (
                    <Badge variant={isAuthorized ? 'default' : 'destructive'}>
                      {isAuthorized ? (
                        <>
                          <CheckCircle className="h-3 w-3 ml-1" />
                          מחובר
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3 w-3 ml-1" />
                          לא מחובר
                        </>
                      )}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Enable/Disable Toggle */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label className="text-base">הפעל אינטגרציית WhatsApp</Label>
                    <p className="text-sm text-muted-foreground">
                      אפשר שליחת וקבלת הודעות WhatsApp ללקוחות
                    </p>
                  </div>
                  <Switch checked={enabled} onCheckedChange={setEnabled} />
                </div>

                <Separator />

                {/* API Credentials */}
                <div className="space-y-4">
                  <h4 className="font-medium">פרטי התחברות Green API</h4>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="instanceId">Instance ID</Label>
                      <Input
                        id="instanceId"
                        placeholder="1234567890"
                        value={instanceId}
                        onChange={(e) => setInstanceId(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        מספר ה-Instance מחשבון Green API שלך
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="apiToken">API Token</Label>
                      <Input
                        id="apiToken"
                        type="password"
                        placeholder="xxxxxxxxxxxxxxxxxxxx"
                        value={apiToken}
                        onChange={(e) => setApiToken(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        ה-Token לגישה ל-API
                      </p>
                    </div>
                  </div>
                </div>

                {/* Save & Check Buttons */}
                <div className="flex gap-3">
                  <Button onClick={handleSaveSettings} className="flex-1">
                    שמור הגדרות
                  </Button>
                  <Button
                    variant="outline"
                    onClick={checkStatus}
                    disabled={!instanceId || !apiToken || checking}
                  >
                    {checking ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      'בדוק חיבור'
                    )}
                  </Button>
                </div>

                {/* Connection Status */}
                {isConfigured && (
                  <div className="p-4 border rounded-lg space-y-2">
                    <h4 className="font-medium">סטטוס חיבור</h4>
                    <div className="flex items-center gap-2">
                      {isAuthorized ? (
                        <>
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <span className="text-green-600">מחובר ומוכן לשליחה</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-5 w-5 text-red-600" />
                          <span className="text-red-600">
                            לא מחובר - יש לסרוק QR בלוח הבקרה של Green API
                          </span>
                        </>
                      )}
                    </div>
                    {settings?.connectedPhone && (
                      <p className="text-sm text-muted-foreground">
                        מספר מחובר: {settings.connectedPhone}
                      </p>
                    )}
                    {settings?.lastChecked && (
                      <p className="text-xs text-muted-foreground">
                        בדיקה אחרונה:{' '}
                        {format(new Date(settings.lastChecked), 'dd/MM/yyyy HH:mm', {
                          locale: he,
                        })}
                      </p>
                    )}
                  </div>
                )}

                {/* Webhook Setup */}
                {isConfigured && (
                  <div className="p-4 border rounded-lg space-y-3">
                    <h4 className="font-medium">הגדרת קבלת הודעות נכנסות</h4>
                    <p className="text-sm text-muted-foreground">
                      כדי לקבל הודעות נכנסות מלקוחות, יש להגדיר webhook ב-Green API
                    </p>
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        onClick={handleSetupWebhook}
                        disabled={settingWebhook}
                      >
                        {settingWebhook ? (
                          <RefreshCw className="h-4 w-4 ml-2 animate-spin" />
                        ) : null}
                        הגדר Webhook אוטומטית
                      </Button>
                      {webhookStatus && (
                        <Badge variant={webhookStatus === 'מוגדר' ? 'default' : 'secondary'}>
                          {webhookStatus === 'מוגדר' ? (
                            <CheckCircle className="h-3 w-3 ml-1" />
                          ) : (
                            <XCircle className="h-3 w-3 ml-1" />
                          )}
                          {webhookStatus}
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button variant="outline" size="sm" onClick={checkWebhookSettings}>
                        <RefreshCw className="h-3 w-3 ml-1" />
                        רענן הגדרות
                      </Button>
                    </div>
                    <div className="mt-3 p-3 bg-muted/50 rounded text-xs space-y-1">
                      <p><strong>Webhook URL:</strong> {currentWebhookUrl || 'לא מוגדר'}</p>
                      <p><strong>Incoming Webhook:</strong> {incomingWebhookEnabled || 'לא מוגדר'}</p>
                      {allSettings && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-muted-foreground">כל ההגדרות מ-Green API</summary>
                          <pre className="mt-2 p-2 bg-black/10 rounded overflow-auto text-[10px]">
                            {JSON.stringify(allSettings, null, 2)}
                          </pre>
                        </details>
                      )}
                      <p className="pt-2 text-muted-foreground">
                        URL נדרש: <code>https://dgazghyyaeknkyxlvhdu.supabase.co/functions/v1/whatsapp-webhook</code>
                      </p>
                    </div>
                    <div className="mt-3 p-3 border border-yellow-200 bg-yellow-50 rounded text-sm">
                      <p className="font-medium text-yellow-800 mb-2">אם הודעות לא מתקבלות:</p>
                      <ol className="list-decimal list-inside space-y-1 text-yellow-700">
                        <li>היכנס ל-<a href="https://console.green-api.com" target="_blank" className="underline">console.green-api.com</a></li>
                        <li>בחר את ה-Instance שלך</li>
                        <li>לך ל-Settings → Webhooks</li>
                        <li>וודא ש-<strong>webhookUrl</strong> מוגדר נכון</li>
                        <li>וודא ש-<strong>incomingWebhook</strong> מסומן כ-Yes</li>
                      </ol>
                    </div>
                  </div>
                )}

                <Separator />

                {/* Instructions */}
                <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                  <h4 className="font-medium">הוראות הגדרה:</h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                    <li>
                      היכנס ל-
                      <a
                        href="https://green-api.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        green-api.com
                      </a>
                      {' '}וצור חשבון
                    </li>
                    <li>צור Instance חדש ורשום את ה-Instance ID וה-API Token</li>
                    <li>בלוח הבקרה של Green API, סרוק את ה-QR עם WhatsApp</li>
                    <li>הזן את הפרטים כאן ושמור</li>
                    <li>לחץ "בדוק חיבור" לוודא שהכל עובד</li>
                    <li>לחץ "הגדר Webhook אוטומטית" לקבלת הודעות נכנסות</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tags Tab */}
          <TabsContent value="tags">
            <TagManagement />
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            {/* Security Settings Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Shield className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle>אבטחת חשבון</CardTitle>
                    <CardDescription>
                      הגדרות אבטחה נוספות להגנה על החשבון שלך
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* MFA Toggle */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Smartphone className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <Label className="text-base">אימות דו-שלבי (2FA)</Label>
                      <p className="text-sm text-muted-foreground">
                        הוסף שכבת אבטחה נוספת עם אפליקציית אימות
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {mfaEnabled && (
                      <Badge variant="default">
                        <CheckCircle className="h-3 w-3 ml-1" />
                        פעיל
                      </Badge>
                    )}
                    <Button
                      variant={mfaEnabled ? 'destructive' : 'default'}
                      size="sm"
                      onClick={mfaEnabled ? handleDisableMFA : handleEnableMFA}
                      disabled={mfaLoading}
                    >
                      {mfaLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : mfaEnabled ? (
                        'בטל'
                      ) : (
                        'הפעל'
                      )}
                    </Button>
                  </div>
                </div>

                {/* Session info */}
                <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                  <h4 className="font-medium">מידע על הפעלה</h4>
                  <p className="text-sm text-muted-foreground">
                    ההתחברות שלך תפוג אוטומטית לאחר 8 שעות של חוסר פעילות
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* MFA Setup Dialog */}
      <Dialog open={showMFASetup} onOpenChange={setShowMFASetup}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle>הגדרת אימות דו-שלבי</DialogTitle>
            <DialogDescription>
              סרוק את קוד ה-QR באפליקציית האימות שלך (Google Authenticator, Authy וכו')
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {mfaQrCode && (
              <div className="flex justify-center p-4 bg-white rounded-lg">
                <img src={mfaQrCode} alt="QR Code" className="w-48 h-48" />
              </div>
            )}
            {mfaSecret && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">לא יכול לסרוק? הזן ידנית:</p>
                <code className="text-sm font-mono break-all">{mfaSecret}</code>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="mfa-setup-code">הזן את הקוד מהאפליקציה</Label>
              <Input
                id="mfa-setup-code"
                type="text"
                placeholder="000000"
                value={mfaVerifyCode}
                onChange={(e) => setMfaVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                dir="ltr"
                className="text-center text-2xl tracking-widest"
                maxLength={6}
              />
            </div>
            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={handleVerifyMFASetup}
                disabled={mfaLoading || mfaVerifyCode.length !== 6}
              >
                {mfaLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'אמת והפעל'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowMFASetup(false);
                  setMfaVerifyCode('');
                }}
              >
                ביטול
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Settings;
