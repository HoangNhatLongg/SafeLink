import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { directoryApi, DirectoryQueryParams } from '../services/directoryApi';
import { DirectoryEntry, DirectoryStatus, DirectoryCategory } from '../types';

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '../components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import { Plus, Search, MapPin, Phone, MoreHorizontal, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { provinceApi, Province } from '../services/provinceApi';

export default function DirectoryModeration() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<DirectoryStatus | 'all'>('pending');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [search, setSearch] = useState('');
  
  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [currentEntry, setCurrentEntry] = useState<Partial<DirectoryEntry>>({});
  
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);

  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [entryToReject, setEntryToReject] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Queries
  const { data, isLoading, isError } = useQuery({
    queryKey: ['directories', activeTab, search],
    queryFn: () => directoryApi.getAll({ status: activeTab, search }),
  });

  const { data: provincesData = [] } = useQuery({
    queryKey: ['provinces'],
    queryFn: () => provinceApi.getAll(),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: Partial<DirectoryEntry>) => directoryApi.create(data),
    onSuccess: () => {
      toast.success('Thêm danh bạ thành công');
      setIsFormOpen(false);
      queryClient.invalidateQueries({ queryKey: ['directories'] });
    },
    onError: (error: any) => toast.error(error.message || 'Lỗi khi thêm danh bạ'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<DirectoryEntry> }) => directoryApi.update(id, data),
    onSuccess: () => {
      toast.success('Cập nhật danh bạ thành công');
      setIsFormOpen(false);
      queryClient.invalidateQueries({ queryKey: ['directories'] });
    },
    onError: (error: any) => toast.error(error.message || 'Lỗi khi cập nhật danh bạ'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => directoryApi.delete(id),
    onSuccess: () => {
      toast.success('Đã xóa danh bạ');
      setIsDeleteOpen(false);
      queryClient.invalidateQueries({ queryKey: ['directories'] });
    },
    onError: (error: any) => toast.error(error.message || 'Lỗi khi xóa danh bạ'),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, action, reason }: { id: string; action: 'approve' | 'reject'; reason?: string }) => 
      directoryApi.review(id, action, reason),
    onSuccess: (_, variables) => {
      toast.success(variables.action === 'approve' ? 'Đã duyệt danh bạ' : 'Đã từ chối danh bạ');
      setIsRejectOpen(false);
      setRejectReason('');
      queryClient.invalidateQueries({ queryKey: ['directories'] });
    },
    onError: (error: any) => toast.error(error.message || 'Lỗi khi xử lý'),
  });

  const handleStatusChange = (id: string, newStatus: DirectoryStatus) => {
    updateMutation.mutate({ id, data: { status: newStatus } });
  };

  const handleOpenForm = (mode: 'add' | 'edit', entry?: DirectoryEntry) => {
    setFormMode(mode);
    if (mode === 'edit' && entry) {
      setCurrentEntry(entry);
    } else {
      setCurrentEntry({ type: 'khac', status: 'active' });
    }
    setIsFormOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Parse and validate GPS coordinates
    // Replace comma with dot to support Vietnamese locales
    const parsedLat = parseFloat(String(currentEntry.lat).replace(',', '.'));
    const parsedLng = parseFloat(String(currentEntry.lng).replace(',', '.'));

    if (isNaN(parsedLat) || parsedLat < -90 || parsedLat > 90) {
      toast.error('Vĩ độ (Latitude) không hợp lệ. Phải nằm trong khoảng -90 đến 90.');
      return;
    }
    if (isNaN(parsedLng) || parsedLng < -180 || parsedLng > 180) {
      toast.error('Kinh độ (Longitude) không hợp lệ. Phải nằm trong khoảng -180 đến 180.');
      return;
    }

    const submitData = {
      ...currentEntry,
      lat: parsedLat,
      lng: parsedLng,
    };

    if (formMode === 'add') {
      createMutation.mutate(submitData);
    } else if (currentEntry._id) {
      updateMutation.mutate({ id: currentEntry._id, data: submitData });
    }
  };

  const getTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      csgt: 'CSGT', pccc: 'PCCC', canh_sat: 'Cảnh sát', benh_vien: 'Bệnh viện', 
      cuu_thuong: 'Cứu thương', sua_xe_cap_cuu: 'Sửa xe', ho_tro_sos: 'Hỗ Trợ SOS', khac: 'Khác'
    };
    return map[type] || 'Khác';
  };

  const DIRECTORY_TYPES = [
    { key: 'all', label: 'Tất cả loại' },
    { key: 'csgt', label: 'CSGT' },
    { key: 'pccc', label: 'PCCC' },
    { key: 'canh_sat', label: 'Cảnh sát' },
    { key: 'benh_vien', label: 'Bệnh viện' },
    { key: 'cuu_thuong', label: 'Cứu thương' },
    { key: 'sua_xe_cap_cuu', label: 'Sửa xe' },
    { key: 'ho_tro_sos', label: 'Hỗ Trợ SOS' },
    { key: 'khac', label: 'Khác' },
  ];

  // Client-side filter theo type
  const filteredItems = data?.items?.filter((item: DirectoryEntry) => 
    selectedType === 'all' || item.type === selectedType
  ) || [];

  const selectedProvinceData = provincesData.find((p: Province) => p.name === currentEntry.province);
  const wards = selectedProvinceData ? selectedProvinceData.wards : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quản Lý Danh Bạ Khẩn Cấp</h1>
          <p className="text-muted-foreground mt-1">
            Thêm, sửa, xóa và xét duyệt các thông tin đồn cảnh sát, bệnh viện, PCCC.
          </p>
        </div>
        <Button onClick={() => handleOpenForm('add')} className="shrink-0 gap-2">
          <Plus className="w-4 h-4" />
          Thêm Danh Bạ
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full sm:w-auto">
          <TabsList>
            <TabsTrigger value="pending">Chờ duyệt</TabsTrigger>
            <TabsTrigger value="active">Đang hoạt động</TabsTrigger>
            <TabsTrigger value="rejected">Đã từ chối</TabsTrigger>
            <TabsTrigger value="all">Tất cả</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm tên, SĐT, địa chỉ..."
            className="pl-8 bg-background"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Type filter chips */}
      <div className="flex flex-wrap gap-2">
        {DIRECTORY_TYPES.map(t => (
          <button
            key={t.key}
            onClick={() => setSelectedType(t.key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
              selectedType === t.key
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background text-muted-foreground border-border hover:bg-muted'
            }`}
          >
            {t.label}
            {selectedType !== t.key && data?.items && (
              <span className="ml-1 opacity-60">
                ({data.items.filter((i: DirectoryEntry) => t.key === 'all' ? true : i.type === t.key).length})
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Tên Cơ Sở</TableHead>
              <TableHead>Phân Loại</TableHead>
              <TableHead>Liên Hệ</TableHead>
              <TableHead>Ngày Đăng</TableHead>
              <TableHead>Trạng Thái</TableHead>
              <TableHead className="w-[80px] text-right">Thao Tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">Đang tải dữ liệu...</TableCell>
              </TableRow>
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-destructive">Lỗi khi tải dữ liệu. Bạn có đủ quyền không?</TableCell>
              </TableRow>
            ) : (filteredItems.length === 0) ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">Không có dữ liệu</TableCell>
              </TableRow>
            ) : (
              filteredItems.map((item: DirectoryEntry) => (
                <TableRow key={item._id}>
                  <TableCell>
                    <div className="font-medium text-foreground">{item.name}</div>
                    <div className="flex items-center text-xs text-muted-foreground mt-1 max-w-[250px] truncate">
                      <MapPin className="w-3 h-3 mr-1 shrink-0" />
                      <span className="truncate" title={item.address}>{item.address}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-normal">
                      {getTypeLabel(item.type)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center text-sm">
                      <Phone className="w-3 h-3 mr-1.5 text-muted-foreground" />
                      {item.phone}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {format(new Date(item.createdAt), 'dd/MM/yyyy HH:mm')}
                    </div>
                    {item.submittedBy && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Bởi: {item.submittedBy.name}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger className="focus:outline-none">
                        <Badge variant={item.status === 'active' ? 'default' : item.status === 'pending' ? 'secondary' : 'destructive'}
                               className={`cursor-pointer ${item.status === 'active' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20' : ''}`}>
                          {item.status === 'active' ? 'Hoạt động' : item.status === 'pending' ? 'Chờ duyệt' : 'Đã ẩn (Từ chối)'}
                        </Badge>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem onClick={() => handleStatusChange(item._id, 'active')}>
                          <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></span>
                          Hoạt động (Hiển thị)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange(item._id, 'pending')}>
                          <span className="w-2 h-2 rounded-full bg-slate-500 mr-2"></span>
                          Chờ duyệt
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange(item._id, 'rejected')}>
                          <span className="w-2 h-2 rounded-full bg-red-500 mr-2"></span>
                          Ẩn đi (Từ chối)
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuLabel>Hành động</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {item.status === 'pending' && (
                          <>
                            <DropdownMenuItem className="text-emerald-600 focus:text-emerald-600 focus:bg-emerald-50" onClick={() => reviewMutation.mutate({ id: item._id, action: 'approve' })}>
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Duyệt hiển thị
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10" onClick={() => { setEntryToReject(item._id); setIsRejectOpen(true); }}>
                              <XCircle className="mr-2 h-4 w-4" />
                              Từ chối
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </>
                        )}
                        <DropdownMenuItem onClick={() => handleOpenForm('edit', item)}>
                          <Edit className="mr-2 h-4 w-4 text-muted-foreground" />
                          Chỉnh sửa
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10" onClick={() => { setEntryToDelete(item._id); setIsDeleteOpen(true); }}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Xóa danh bạ
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Form Modal (Add/Edit) */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{formMode === 'add' ? 'Thêm Danh Bạ Mới' : 'Chỉnh Sửa Danh Bạ'}</DialogTitle>
            <DialogDescription>
              Nhập thông tin cơ sở cứu hộ, y tế, an ninh. Các trường có dấu (*) là bắt buộc.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleFormSubmit} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>Tên Cơ Sở *</Label>
                <Input required value={currentEntry.name || ''} onChange={e => setCurrentEntry({...currentEntry, name: e.target.value})} placeholder="VD: Bệnh viện Đa khoa Tỉnh..." />
              </div>
              <div className="space-y-2">
                <Label>Số Điện Thoại *</Label>
                <Input required value={currentEntry.phone || ''} onChange={e => setCurrentEntry({...currentEntry, phone: e.target.value})} placeholder="0123456789" />
              </div>
              <div className="space-y-2">
                <Label>Phân Loại *</Label>
                <Select value={currentEntry.type || 'khac'} onValueChange={v => setCurrentEntry({...currentEntry, type: v as any})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn phân loại" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csgt">CSGT</SelectItem>
                    <SelectItem value="pccc">PCCC</SelectItem>
                    <SelectItem value="canh_sat">Cảnh sát</SelectItem>
                    <SelectItem value="benh_vien">Bệnh viện</SelectItem>
                    <SelectItem value="cuu_thuong">Cứu thương</SelectItem>
                    <SelectItem value="khac">Khác</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2 col-span-2">
                <Label>Địa chỉ chi tiết *</Label>
                <Input required value={currentEntry.address || ''} onChange={e => setCurrentEntry({...currentEntry, address: e.target.value})} placeholder="123 Đường ABC..." />
              </div>

              <div className="space-y-2">
                <Label>Tỉnh / Thành phố *</Label>
                <Select 
                  value={currentEntry.province || ''} 
                  onValueChange={v => {
                    setCurrentEntry({...currentEntry, province: v, ward: '', district: ''});
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn Tỉnh / Thành phố" />
                  </SelectTrigger>
                  <SelectContent>
                    {provincesData.map((p: any) => (
                      <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Phường / Xã</Label>
                <Select 
                  value={currentEntry.ward || ''} 
                  onValueChange={v => setCurrentEntry({...currentEntry, ward: v})}
                  disabled={!currentEntry.province}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={currentEntry.province ? "Chọn Phường / Xã" : "Chọn Tỉnh trước"} />
                  </SelectTrigger>
                  <SelectContent>
                    {wards.map((w: string) => (
                      <SelectItem key={w} value={w}>{w}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Vĩ Độ (Latitude) *</Label>
                <Input required type="text" value={currentEntry.lat ?? ''} onChange={e => setCurrentEntry({...currentEntry, lat: e.target.value as any})} placeholder="21.028511" />
              </div>
              <div className="space-y-2">
                <Label>Kinh Độ (Longitude) *</Label>
                <Input required type="text" value={currentEntry.lng ?? ''} onChange={e => setCurrentEntry({...currentEntry, lng: e.target.value as any})} placeholder="105.804817" />
              </div>
              
              <div className="space-y-2 col-span-2">
                <Label>Trạng thái</Label>
                <Select value={currentEntry.status || 'active'} onValueChange={v => setCurrentEntry({...currentEntry, status: v as any})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn trạng thái" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Hoạt động (Hiển thị ngay)</SelectItem>
                    <SelectItem value="pending">Chờ duyệt (Ẩn)</SelectItem>
                    <SelectItem value="rejected">Từ chối (Ẩn)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 col-span-2">
                <Label>Ghi chú thêm</Label>
                <Textarea value={currentEntry.note || ''} onChange={e => setCurrentEntry({...currentEntry, note: e.target.value})} placeholder="Thời gian hoạt động, lưu ý..." />
              </div>
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Hủy</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {formMode === 'add' ? 'Thêm Mới' : 'Lưu Thay Đổi'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa danh bạ này?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này không thể hoàn tác. Dữ liệu sẽ bị xóa vĩnh viễn khỏi hệ thống.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => entryToDelete && deleteMutation.mutate(entryToDelete)}>
              Xóa Vĩnh Viễn
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Modal */}
      <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Từ chối đóng góp</DialogTitle>
            <DialogDescription>
              Bạn có thể nhập lý do từ chối để người dùng biết tại sao.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Lý do từ chối</Label>
              <Textarea 
                value={rejectReason} 
                onChange={(e) => setRejectReason(e.target.value)} 
                placeholder="Thông tin không chính xác, cơ sở không tồn tại..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectOpen(false)}>Hủy</Button>
            <Button variant="destructive" onClick={() => entryToReject && reviewMutation.mutate({ id: entryToReject, action: 'reject', reason: rejectReason })}>
              Xác Nhận Từ Chối
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
