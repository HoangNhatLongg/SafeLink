import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { volunteerApi } from '../services/volunteerApi';
import { Volunteer, VolunteerStatus, VolunteerServiceType, VolunteerType } from '../types';
import { formatDateTime } from '../lib/utils';
import { toast } from 'sonner';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { MapPin, Phone, Mail, CheckCircle, XCircle, Search, DollarSign, Heart, AlertCircle, Info, Image as ImageIcon } from 'lucide-react';

const UNIT_TYPE_LABELS: Record<VolunteerType, string> = {
  csgt: "CSGT",
  pccc: "PCCC",
  canh_sat: "Công An",
  benh_vien: "Bệnh Viện",
  cuu_thuong: "Cấp Cứu",
  sua_xe_cap_cuu: "Sửa Xe",
  ho_tro_sos: "Hỗ Trợ SOS",
  khac: "Khác",
  // Map old/different enum values just in case
  sua_xe: "Sửa Xe",
  doi_sos: "Đội SOS",
  ho_tro_lu: "Hỗ Trợ Lũ",
  cuu_nan: "Cứu Nạn",
  y_te_tn: "Y Tế",
  van_chuyen: "Vận Chuyển",
  on_dinh: "Ổn Định CS",
};

export default function VolunteerModeration() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<VolunteerStatus | 'all'>('pending');
  const [search, setSearch] = useState('');
  const [selectedVolunteer, setSelectedVolunteer] = useState<Volunteer | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showImageDialog, setShowImageDialog] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['volunteers', activeTab, search],
    queryFn: () => volunteerApi.getAll({ status: activeTab, search }),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, action, reason }: { id: string, action: 'approve' | 'reject', reason?: string }) => 
      volunteerApi.review(id, action, reason),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['volunteers'] });
      toast.success(res.message || 'Cập nhật thành công');
      setShowRejectDialog(false);
      setSelectedVolunteer(null);
      setRejectionReason('');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Lỗi khi xử lý yêu cầu');
    }
  });

  const handleApprove = (id: string) => {
    reviewMutation.mutate({ id, action: 'approve' });
  };

  const handleReject = () => {
    if (!selectedVolunteer || !rejectionReason.trim()) return;
    reviewMutation.mutate({ 
      id: selectedVolunteer._id, 
      action: 'reject', 
      reason: rejectionReason 
    });
  };

  const openRejectDialog = (volunteer: Volunteer) => {
    setSelectedVolunteer(volunteer);
    setShowRejectDialog(true);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Duyệt Đội Cứu Hộ / Tình Nguyện Viên</h1>
        <p className="text-muted-foreground mt-1">
          Quản lý và xét duyệt các đơn đăng ký trở thành đội cứu hộ từ cộng đồng.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as VolunteerStatus | 'all')} className="w-full sm:w-auto">
          <TabsList>
            <TabsTrigger value="pending">Chờ duyệt</TabsTrigger>
            <TabsTrigger value="active">Đang hoạt động</TabsTrigger>
            <TabsTrigger value="rejected">Đã từ chối</TabsTrigger>
            <TabsTrigger value="all">Tất cả</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Tìm theo tên, địa chỉ, số điện thoại..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Loading & Error States */}
      {isLoading && (
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}

      {isError && (
        <div className="text-center p-12 text-destructive border rounded-lg bg-destructive/10">
          <AlertCircle className="mx-auto h-8 w-8 mb-2" />
          <p>Lỗi khi tải dữ liệu. Bạn có đủ quyền không?</p>
        </div>
      )}

      {/* Grid */}
      {!isLoading && !isError && data?.items?.length === 0 && (
        <div className="text-center py-16 border rounded-lg bg-muted/20">
          <Info className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
          <h3 className="text-lg font-medium">Không có dữ liệu</h3>
          <p className="text-muted-foreground">Chưa có đơn đăng ký nào ở trạng thái này.</p>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {data?.items?.map((volunteer: Volunteer) => (
          <Card key={volunteer._id} className="overflow-hidden flex flex-col">
            <CardHeader className="pb-3 border-b bg-muted/10">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg leading-tight">{volunteer.unitName}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                    <Badge variant="outline" className="font-normal text-xs">{UNIT_TYPE_LABELS[volunteer.unitType] || volunteer.unitType}</Badge>
                    <Badge variant="outline" className="font-normal text-xs">{volunteer.entityKind === 'group' ? 'Tổ chức/Nhóm' : 'Cá nhân'}</Badge>
                  </p>
                </div>
                {/* Service Type Badge */}
                <Badge variant={volunteer.serviceType === 'free' ? 'default' : 'secondary'} className={volunteer.serviceType === 'free' ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20' : ''}>
                  {volunteer.serviceType === 'free' ? (
                    <><Heart className="h-3 w-3 mr-1" /> Miễn phí</>
                  ) : volunteer.serviceType === 'paid' ? (
                    <><DollarSign className="h-3 w-3 mr-1" /> Có phí</>
                  ) : (
                    <><Info className="h-3 w-3 mr-1" /> Thỏa thuận</>
                  )}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 pt-4 flex-1">
              {/* Contact Info */}
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <span className="font-medium shrink-0 w-20">Người LH:</span>
                  <span className="text-foreground">{volunteer.contactName}</span>
                </div>
                <div className="flex items-start gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">{volunteer.phone}</span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">{volunteer.address}, {volunteer.province}</span>
                </div>
              </div>

              {/* Service Details */}
              <div className="text-sm bg-muted/40 p-3 rounded-lg space-y-1.5 border">
                {volunteer.description && <p><strong>Mô tả:</strong> {volunteer.description}</p>}
                {volunteer.serviceArea && <p><strong>Khu vực:</strong> {volunteer.serviceArea}</p>}
                {volunteer.availableTime && <p><strong>T/g H.động:</strong> {volunteer.availableTime}</p>}
                {volunteer.priceNote && <p><strong>Giá/Phí:</strong> {volunteer.priceNote}</p>}
                {volunteer.note && <p><strong>Ghi chú:</strong> {volunteer.note}</p>}
              </div>

              {/* Verification Images */}
              {volunteer.verificationImages && volunteer.verificationImages.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2 flex items-center gap-1.5">
                    <ImageIcon className="h-4 w-4" /> Ảnh chứng thực ({volunteer.verificationImages.length})
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {volunteer.verificationImages.map((img, idx) => (
                      <div 
                        key={idx} 
                        className="relative aspect-square cursor-pointer overflow-hidden rounded-md border hover:opacity-80 transition-opacity"
                        onClick={() => setShowImageDialog(img.url)}
                      >
                        <img src={img.url} alt={`Chứng thực ${idx+1}`} className="object-cover w-full h-full" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Status Info */}
              <div className="text-xs text-muted-foreground pt-2 border-t flex flex-col gap-1">
                <div>Gửi bởi: {volunteer.submittedBy?.name || 'Vô danh'} ({volunteer.submittedBy?.email})</div>
                <div>Gửi lúc: {formatDateTime(volunteer.createdAt)}</div>
                {volunteer.status === 'rejected' && volunteer.rejectReason && (
                  <div className="text-destructive mt-1 bg-destructive/10 p-2 rounded">
                    <strong>Lý do từ chối:</strong> {volunteer.rejectReason}
                  </div>
                )}
              </div>
            </CardContent>

            <CardFooter className="flex gap-2 pt-4 border-t bg-muted/5">
              {volunteer.status === 'pending' ? (
                <>
                  <Button
                    variant="default"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => handleApprove(volunteer._id)}
                    disabled={reviewMutation.isPending}
                  >
                    <CheckCircle className="h-4 w-4 mr-1.5" />
                    Duyệt
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => openRejectDialog(volunteer)}
                    disabled={reviewMutation.isPending}
                  >
                    <XCircle className="h-4 w-4 mr-1.5" />
                    Từ chối
                  </Button>
                </>
              ) : (
                <div className="flex-1 flex justify-center items-center py-1">
                  <Badge variant={volunteer.status === 'active' ? 'default' : 'destructive'} className={volunteer.status === 'active' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : ''}>
                    {volunteer.status === 'active' ? 'Đã duyệt (Đang hoạt động)' : 'Đã từ chối'}
                  </Badge>
                </div>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Từ chối đơn đăng ký</DialogTitle>
            <DialogDescription>
              Đơn vị: <strong className="text-foreground">{selectedVolunteer?.unitName}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm">Vui lòng cung cấp lý do từ chối để thông báo cho người đăng ký:</p>
            <Input
              placeholder="Nhập lý do từ chối..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>Hủy</Button>
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={!rejectionReason.trim() || reviewMutation.isPending}
            >
              {reviewMutation.isPending ? 'Đang xử lý...' : 'Xác nhận từ chối'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Full Image Dialog */}
      <Dialog open={!!showImageDialog} onOpenChange={() => setShowImageDialog(null)}>
        <DialogContent className="max-w-4xl p-1 bg-black/90 border-none shadow-none">
          {showImageDialog && (
            <div className="relative w-full h-[80vh] flex items-center justify-center">
              <img 
                src={showImageDialog} 
                alt="Ảnh phóng to" 
                className="max-w-full max-h-full object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
