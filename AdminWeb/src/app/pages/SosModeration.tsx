import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { sosApi } from '../services/sosApi';
import { SOSPost, SOSStatus } from '../types';

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '../components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { Search, MapPin, MoreHorizontal, CheckCircle, Trash2, Phone, User, Eye, AlertTriangle, Users, Clock } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';

export default function SosModeration() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<SOSStatus | 'all'>('active');
  const [search, setSearch] = useState('');
  
  const [selectedSos, setSelectedSos] = useState<SOSPost | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Queries
  const { data, isLoading, isError } = useQuery({
    queryKey: ['sos', activeTab, search],
    queryFn: () => sosApi.getAll({ status: activeTab, search }),
    refetchInterval: activeTab === 'active' ? 10000 : false, // Auto refresh every 10s if on active tab
  });

  // Mutations
  const resolveMutation = useMutation({
    mutationFn: (id: string) => sosApi.resolve(id),
    onSuccess: () => {
      toast.success('Đã đánh dấu giải quyết SOS');
      queryClient.invalidateQueries({ queryKey: ['sos'] });
    },
    onError: (error: any) => toast.error(error.message || 'Lỗi khi xử lý SOS'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => sosApi.delete(id),
    onSuccess: () => {
      toast.success('Đã xóa SOS thành công');
      setIsDeleteOpen(false);
      setSelectedSos(null);
      queryClient.invalidateQueries({ queryKey: ['sos'] });
    },
    onError: (error: any) => toast.error(error.message || 'Lỗi khi xóa SOS'),
  });

  const handleOpenGoogleMaps = (lat?: number, lng?: number) => {
    if (!lat || !lng) return;
    window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank');
  };

  const openDetail = (sos: SOSPost) => {
    setSelectedSos(sos);
    setIsDetailOpen(true);
  };

  const getCategoryLabel = (cat: string) => {
    const map: Record<string, string> = {
      fire: 'Cháy nổ', landslide: 'Sạt lở', traffic: 'Tai nạn',
      robbery: 'Trộm cướp', medical: 'Y tế', flood: 'Lụt lội',
      sos_support: 'Đội SOS', vehicle_repair: 'Sửa xe', other: 'Khác',
    };
    return map[cat] || 'Khác';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-red-600 flex items-center gap-2">
            <AlertTriangle className="w-8 h-8" /> Quản Lý SOS
          </h1>
          <p className="text-muted-foreground mt-1">
            Theo dõi và xử lý các tín hiệu cầu cứu khẩn cấp từ người dùng.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full sm:w-auto">
          <TabsList>
            <TabsTrigger value="active" className="data-[state=active]:bg-red-100 data-[state=active]:text-red-700">
              Đang báo động
            </TabsTrigger>
            <TabsTrigger value="resolved">Đã giải quyết</TabsTrigger>
            <TabsTrigger value="expired">Hết hạn</TabsTrigger>
            <TabsTrigger value="all">Tất cả</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm nội dung, địa chỉ..."
            className="pl-8 bg-background"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Người Cầu Cứu</TableHead>
              <TableHead>Loại Cầu Cứu</TableHead>
              <TableHead>Vị Trí</TableHead>
              <TableHead>Thời Gian</TableHead>
              <TableHead>Trạng Thái</TableHead>
              <TableHead>Hỗ Trợ</TableHead>
              <TableHead className="w-[80px] text-right">Thao Tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">Đang tải dữ liệu...</TableCell>
            </TableRow>
            ) : isError ? (
            <TableRow>
              <TableCell colSpan={7} className="h-32 text-center text-destructive">Lỗi khi tải dữ liệu.</TableCell>
            </TableRow>
            ) : (!data || !data.items || data.items.length === 0) ? (
            <TableRow>
              <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">Không có dữ liệu SOS</TableCell>
              </TableRow>
            ) : (
              data.items.map((item: SOSPost) => (
                <TableRow key={item._id} className={item.sosStatus === 'active' ? 'bg-red-50/30' : ''}>
                  <TableCell>
                    <div className="font-medium text-foreground">{item.author?.name || 'Vô danh'}</div>
                    <div className="flex items-center text-xs text-muted-foreground mt-1">
                      <Phone className="w-3 h-3 mr-1 shrink-0" />
                      {item.author?.phone || item.author?.email || 'N/A'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`font-medium ${item.sosStatus === 'active' ? 'border-red-200 text-red-600 bg-red-50' : ''}`}>
                      {getCategoryLabel(item.sosCategory)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center text-sm max-w-[200px] truncate mb-1">
                      <MapPin className="w-3 h-3 mr-1 text-muted-foreground shrink-0" />
                      <span className="truncate" title={item.location?.address}>{item.location?.address || 'Không rõ địa chỉ'}</span>
                    </div>
                    <Button 
                      variant="link" 
                      className="p-0 h-auto text-xs text-blue-600"
                      onClick={() => handleOpenGoogleMaps(item.location?.latitude, item.location?.longitude)}
                    >
                      Mở Google Maps
                    </Button>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {format(new Date(item.createdAt), 'dd/MM/yyyy HH:mm')}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={item.sosStatus === 'active' ? 'destructive' : item.sosStatus === 'resolved' ? 'default' : 'secondary'}
                      className={item.sosStatus === 'resolved' ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20' : ''}
                    >
                      {item.sosStatus === 'active' ? 'Đang cấp cứu' : item.sosStatus === 'resolved' ? 'Đã giải quyết' : 'Hết hạn'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const helpers = (item as any).helpers || [];
                      const accepted = helpers.filter((h: any) => h.status === 'accepted');
                      const pending = helpers.filter((h: any) => h.status === 'pending');
                      const resolved = helpers.filter((h: any) => h.status === 'resolved');
                      
                      if (accepted.length === 0 && pending.length === 0 && resolved.length === 0) {
                        return (
                          <span className="text-xs text-muted-foreground italic flex items-center gap-1">
                            <Users className="w-3 h-3" /> Chưa có hỗ trợ
                          </span>
                        );
                      }
                      
                      return (
                        <div className="space-y-1">
                          {accepted.map((h: any) => (
                            <div key={h._id} className="flex items-center gap-1.5">
                              <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                                {h.helper?.avatar ? (
                                  <img src={h.helper.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                                ) : (
                                  <User className="w-3 h-3 text-emerald-600" />
                                )}
                              </div>
                              <span className="text-xs font-medium text-emerald-700 truncate max-w-[100px]" title={h.helper?.name}>{h.helper?.name || 'N/A'}</span>
                              <Badge variant="outline" className="text-[10px] px-1 py-0 border-emerald-200 text-emerald-600 bg-emerald-50">Đang hỗ trợ</Badge>
                            </div>
                          ))}
                          {pending.map((h: any) => (
                            <div key={h._id} className="flex items-center gap-1.5">
                              <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                                {h.helper?.avatar ? (
                                  <img src={h.helper.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                                ) : (
                                  <Clock className="w-3 h-3 text-amber-600" />
                                )}
                              </div>
                              <span className="text-xs text-amber-700 truncate max-w-[100px]" title={h.helper?.name}>{h.helper?.name || 'N/A'}</span>
                              <Badge variant="outline" className="text-[10px] px-1 py-0 border-amber-200 text-amber-600 bg-amber-50">Chờ duyệt</Badge>
                            </div>
                          ))}
                          {resolved.map((h: any) => (
                            <div key={h._id} className="flex items-center gap-1.5">
                              <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                                {h.helper?.avatar ? (
                                  <img src={h.helper.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                                ) : (
                                  <CheckCircle className="w-3 h-3 text-blue-600" />
                                )}
                              </div>
                              <span className="text-xs text-blue-700 truncate max-w-[100px]" title={h.helper?.name}>{h.helper?.name || 'N/A'}</span>
                              <Badge variant="outline" className="text-[10px] px-1 py-0 border-blue-200 text-blue-600 bg-blue-50">Đã hỗ trợ xong</Badge>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
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
                        
                        <DropdownMenuItem onClick={() => openDetail(item)}>
                          <Eye className="mr-2 h-4 w-4 text-muted-foreground" />
                          Xem chi tiết
                        </DropdownMenuItem>
                        
                        {item.sosStatus === 'active' && (
                          <DropdownMenuItem className="text-emerald-600 focus:text-emerald-600 focus:bg-emerald-50" onClick={() => resolveMutation.mutate(item._id)}>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Đánh dấu đã giải quyết
                          </DropdownMenuItem>
                        )}
                        
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10" onClick={() => { setSelectedSos(item); setIsDeleteOpen(true); }}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Xóa (Ẩn) tín hiệu này
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

      {/* Detail Modal */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Chi tiết tín hiệu SOS</DialogTitle>
            <DialogDescription>
              Được gửi vào {selectedSos ? format(new Date(selectedSos.createdAt), 'HH:mm dd/MM/yyyy') : ''}
            </DialogDescription>
          </DialogHeader>
          
          {selectedSos && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden">
                  {selectedSos.author.avatar ? (
                    <img src={selectedSos.author.avatar} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-5 h-5 text-slate-500" />
                  )}
                </div>
                <div>
                  <div className="font-semibold">{selectedSos.author.name}</div>
                  <div className="text-xs text-muted-foreground">{selectedSos.author.phone || selectedSos.author.email}</div>
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Loại sự cố</div>
                <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">
                  {getCategoryLabel(selectedSos.sosCategory)}
                </Badge>
              </div>

              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Nội dung / Mô tả</div>
                <div className="text-sm bg-slate-50 p-3 rounded-md border">
                  {selectedSos.content || <span className="text-muted-foreground italic">Không có mô tả</span>}
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Vị trí ({selectedSos.sosRadius}m)</div>
                <div className="text-sm bg-slate-50 p-3 rounded-md border flex justify-between items-center gap-2">
                  <span className="flex-1">{selectedSos.location?.address || 'Không có địa chỉ cụ thể'}</span>
                  <Button 
                    size="sm" 
                    variant="secondary"
                    onClick={() => handleOpenGoogleMaps(selectedSos.location?.latitude, selectedSos.location?.longitude)}
                  >
                    Bản đồ
                  </Button>
                </div>
              </div>

              {selectedSos.images && selectedSos.images.length > 0 && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Hình ảnh đính kèm</div>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {selectedSos.images.map((img, i) => (
                      <img key={i} src={img.url} alt="SOS Image" className="w-24 h-24 object-cover rounded-md border" />
                    ))}
                  </div>
                </div>
              )}

              {/* Danh sách người hỗ trợ */}
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
                  <Users className="w-4 h-4" /> Tình trạng hỗ trợ
                </div>
                {(() => {
                  const helpers = (selectedSos as any).helpers || [];
                  if (helpers.length === 0) {
                    return (
                      <div className="text-sm text-muted-foreground italic bg-slate-50 p-3 rounded-md border">
                        Chưa có ai gửi yêu cầu hỗ trợ
                      </div>
                    );
                  }
                  return (
                    <div className="space-y-2 bg-slate-50 p-3 rounded-md border">
                      {helpers.map((h: any) => (
                        <div key={h._id} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                              {h.helper?.avatar ? (
                                <img src={h.helper.avatar} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <User className="w-4 h-4 text-slate-500" />
                              )}
                            </div>
                            <div>
                              <div className="text-sm font-medium">{h.helper?.name || 'N/A'}</div>
                              <div className="text-xs text-muted-foreground">{h.helper?.phone || h.helper?.email || ''}</div>
                            </div>
                          </div>
                          <Badge 
                            variant="outline" 
                            className={h.status === 'accepted' 
                              ? 'border-emerald-200 text-emerald-600 bg-emerald-50' 
                              : h.status === 'resolved'
                              ? 'border-blue-200 text-blue-600 bg-blue-50'
                              : 'border-amber-200 text-amber-600 bg-amber-50'
                            }
                          >
                            {h.status === 'accepted' ? 'Đang hỗ trợ' : h.status === 'resolved' ? 'Đã hỗ trợ xong' : 'Chờ duyệt'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa tín hiệu SOS này?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này sẽ xóa tín hiệu này khỏi danh sách và trên bản đồ chung.
              Nên dùng khi đây là báo động giả hoặc spam.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => selectedSos && deleteMutation.mutate(selectedSos._id)}>
              Xác Nhận Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
