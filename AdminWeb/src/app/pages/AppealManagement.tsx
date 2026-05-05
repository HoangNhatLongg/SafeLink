import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { CheckCircle, XCircle, Clock, MessageSquare } from 'lucide-react';
import { formatDate } from '../lib/utils';
import { userApi, Appeal } from '../services/userApi';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';

export default function AppealManagement() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [selectedAppeal, setSelectedAppeal] = useState<Appeal | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [adminReply, setAdminReply] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['appeals', statusFilter],
    queryFn: () => userApi.getAppeals({ status: statusFilter }),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, action, reply }: { id: string; action: 'approved' | 'rejected'; reply: string }) =>
      userApi.reviewAppeal(id, action, reply),
    onSuccess: (data) => {
      toast.success(data.message || 'Đã xử lý khiếu nại');
      setIsReviewOpen(false);
      setSelectedAppeal(null);
      setAdminReply('');
      queryClient.invalidateQueries({ queryKey: ['appeals'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Lỗi khi xử lý khiếu nại');
    },
  });

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: any; label: string }> = {
      pending: { variant: 'outline', label: 'Chờ duyệt' },
      approved: { variant: 'success', label: 'Đã chấp nhận' },
      rejected: { variant: 'destructive', label: 'Đã từ chối' },
    };
    const c = config[status] || config.pending;
    return <Badge variant={c.variant}>{c.label}</Badge>;
  };

  const handleOpenReview = (appeal: Appeal) => {
    setSelectedAppeal(appeal);
    setAdminReply('');
    setIsReviewOpen(true);
  };

  const handleReview = (action: 'approved' | 'rejected') => {
    if (!selectedAppeal) return;
    reviewMutation.mutate({ id: selectedAppeal._id, action, reply: adminReply });
  };

  const appeals = data?.data || [];
  const pendingCount = appeals.filter((a: Appeal) => a.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Quản Lý Khiếu Nại</h1>
        <p className="text-muted-foreground mt-1">
          Xem xét và xử lý các yêu cầu khiếu nại từ người dùng bị khóa tài khoản
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {[
          { value: 'pending', label: 'Chờ duyệt', icon: <Clock className="h-4 w-4 mr-1" /> },
          { value: 'approved', label: 'Đã chấp nhận', icon: <CheckCircle className="h-4 w-4 mr-1" /> },
          { value: 'rejected', label: 'Đã từ chối', icon: <XCircle className="h-4 w-4 mr-1" /> },
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

      {/* Appeals Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Người khiếu nại</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Nội dung khiếu nại</TableHead>
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
            ) : appeals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Không có khiếu nại nào
                </TableCell>
              </TableRow>
            ) : (
              appeals.map((appeal: Appeal) => (
                <TableRow key={appeal._id}>
                  <TableCell className="font-medium">
                    {appeal.userId?.name || 'N/A'}
                  </TableCell>
                  <TableCell>{appeal.userId?.email || 'N/A'}</TableCell>
                  <TableCell className="max-w-[250px] truncate">{appeal.reason}</TableCell>
                  <TableCell>{formatDate(appeal.createdAt)}</TableCell>
                  <TableCell>{getStatusBadge(appeal.status)}</TableCell>
                  <TableCell className="text-right">
                    {appeal.status === 'pending' ? (
                      <Button size="sm" variant="outline" onClick={() => handleOpenReview(appeal)}>
                        Xem xét
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {appeal.reviewedBy?.name && `Bởi: ${appeal.reviewedBy.name}`}
                      </span>
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Xem xét Khiếu nại</DialogTitle>
            <DialogDescription>
              Khiếu nại từ <span className="font-bold text-foreground">{selectedAppeal?.userId?.name}</span>
              {' '}({selectedAppeal?.userId?.email})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">Nội dung khiếu nại:</label>
              <div className="rounded-md border p-3 bg-muted/50 text-sm whitespace-pre-wrap">
                {selectedAppeal?.reason}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Phản hồi của Admin (tùy chọn):</label>
              <Textarea
                placeholder="Nhập phản hồi cho người dùng..."
                value={adminReply}
                onChange={(e) => setAdminReply(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsReviewOpen(false)}>
              Đóng
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleReview('rejected')}
              disabled={reviewMutation.isPending}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Từ chối
            </Button>
            <Button
              variant="default"
              onClick={() => handleReview('approved')}
              disabled={reviewMutation.isPending}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Chấp nhận & Mở khóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
