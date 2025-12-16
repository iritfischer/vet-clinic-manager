import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { LeadSourceData } from '@/types/analytics';

interface LeadSourcesChartProps {
  data: LeadSourceData[];
}

const COLORS = ['#22c55e', '#3b82f6', '#8b5cf6', '#f97316', '#ef4444', '#eab308', '#64748b', '#ec4899'];

export const LeadSourcesChart = ({ data }: LeadSourcesChartProps) => {
  if (data.length === 0) {
    return (
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">מקורות הגעה</CardTitle>
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
        <CardTitle className="text-lg">מקורות הגעה</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
                nameKey="label"
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string) => [`${value} לידים`, name]}
                contentStyle={{ direction: 'rtl', borderRadius: '8px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        {/* Custom Legend */}
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-2">
          {data.map((item, index) => (
            <div key={item.source} className="flex items-center gap-1.5 text-sm">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="text-muted-foreground">{item.label} ({item.percentage}%)</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
