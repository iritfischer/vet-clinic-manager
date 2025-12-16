import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { PeakHourData, PeakDayData } from '@/types/analytics';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface PeakHoursChartProps {
  hoursData: PeakHourData[];
  daysData: PeakDayData[];
}

export const PeakHoursChart = ({ hoursData, daysData }: PeakHoursChartProps) => {
  const hasHoursData = hoursData.some((h) => h.count > 0);
  const hasDaysData = daysData.some((d) => d.count > 0);

  if (!hasHoursData && !hasDaysData) {
    return (
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">שעות וימים עמוסים</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            אין נתונים להצגה
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="text-lg">שעות וימים עמוסים</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="hours" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="hours">לפי שעות</TabsTrigger>
            <TabsTrigger value="days">לפי ימים</TabsTrigger>
          </TabsList>

          <TabsContent value="hours">
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hoursData} margin={{ bottom: 20 }}>
                  <XAxis
                    dataKey="hourLabel"
                    tick={{ fill: '#6b7280', fontSize: 10 }}
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: number) => [`${value} תורים`, 'כמות']}
                    labelFormatter={(label) => `שעה: ${label}`}
                    contentStyle={{ direction: 'rtl', borderRadius: '8px' }}
                  />
                  <Bar dataKey="count" fill="#f97316" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="days">
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={daysData}>
                  <XAxis dataKey="dayLabel" tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: number) => [`${value} תורים`, 'כמות']}
                    contentStyle={{ direction: 'rtl', borderRadius: '8px' }}
                  />
                  <Bar dataKey="count" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
