import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { provinceApi, Province } from '../services/provinceApi';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Trash2, Edit, Plus, MapPin } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '../components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../components/ui/alert-dialog';

export default function ProvinceManagement() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  
  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [currentProvince, setCurrentProvince] = useState<{ _id?: string, name: string, wards: string[] }>({ name: '', wards: [] });
  const [wardInput, setWardInput] = useState('');
  const [editingWard, setEditingWard] = useState<{ old: string, new: string } | null>(null);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [provinceToDelete, setProvinceToDelete] = useState<string | null>(null);

  const { data: provinces = [], isLoading } = useQuery({
    queryKey: ['provinces'],
    queryFn: () => provinceApi.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => provinceApi.create(data),
    onSuccess: () => {
      toast.success('Thêm tỉnh thành công');
      setIsFormOpen(false);
      queryClient.invalidateQueries({ queryKey: ['provinces'] });
    },
    onError: (err: any) => toast.error(err.message || 'Lỗi khi thêm tỉnh')
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => provinceApi.update(id, data),
    onSuccess: () => {
      toast.success('Cập nhật tỉnh thành công');
      setIsFormOpen(false);
      queryClient.invalidateQueries({ queryKey: ['provinces'] });
    },
    onError: (err: any) => toast.error(err.message || 'Lỗi cập nhật')
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => provinceApi.delete(id),
    onSuccess: () => {
      toast.success('Đã xóa tỉnh');
      setIsDeleteOpen(false);
      queryClient.invalidateQueries({ queryKey: ['provinces'] });
    },
    onError: (err: any) => toast.error(err.message || 'Lỗi khi xóa')
  });

  const filteredProvinces = provinces.filter((p: Province) => p.name.toLowerCase().includes(search.toLowerCase()));

  const handleOpenForm = (mode: 'add' | 'edit', prov?: Province) => {
    setFormMode(mode);
    setWardInput('');
    setEditingWard(null);
    if (mode === 'edit' && prov) {
      setCurrentProvince({ _id: prov._id, name: prov.name, wards: [...prov.wards] });
    } else {
      setCurrentProvince({ name: '', wards: [] });
    }
    setIsFormOpen(true);
  };

  const handleAddWard = () => {
    if (!wardInput.trim()) return;
    if (currentProvince.wards.includes(wardInput.trim())) {
      toast.error('Phường/Xã này đã có trong danh sách');
      return;
    }
    setCurrentProvince(prev => ({
      ...prev,
      wards: [...prev.wards, wardInput.trim()].sort()
    }));
    setWardInput('');
  };

  const handleRemoveWard = (w: string) => {
    setCurrentProvince(prev => ({
      ...prev,
      wards: prev.wards.filter(x => x !== w)
    }));
  };

  const handleSaveEditWard = () => {
    if (!editingWard || !editingWard.new.trim()) return;
    const { old, new: newWardName } = editingWard;
    if (newWardName !== old && currentProvince.wards.includes(newWardName.trim())) {
      toast.error('Tên này đã tồn tại');
      return;
    }
    setCurrentProvince(prev => ({
      ...prev,
      wards: prev.wards.map(w => w === old ? newWardName.trim() : w).sort()
    }));
    setEditingWard(null);
  };

  const sortedWards = (wards: string[]) => {
    const phuongs = wards.filter(w => w.toLowerCase().startsWith('phường ')).sort((a, b) => a.substring(7).localeCompare(b.substring(7), 'vi'));
    const xas = wards.filter(w => w.toLowerCase().startsWith('xã ')).sort((a, b) => a.substring(3).localeCompare(b.substring(3), 'vi'));
    const others = wards.filter(w => !w.toLowerCase().startsWith('phường ') && !w.toLowerCase().startsWith('xã ')).sort((a, b) => a.localeCompare(b, 'vi'));
    return { phuongs, xas, others };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProvince.name.trim()) return toast.error('Vui lòng nhập tên tỉnh');

    if (formMode === 'add') {
      createMutation.mutate({ name: currentProvince.name.trim(), wards: currentProvince.wards });
    } else if (currentProvince._id) {
      updateMutation.mutate({ id: currentProvince._id, data: { name: currentProvince.name.trim(), wards: currentProvince.wards } });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quản Lý Hành Chính</h1>
          <p className="text-muted-foreground mt-1">
            Cấu hình danh sách 34 Tỉnh và các Phường/Xã trực thuộc.
          </p>
        </div>
        <Button onClick={() => handleOpenForm('add')} className="shrink-0 gap-2">
          <Plus className="w-4 h-4" />
          Thêm Tỉnh
        </Button>
      </div>

      <div className="bg-card border rounded-xl p-4 shadow-sm">
        <Input 
          placeholder="Tìm kiếm tỉnh..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
      </div>

      {isLoading ? (
        <div className="text-center py-10 text-muted-foreground">Đang tải...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProvinces.map((p: Province) => (
            <div key={p._id} className="bg-card border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-emerald-600" />
                  {p.name}
                </h3>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => handleOpenForm('edit', p)}>
                    <Edit className="w-4 h-4 text-muted-foreground" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => { setProvinceToDelete(p._id); setIsDeleteOpen(true); }}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
              <div className="text-sm text-muted-foreground mb-2">
                <strong>{p.wards.length}</strong> phường/xã trực thuộc
              </div>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                {p.wards.map(w => (
                  <span key={w} className="px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded-md">
                    {w}
                  </span>
                ))}
                {p.wards.length === 0 && <span className="text-xs italic">Chưa có dữ liệu phường xã</span>}
              </div>
            </div>
          ))}
          {filteredProvinces.length === 0 && (
            <div className="col-span-full text-center py-10 text-muted-foreground">Không tìm thấy tỉnh nào.</div>
          )}
        </div>
      )}

      {/* Form Modal */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{formMode === 'add' ? 'Thêm Tỉnh Mới' : 'Cập Nhật Tỉnh'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tên Tỉnh / Thành phố *</Label>
              <Input required value={currentProvince.name} onChange={e => setCurrentProvince(prev => ({...prev, name: e.target.value}))} placeholder="Nhập tên tỉnh..." />
            </div>
            
            <div className="space-y-2">
              <Label>Quản lý Phường / Xã ({currentProvince.wards.length})</Label>
              <div className="flex gap-2">
                <Input value={wardInput} onChange={e => setWardInput(e.target.value)} placeholder="Nhập tên phường/xã (VD: Phường ABC, Xã XYZ)..." onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddWard(); } }} />
                <Button type="button" variant="secondary" onClick={handleAddWard}>Thêm</Button>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-4 bg-muted/30 p-3 rounded-md border min-h-[200px] max-h-80 overflow-y-auto">
                {(() => {
                  const { phuongs, xas, others } = sortedWards(currentProvince.wards);
                  return (
                    <>
                      <div className="space-y-2">
                        <Label className="text-muted-foreground border-b pb-1 block">Danh sách Phường</Label>
                        <div className="flex flex-col gap-2">
                          {[...phuongs, ...others].map(w => (
                            <div key={w} className="flex flex-col bg-background border px-2 py-1.5 rounded-md text-sm">
                              {editingWard?.old === w ? (
                                <div className="flex items-center gap-1">
                                  <Input autoFocus size={1} className="h-6 text-xs px-1 py-0 flex-1" value={editingWard.new} onChange={e => setEditingWard({ ...editingWard, new: e.target.value })} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSaveEditWard(); } }} onBlur={handleSaveEditWard} />
                                </div>
                              ) : (
                                <div className="flex items-center justify-between">
                                  <span className="truncate" title={w}>{w}</span>
                                  <div className="flex items-center gap-0.5 shrink-0 ml-1">
                                    <button type="button" onClick={() => setEditingWard({ old: w, new: w })} className="text-muted-foreground hover:bg-muted rounded-full p-1">
                                      <Edit className="w-3.5 h-3.5" />
                                    </button>
                                    <button type="button" onClick={() => handleRemoveWard(w)} className="text-destructive hover:bg-destructive/10 rounded-full p-1">
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                          {phuongs.length === 0 && others.length === 0 && <span className="text-sm text-muted-foreground italic">Trống</span>}
                        </div>
                      </div>

                      <div className="space-y-2 border-l pl-4">
                        <Label className="text-muted-foreground border-b pb-1 block">Danh sách Xã</Label>
                        <div className="flex flex-col gap-2">
                          {xas.map(w => (
                            <div key={w} className="flex flex-col bg-background border px-2 py-1.5 rounded-md text-sm">
                              {editingWard?.old === w ? (
                                <div className="flex items-center gap-1">
                                  <Input autoFocus size={1} className="h-6 text-xs px-1 py-0 flex-1" value={editingWard.new} onChange={e => setEditingWard({ ...editingWard, new: e.target.value })} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSaveEditWard(); } }} onBlur={handleSaveEditWard} />
                                </div>
                              ) : (
                                <div className="flex items-center justify-between">
                                  <span className="truncate" title={w}>{w}</span>
                                  <div className="flex items-center gap-0.5 shrink-0 ml-1">
                                    <button type="button" onClick={() => setEditingWard({ old: w, new: w })} className="text-muted-foreground hover:bg-muted rounded-full p-1">
                                      <Edit className="w-3.5 h-3.5" />
                                    </button>
                                    <button type="button" onClick={() => handleRemoveWard(w)} className="text-destructive hover:bg-destructive/10 rounded-full p-1">
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                          {xas.length === 0 && <span className="text-sm text-muted-foreground italic">Trống</span>}
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Hủy</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                Lưu Thay Đổi
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa Tỉnh/Thành phố?</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa tỉnh này? Tất cả các Phường/Xã trực thuộc sẽ bị xóa theo. Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive" onClick={() => provinceToDelete && deleteMutation.mutate(provinceToDelete)}>
              Xóa Vĩnh Viễn
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
