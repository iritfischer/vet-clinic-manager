import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Activity, Loader2, ArrowRight } from 'lucide-react';

const Auth = () => {
  const navigate = useNavigate();
  const { signIn, signUp, resetPasswordRequest, challengeMFA, user } = useAuth();
  const [loading, setLoading] = useState(false);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Forgot password state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  // MFA state
  const [showMFA, setShowMFA] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);

  // Signup form state
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [clinicName, setClinicName] = useState('');

  // Redirect if already logged in
  if (user) {
    navigate('/dashboard');
    return null;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error, mfaRequired, factorId } = await signIn(loginEmail, loginPassword);

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast.error('אימייל או סיסמה שגויים');
        } else {
          toast.error(error.message);
        }
      } else if (mfaRequired && factorId) {
        // Show MFA dialog
        setMfaFactorId(factorId);
        setShowMFA(true);
      } else {
        toast.success('התחברת בהצלחה!');
      }
    } catch (error) {
      toast.error('אירעה שגיאה בהתחברות');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);

    try {
      const { error } = await resetPasswordRequest(forgotEmail);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('נשלח אליך מייל לאיפוס הסיסמה');
        setShowForgotPassword(false);
        setForgotEmail('');
      }
    } catch (error) {
      toast.error('אירעה שגיאה בשליחת המייל');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleMFAVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setMfaLoading(true);

    try {
      const { error } = await challengeMFA(mfaFactorId, mfaCode);
      if (error) {
        toast.error('קוד אימות שגוי');
      } else {
        toast.success('התחברת בהצלחה!');
        setShowMFA(false);
        setMfaCode('');
      }
    } catch (error) {
      toast.error('אירעה שגיאה באימות');
    } finally {
      setMfaLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await signUp(signupEmail, signupPassword, {
        firstName,
        lastName,
        phone,
        clinicName,
      });

      if (error) {
        if (error.message.includes('already registered')) {
          toast.error('המשתמש כבר קיים במערכת');
        } else {
          toast.error(error.message);
        }
      } else {
        toast.success('החשבון נוצר בהצלחה! מעביר אותך לדשבורד...');
        navigate('/dashboard');
      }
    } catch (error) {
      toast.error('אירעה שגיאה ביצירת החשבון');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/30 to-background p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center gap-3">
            <div className="bg-primary p-3 rounded-xl">
              <Activity className="h-8 w-8 text-primary-foreground" />
            </div>
            <div className="text-right">
              <h1 className="text-2xl font-bold text-foreground">VetClinic</h1>
              <p className="text-sm text-muted-foreground">מערכת ניהול מרפאה וטרינרית</p>
            </div>
          </div>
        </div>

        <Card className="border-border/50 shadow-lg">
          <CardHeader>
            <CardTitle className="text-right">ברוכים הבאים</CardTitle>
            <CardDescription className="text-right">
              התחבר או צור חשבון חדש לניהול המרפאה
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" dir="rtl">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">התחברות</TabsTrigger>
                <TabsTrigger value="signup">הרשמה</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2 text-right">
                    <Label htmlFor="login-email">אימייל</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="your@email.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                      disabled={loading}
                      dir="ltr"
                      className="text-left"
                    />
                  </div>
                  <div className="space-y-2 text-right">
                    <Label htmlFor="login-password">סיסמה</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                      disabled={loading}
                      dir="ltr"
                      className="text-left"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        מתחבר...
                      </>
                    ) : (
                      'התחבר'
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="link"
                    className="w-full text-sm text-muted-foreground"
                    onClick={() => {
                      setForgotEmail(loginEmail);
                      setShowForgotPassword(true);
                    }}
                  >
                    שכחתי סיסמה
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 text-right">
                      <Label htmlFor="last-name">שם משפחה</Label>
                      <Input
                        id="last-name"
                        type="text"
                        placeholder="כהן"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                        disabled={loading}
                        dir="rtl"
                      />
                    </div>
                    <div className="space-y-2 text-right">
                      <Label htmlFor="first-name">שם פרטי</Label>
                      <Input
                        id="first-name"
                        type="text"
                        placeholder="משה"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                        disabled={loading}
                        dir="rtl"
                      />
                    </div>
                  </div>
                  <div className="space-y-2 text-right">
                    <Label htmlFor="clinic-name">שם המרפאה</Label>
                    <Input
                      id="clinic-name"
                      type="text"
                      placeholder="מרפאה וטרינרית הרצליה"
                      value={clinicName}
                      onChange={(e) => setClinicName(e.target.value)}
                      disabled={loading}
                      dir="rtl"
                    />
                  </div>
                  <div className="space-y-2 text-right">
                    <Label htmlFor="phone">טלפון</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="050-1234567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      disabled={loading}
                      dir="ltr"
                      className="text-left"
                    />
                  </div>
                  <div className="space-y-2 text-right">
                    <Label htmlFor="signup-email">אימייל</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="your@email.com"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      required
                      disabled={loading}
                      dir="ltr"
                      className="text-left"
                    />
                  </div>
                  <div className="space-y-2 text-right">
                    <Label htmlFor="signup-password">סיסמה</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      required
                      disabled={loading}
                      dir="ltr"
                      className="text-left"
                      minLength={6}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        יוצר חשבון...
                      </>
                    ) : (
                      'צור חשבון'
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-4">
          על ידי הרשמה, אתה מסכים לתנאי השימוש ומדיניות הפרטיות
        </p>
      </div>

      {/* Forgot Password Dialog */}
      <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>איפוס סיסמה</DialogTitle>
            <DialogDescription>
              הזן את כתובת האימייל שלך ונשלח לך קישור לאיפוס הסיסמה
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="forgot-email">אימייל</Label>
              <Input
                id="forgot-email"
                type="email"
                placeholder="your@email.com"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                required
                disabled={forgotLoading}
                dir="ltr"
                className="text-left"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1" disabled={forgotLoading}>
                {forgotLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    שולח...
                  </>
                ) : (
                  'שלח קישור לאיפוס'
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowForgotPassword(false)}
                disabled={forgotLoading}
              >
                ביטול
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* MFA Verification Dialog */}
      <Dialog open={showMFA} onOpenChange={setShowMFA}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>אימות דו-שלבי</DialogTitle>
            <DialogDescription>
              הזן את הקוד מאפליקציית האימות שלך
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleMFAVerify} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mfa-code">קוד אימות</Label>
              <Input
                id="mfa-code"
                type="text"
                placeholder="000000"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                disabled={mfaLoading}
                dir="ltr"
                className="text-center text-2xl tracking-widest"
                maxLength={6}
                autoComplete="one-time-code"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1" disabled={mfaLoading || mfaCode.length !== 6}>
                {mfaLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    מאמת...
                  </>
                ) : (
                  <>
                    אמת
                    <ArrowRight className="mr-2 h-4 w-4" />
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowMFA(false);
                  setMfaCode('');
                }}
                disabled={mfaLoading}
              >
                ביטול
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Auth;
