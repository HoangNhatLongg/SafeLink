import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Search, Shield, Ban, Unlock, AlertTriangle } from 'lucide-react';
import { User, UserRole } from '../types';
import { formatDate } from '../lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { userApi } from '../services/userApi';
import { useAuthStore } from '../stores/authStore';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';

export default function UserManagement() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  
  const [page, setPage] = useState(1);
  const [limit] = useState(50);

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

  // Ban form state
  const [banReason, setBanReason] = useState('Vi phạm quy định cộng đồng');
  const [customBanReason, setCustomBanReason] = useState('');
  const [banDurationType, setBanDurationType] = useState<'preset' | 'custom' | 'permanent'>('preset');
  const [banDurationPreset, setBanDurationPreset] = useState(1);
  const [banDurationCustom, setBanDurationCustom] = useState(7);

  const BAN_REASONS = [
    'Vi phạm quy định cộng đồng',
    'Lăng mạ, xúc phạm người khác',
    'Thông tin sai lệch, giả mạo',
    'Văn hóa phẩm đồi trụy',
    'Spam, quảng cáo trái phép',
    'Mạo danh người khác',
    'Lý do khác',
  ];

  // Lấy danh sách users
  const { data, isLoading, isError } = useQuery({
    queryKey: ['users', roleFilter, searchTerm, page],
    queryFn: () => userApi.getAll({ 
      role: roleFilter, 
      search: searchTerm,
      page,
      limit
    }),
  });

  // Thay đổi quyền
  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string, role: UserRole }) => userApi.updateRole(id, role),
    onSuccess: (data) => {
      toast.success(data.message || 'Thay đổi quyền thành công');
      setIsRoleModalOpen(false);
      setSelectedUser(null);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Lỗi khi thay đổi quyền');
    }
  });

  // Khóa/mở khóa
  const statusMutation = useMutation({
    mutationFn: ({ id, isActive, banReason, banDuration }: { id: string, isActive: boolean, banReason?: string, banDuration?: number | null }) =>
      userApi.updateStatus(id, { isActive, banReason, banDuration }),
    onSuccess: (data) => {
      toast.success(data.message || 'Thay đổi trạng thái thành công');
      setIsStatusModalOpen(false);
      setSelectedUser(null);
      resetBanForm();
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Lỗi khi đổi trạng thái');
    }
  });

  const getRoleBadge = (role: UserRole) => {
    const roleConfig = {
      admin: { variant: 'destructive' as const, label: 'Quản Trị' },
      moderator: { variant: 'secondary' as const, label: 'Kiểm Duyệt' },
      user: { variant: 'outline' as const, label: 'Người Dùng' },
    };
    
    const config = roleConfig[role] || roleConfig.user;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handleOpenRoleModal = (user: User) => {
    setSelectedUser(user);
    setSelectedRole(user.role);
    setIsRoleModalOpen(true);
  };

  const handleOpenStatusModal = (user: User) => {
    setSelectedUser(user);
    setIsStatusModalOpen(true);
  };

  const handleConfirmRoleChange = () => {
    if (selectedUser && selectedRole) {
      roleMutation.mutate({ id: selectedUser.id, role: selectedRole });
    }
  };

  const handleConfirmStatusChange = () => {
    if (!selectedUser) return;

    if (selectedUser.isActive) {
      // Khóa
      const reason = banReason === 'Lý do khác' ? customBanReason : banReason;
      let duration: number | null = null;
      if (banDurationType === 'preset') duration = banDurationPreset;
      else if (banDurationType === 'custom') duration = banDurationCustom;
      // permanent => null
      statusMutation.mutate({ id: selectedUser.id, isActive: false, banReason: reason, banDuration: duration });
    } else {
      // Mở khóa
      statusMutation.mutate({ id: selectedUser.id, isActive: true });
    }
  };

  const resetBanForm = () => {
    setBanReason('Vi phạm quy định cộng đồng');
    setCustomBanReason('');
    setBanDurationType('preset');
    setBanDurationPreset(1);
    setBanDurationCustom(7);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Quản Lý Người Dùng</h1>
        <p className="text-muted-foreground mt-1">
          Quản lý tài khoản và phân quyền người dùng
        </p>
      </div>

      {/* Search and Filter */}
      <Card className="p-4">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Tìm kiếm theo tên hoặc email..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="h-9 rounded-md border border-input bg-background px-3"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as UserRole | 'all')}
          >
            <option value="all">Tất cả vai trò</option>
            <option value="user">Người dùng</option>
            <option value="moderator">Kiểm duyệt</option>
            <option value="admin">Quản trị</option>
          </select>
        </div>
      </Card>

      {/* Users Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Vai trò</TableHead>
              <TableHead>Ngày tham gia</TableHead>
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
                <TableCell colSpan={6} className="text-center py-8 text-destructive">Đã có lỗi xảy ra khi tải dữ liệu</TableCell>
              </TableRow>
            ) : data?.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Không tìm thấy người dùng nào</TableCell>
              </TableRow>
            ) : (
              data?.items.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{getRoleBadge(user.role)}</TableCell>
                  <TableCell>{formatDate(user.createdAt)}</TableCell>
                  <TableCell>
                    <Badge variant={user.isActive ? 'success' : 'secondary'}>
                      {user.isActive ? 'Hoạt động' : 'Bị khóa'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {/* Nút Phân Quyền chỉ dành cho Admin */}
                      {currentUser?.role === 'admin' && user.id !== currentUser.id && (
                        <Button size="sm" variant="outline" onClick={() => handleOpenRoleModal(user)}>
                          <Shield className="h-4 w-4 mr-1" />
                          Phân quyền
                        </Button>
                      )}
                      
                      {/* Nút Khóa/Mở Khóa */}
                      {user.id !== currentUser?.id && (currentUser?.role === 'admin' || (currentUser?.role === 'moderator' && user.role === 'user')) && (
                        <Button 
                          size="sm" 
                          variant={user.isActive ? 'destructive' : 'default'}
                          onClick={() => handleOpenStatusModal(user)}
                        >
                          {user.isActive ? (
                            <><Ban className="h-4 w-4 mr-1" /> Khóa</>
                          ) : (
                            <><Unlock className="h-4 w-4 mr-1" /> Mở khóa</>
                          )}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Role Change Modal */}
      <Dialog open={isRoleModalOpen} onOpenChange={setIsRoleModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thay đổi vai trò người dùng</DialogTitle>
            <DialogDescription>
              Thay đổi quyền hạn của người dùng <span className="font-bold text-foreground">{selectedUser?.name}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Chọn vai trò mới:</p>
              <div className="flex flex-col gap-2">
                <Button 
                  variant={selectedRole === 'user' ? 'default' : 'outline'} 
                  onClick={() => setSelectedRole('user')}
                  className="justify-start"
                >
                  <Shield className="mr-2 h-4 w-4 opacity-50" /> Người Dùng (Cơ bản)
                </Button>
                <Button 
                  variant={selectedRole === 'moderator' ? 'default' : 'outline'} 
                  onClick={() => setSelectedRole('moderator')}
                  className="justify-start"
                >
                  <Shield className="mr-2 h-4 w-4 text-blue-500" /> Kiểm Duyệt Viên (Moderator)
                </Button>
                <Button 
                  variant={selectedRole === 'admin' ? 'destructive' : 'outline'} 
                  onClick={() => setSelectedRole('admin')}
                  className="justify-start"
                >
                  <Shield className="mr-2 h-4 w-4 text-red-500" /> Quản Trị Viên (Admin)
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRoleModalOpen(false)}>Hủy</Button>
            <Button 
              onClick={handleConfirmRoleChange} 
              disabled={roleMutation.isPending || selectedRole === selectedUser?.role}
            >
              {roleMutation.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Change Modal */}
      <Dialog open={isStatusModalOpen} onOpenChange={(open) => { setIsStatusModalOpen(open); if (!open) resetBanForm(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedUser?.isActive ? (
                <><AlertTriangle className="h-5 w-5 text-red-500" /> Khóa tài khoản</>
              ) : (
                <><Unlock className="h-5 w-5 text-green-500" /> Mở khóa tài khoản</>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedUser?.isActive
                ? `Khóa tài khoản của ${selectedUser.name}. Người này sẽ không thể đăng nhập và sử dụng hệ thống.`
                : `Mở khóa tài khoản cho ${selectedUser?.name}. Người này sẽ có thể truy cập hệ thống bình thường.`}
            </DialogDescription>
          </DialogHeader>

          {selectedUser?.isActive && (
            <div className="py-2 space-y-4">
              {/* Lý do khóa */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Lý do khóa</label>
                <Select value={banReason} onValueChange={setBanReason}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Chọn lý do" />
                  </SelectTrigger>
                  <SelectContent>
                    {BAN_REASONS.map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {banReason === 'Lý do khác' && (
                  <Input
                    placeholder="Nhập lý do cụ thể..."
                    value={customBanReason}
                    onChange={(e) => setCustomBanReason(e.target.value)}
                  />
                )}
              </div>

              {/* Thời hạn khóa */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Thời hạn khóa</label>
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2 flex-wrap">
                    {[1, 3, 5].map((d) => (
                      <Button
                        key={d}
                        size="sm"
                        variant={banDurationType === 'preset' && banDurationPreset === d ? 'default' : 'outline'}
                        onClick={() => { setBanDurationType('preset'); setBanDurationPreset(d); }}
                      >
                        {d} ngày
                      </Button>
                    ))}
                    <Button
                      size="sm"
                      variant={banDurationType === 'custom' ? 'default' : 'outline'}
                      onClick={() => setBanDurationType('custom')}
                    >
                      Tùy chỉnh
                    </Button>
                    <Button
                      size="sm"
                      variant={banDurationType === 'permanent' ? 'destructive' : 'outline'}
                      onClick={() => setBanDurationType('permanent')}
                    >
                      Vĩnh viễn
                    </Button>
                  </div>
                  {banDurationType === 'custom' && (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={1}
                        max={365}
                        value={banDurationCustom}
                        onChange={(e) => setBanDurationCustom(parseInt(e.target.value) || 1)}
                        className="w-24"
                      />
                      <span className="text-sm text-muted-foreground">ngày</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStatusModalOpen(false)}>Hủy</Button>
            <Button
              variant={selectedUser?.isActive ? 'destructive' : 'default'}
              onClick={handleConfirmStatusChange}
              disabled={statusMutation.isPending || (selectedUser?.isActive && banReason === 'Lý do khác' && !customBanReason.trim())}
            >
              {statusMutation.isPending ? 'Đang xử lý...' : (selectedUser?.isActive ? 'Khóa tài khoản' : 'Mở khóa')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
