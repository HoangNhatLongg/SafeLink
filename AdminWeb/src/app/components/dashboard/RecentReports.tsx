import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { formatDateTime } from '../../lib/utils';
import { Eye } from 'lucide-react';

interface ReportItem {
  id: string;
  postContent: string;
  reportCount: number;
  reportedAt: string;
  reason: string;
}

interface RecentReportsProps {
  reports: ReportItem[];
}

export function RecentReports({ reports }: RecentReportsProps) {
  const getReasonBadgeVariant = (reason: string) => {
    switch (reason) {
      case 'spam':
        return 'warning';
      case 'harassment':
      case 'violence':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getReasonText = (reason: string) => {
    const reasonMap: Record<string, string> = {
      spam: 'Spam',
      harassment: 'Quấy rối',
      violence: 'Bạo lực',
      inappropriate: 'Không phù hợp',
      other: 'Khác',
    };
    return reasonMap[reason] || reason;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Báo Cáo Vi Phạm Gần Đây</CardTitle>
        <CardDescription>5 báo cáo cần xử lý khẩn cấp</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {reports.map((report) => (
            <div
              key={report.id}
              className="flex items-start justify-between gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="flex-1 space-y-2">
                <p className="text-sm line-clamp-2">{report.postContent}</p>
                <div className="flex items-center gap-2">
                  <Badge variant={getReasonBadgeVariant(report.reason)}>
                    {getReasonText(report.reason)}
                  </Badge>
                  <Badge variant="outline">{report.reportCount} báo cáo</Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(report.reportedAt)}
                  </span>
                </div>
              </div>
              <Button size="sm" variant="outline">
                <Eye className="h-4 w-4 mr-1" />
                Xem
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
