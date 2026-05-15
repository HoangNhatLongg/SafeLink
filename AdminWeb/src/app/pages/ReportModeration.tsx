import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { CheckCircle, XCircle, Clock, MessageSquare, AlertTriangle } from 'lucide-react';
import { formatDate } from '../lib/utils';
import { reportApi, Report } from '../services/reportApi';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
const REASON_MAP: Record<string, string> = {
  spam: "Spam",
  inappropriate: "Nội dung không phù hợp",
  misinformation: "Thông tin sai",
  harassment: "Quấy rối",
  violence: "Bạo lực",
  copyright: "Bản quyền",
  other: "Khác",
};

export default function ReportModeration() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['reports', statusFilter],
    queryFn: () => reportApi.getReports({ status: statusFilter === 'all' ? undefined : statusFilter }),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, status, flagPost, restorePost }: { id: string; status: 'pending' | 'reviewed' | 'dismissed' | 'actioned'; flagPost: boolean; restorePost?: boolean }) =>
      reportApi.updateReport(id, status, flagPost, restorePost),
    onSuccess: (data) => {
      toast.success(data.message || 'Đã xử lý báo cáo');
      setIsReviewOpen(false);
      setSelectedReport(null);
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Lỗi khi xử lý báo cáo');
    },
  });

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: any; label: string }> = {
      pending: { variant: 'outline', label: 'Chờ duyệt' },
      reviewed: { variant: 'secondary', label: 'Đã xem xét' },
      dismissed: { variant: 'success', label: 'Đã bỏ qua' },
      actioned: { variant: 'destructive', label: 'Đã xử lý (Gỡ bài)' },
    };
    const c = config[status] || config.pending;
    return <Badge variant={c.variant}>{c.label}</Badge>;
  };

  const handleOpenReview = (report: Report) => {
    setSelectedReport(report);
    setIsReviewOpen(true);
  };

  const handleReview = (status: 'pending' | 'dismissed' | 'actioned', flagPost: boolean, restorePost: boolean = false) => {
    if (!selectedReport) return;
    reviewMutation.mutate({ id: selectedReport._id, status, flagPost, restorePost });
  };

  const reports = data?.reports || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Báo Cáo Vi Phạm</h1>
        <p className="text-muted-foreground mt-1">
          Kiểm duyệt các bài đăng bị báo cáo vi phạm
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {[
          { value: 'pending', label: 'Chờ duyệt', icon: <Clock className="h-4 w-4 mr-1" /> },
          { value: 'dismissed', label: 'Đã bỏ qua', icon: <CheckCircle className="h-4 w-4 mr-1" /> },
          { value: 'actioned', label: 'Đã xử lý', icon: <AlertTriangle className="h-4 w-4 mr-1" /> },
          { value: 'all', label: 'Tất cả', icon: <MessageSquare className="h-4 w-4 mr-1" /> },
        ].map((tab) => (
          <Button
            key={tab.value}
            variant={statusFilter === tab.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter(tab.value)}
          >
            {tab.icon}
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Reports Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Người báo cáo</TableHead>
              <TableHead>Người đăng bài</TableHead>
              <TableHead>Lý do</TableHead>
              <TableHead>Ngày gửi</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">Đang tải dữ liệu...</TableCell>
              </TableRow>
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-destructive">Đã có lỗi xảy ra</TableCell>
              </TableRow>
            ) : reports.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Không có báo cáo nào
                </TableCell>
              </TableRow>
            ) : (
              reports.map((report: Report) => (
                <TableRow key={report._id}>
                  <TableCell className="font-medium">
                    {report.reporter?.name || 'N/A'}
                    <div className="text-xs text-muted-foreground">{report.reporter?.email}</div>
                  </TableCell>
                  <TableCell>
                    {report.post?.author?.name || 'Không xác định'}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{REASON_MAP[report.reason] || report.reason}</div>
                    {report.description && <div className="text-xs text-muted-foreground truncate max-w-[150px]">{report.description}</div>}
                  </TableCell>
                  <TableCell>{formatDate(report.createdAt)}</TableCell>
                  <TableCell>{getStatusBadge(report.status)}</TableCell>
                  <TableCell className="text-right">
                    {report.status === 'pending' ? (
                      <Button size="sm" variant="outline" onClick={() => handleOpenReview(report)}>
                        Xem xét
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => handleOpenReview(report)}>
                        Xem lại
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Review Dialog */}
      <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Chi tiết báo cáo vi phạm</DialogTitle>
            <DialogDescription>
              Báo cáo từ <span className="font-bold text-foreground">{selectedReport?.reporter?.name}</span> về lý do: <span className="font-bold text-foreground">{selectedReport ? (REASON_MAP[selectedReport.reason] || selectedReport.reason) : ''}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {selectedReport?.description && (
              <div className="space-y-1">
                <label className="text-sm font-medium">Chi tiết báo cáo:</label>
                <div className="rounded-md border p-3 bg-muted/50 text-sm whitespace-pre-wrap">
                  {selectedReport.description}
                </div>
              </div>
            )}
            
            <div className="space-y-2 mt-4 pt-4 border-t">
              <label className="text-sm font-bold flex items-center gap-2">
                Nội dung bài viết bị báo cáo
                {selectedReport?.post?.status === 'flagged' && (
                  <Badge variant="destructive" className="text-[10px]">Đã gỡ</Badge>
                )}
              </label>
              
              <div className="rounded-md border p-4 bg-muted/30">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-8 w-8 rounded-full bg-slate-200 overflow-hidden">
                    {selectedReport?.post?.author?.avatar ? (
                      <img src={selectedReport.post.author.avatar} alt="avatar" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-slate-500 font-bold">
                        {selectedReport?.post?.author?.name?.charAt(0) || '?'}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-bold">{selectedReport?.post?.author?.name || 'Tác giả ẩn danh'}</div>
                    <div className="text-xs text-muted-foreground">{selectedReport?.post?.author?.email || 'N/A'}</div>
                  </div>
                </div>
                
                {selectedReport?.post?.content ? (
                  <div className="text-sm whitespace-pre-wrap mb-3">{selectedReport.post.content}</div>
                ) : (
                  <div className="text-sm text-muted-foreground italic mb-3">Bài viết không có nội dung văn bản.</div>
                )}
                
                {/* Hiển thị ảnh nếu có */}
                {selectedReport?.post?.images && selectedReport.post.images.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {selectedReport.post.images.map((img, idx) => (
                      <img key={idx} src={img.url} alt="Post media" className="h-24 w-24 object-cover rounded-md border" />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsReviewOpen(false)}>
              Đóng
            </Button>
            {selectedReport?.status === 'pending' && (
              <>
                <Button
                  variant="default"
                  onClick={() => handleReview('dismissed', false)}
                  disabled={reviewMutation.isPending}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Bỏ qua (Không vi phạm)
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleReview('actioned', true)}
                  disabled={reviewMutation.isPending}
                >
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  Gỡ bài (Vi phạm)
                </Button>
              </>
            )}
            {selectedReport?.status !== 'pending' && selectedReport?.post?.status === 'flagged' && (
              <Button
                variant="default"
                onClick={() => handleReview('dismissed', false, true)}
                disabled={reviewMutation.isPending}
              >
                Khôi phục bài viết
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
