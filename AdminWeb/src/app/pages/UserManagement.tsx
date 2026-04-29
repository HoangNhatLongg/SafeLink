import { useState } from 'react';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Search, Shield, Ban, Unlock } from 'lucide-react';
import { User, UserRole } from '../types';
import { formatDate } from '../lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@radix-ui/react-select';

// Mock data
const mockUsers: User[] = [
  {
    id: '1',
    name: 'Nguyễn Văn A',
    email: 'nguyenvana@gmail.com',
    role: 'user',
    createdAt: '2026-01-15',
    isActive: true,
  },
  {
    id: '2',
    name: 'Trần Thị B',
    email: 'tranthib@gmail.com',
    role: 'moderator',
    createdAt: '2026-02-20',
    isActive: true,
  },
  {
    id: '3',
    name: 'Lê Văn C',
    email: 'levanc@gmail.com',
    role: 'user',
    createdAt: '2026-03-10',
    isActive: false,
  },
];

export default function UserManagement() {
  const [users] = useState<User[]>(mockUsers);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');

  const filteredUsers = users.filter((user) => {
    const matchesSearch = 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  const getRoleBadge = (role: UserRole) => {
    const roleConfig = {
      admin: { variant: 'destructive' as const, label: 'Quản Trị' },
      moderator: { variant: 'secondary' as const, label: 'Kiểm Duyệt' },
      user: { variant: 'outline' as const, label: 'Người Dùng' },
    };
    
    const config = roleConfig[role];
    return <Badge variant={config.variant}>{config.label}</Badge>;
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
            {filteredUsers.map((user) => (
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
                    <Button size="sm" variant="outline">
                      <Shield className="h-4 w-4 mr-1" />
                      Phân quyền
                    </Button>
                    {user.isActive ? (
                      <Button size="sm" variant="destructive">
                        <Ban className="h-4 w-4 mr-1" />
                        Khóa
                      </Button>
                    ) : (
                      <Button size="sm" variant="default">
                        <Unlock className="h-4 w-4 mr-1" />
                        Mở khóa
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {filteredUsers.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Không tìm thấy người dùng nào</p>
        </div>
      )}
    </div>
  );
}
