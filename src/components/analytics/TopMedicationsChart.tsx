import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { MedicationData } from '@/types/analytics';

interface TopMedicationsChartProps {
  data: MedicationData[];
}

export const TopMedicationsChart = ({ data }: TopMedicationsChartProps) => {
  if (data.length === 0) {
    return (
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">תרופות נפוצות</CardTitle>
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
        <CardTitle className="text-lg">תרופות נפוצות</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
              <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 12 }} />
              <YAxis
                type="category"
                dataKey="medication"
                width={160}
                tick={{ fill: '#6b7280', fontSize: 11 }}
                tickFormatter={(value) => value.length > 18 ? `${value.slice(0, 18)}...` : value}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(value: number) => [`${value}`, 'כמות']}
                contentStyle={{ direction: 'rtl', borderRadius: '8px' }}
              />
              <Bar
                dataKey="count"
                fill="#3b82f6"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
