import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Users, PawPrint, FileText, TrendingUp } from 'lucide-react';

const Dashboard = () => {
  const stats = [
    {
      title: 'תורים היום',
      value: '12',
      description: '3 ממתינים לאישור',
      icon: Calendar,
      trend: '+2 מאתמול',
    },
    {
      title: 'לקוחות פעילים',
      value: '248',
      description: 'סה"כ לקוחות במערכת',
      icon: Users,
      trend: '+8 החודש',
    },
    {
      title: 'חיות מחמד',
      value: '312',
      description: '248 כלבים, 64 חתולים',
      icon: PawPrint,
      trend: '+12 החודש',
    },
    {
      title: 'ביקורים השבוע',
      value: '48',
      description: 'ממוצע 9.6 ליום',
      icon: FileText,
      trend: '+15% מהשבוע שעבר',
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">דשבורד</h1>
          <p className="text-muted-foreground mt-1">
            סקירה כללית של פעילות המרפאה
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.title} className="border-border/50 hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.description}
                </p>
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp className="h-3 w-3 text-success" />
                  <span className="text-xs text-success font-medium">
                    {stat.trend}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>תורים קרובים</CardTitle>
              <CardDescription>התורים הבאים ביומן</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                  <div className="text-right">
                    <p className="font-medium">מקס - כלב גולדן</p>
                    <p className="text-sm text-muted-foreground">בעלים: משפחת כהן</p>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium">10:00</p>
                    <p className="text-xs text-muted-foreground">חיסון שנתי</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                  <div className="text-right">
                    <p className="font-medium">מיטל - חתולה פרסית</p>
                    <p className="text-sm text-muted-foreground">בעלים: יעל לוי</p>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium">11:30</p>
                    <p className="text-xs text-muted-foreground">בדיקת מעקב</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                  <div className="text-right">
                    <p className="font-medium">צ'רלי - כלב לברדור</p>
                    <p className="text-sm text-muted-foreground">בעלים: דוד אברהם</p>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium">14:00</p>
                    <p className="text-xs text-muted-foreground">ביקור בית</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>תזכורות דחופות</CardTitle>
              <CardDescription>פעולות הדורשות תשומת לב</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 bg-warning/10 border border-warning/20 rounded-lg">
                  <div className="h-2 w-2 rounded-full bg-warning mt-2" />
                  <div className="flex-1 text-right">
                    <p className="font-medium">5 חיסונים שנתיים ממתינים</p>
                    <p className="text-sm text-muted-foreground">יש לשלוח תזכורות ללקוחות</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-success/10 border border-success/20 rounded-lg">
                  <div className="h-2 w-2 rounded-full bg-success mt-2" />
                  <div className="flex-1 text-right">
                    <p className="font-medium">3 בדיקות מעקב השבוע</p>
                    <p className="text-sm text-muted-foreground">יש לתאם עם הלקוחות</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                  <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                  <div className="flex-1 text-right">
                    <p className="font-medium">2 הודעות WhatsApp חדשות</p>
                    <p className="text-sm text-muted-foreground">מחכות לתשובה</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
