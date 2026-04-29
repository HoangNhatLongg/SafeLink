import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '../../lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: LucideIcon;
  iconColor?: string;
}

export function StatCard({ title, value, change, icon: Icon, iconColor = 'text-primary' }: StatCardProps) {
  const isPositive = change !== undefined && change >= 0;
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={cn('h-5 w-5', iconColor)} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change !== undefined && (
          <div className="flex items-center gap-1 mt-1">
            {isPositive ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
            <span className={cn(
              'text-xs',
              isPositive ? 'text-green-500' : 'text-red-500'
            )}>
              {isPositive ? '+' : ''}{change}%
            </span>
            <span className="text-xs text-muted-foreground ml-1">so với tuần trước</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
