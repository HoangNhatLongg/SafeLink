import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartData } from '../../types';

interface ActivityChartProps {
  data: ChartData[];
}

export function ActivityChart({ data }: ActivityChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Hoạt Động Hệ Thống</CardTitle>
        <CardDescription>Số tài khoản mới và bài viết trong 30 ngày qua</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="visits"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              name="Tài khoản mới"
            />
            <Line
              type="monotone"
              dataKey="posts"
              stroke="hsl(var(--chart-2))"
              strokeWidth={2}
              name="Bài viết"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
