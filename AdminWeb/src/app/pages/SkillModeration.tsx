import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { skillApi, SkillQueryParams } from '../services/skillApi';
import { Skill, SkillStatus, SkillStep } from '../types';

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
import { Plus, Search, MoreHorizontal, Edit, Trash2, CheckCircle, XCircle, Image as ImageIcon, X } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';

// For the Form state
interface StepFormState {
  order: number;
  title: string;
  content: string;
  // images that are kept from existing
  keptImages: Array<{ url: string; publicId?: string }>;
  // new file to upload
  newImageFile: File | null;
  newImagePreview?: string;
}

export default function SkillModeration() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<SkillStatus | 'all'>('pending');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [search, setSearch] = useState('');
  
  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [currentEntry, setCurrentEntry] = useState<Partial<Skill>>({});
  
  // Custom states for steps and cover image
  const [stepsState, setStepsState] = useState<StepFormState[]>([]);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);

  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [entryToReject, setEntryToReject] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Queries
  const { data, isLoading, isError } = useQuery({
    queryKey: ['skills', activeTab, search],
    queryFn: () => skillApi.getAll({ status: activeTab, search }),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (formData: FormData) => skillApi.create(formData),
    onSuccess: () => {
      toast.success('Thêm kỹ năng thành công');
      setIsFormOpen(false);
      queryClient.invalidateQueries({ queryKey: ['skills'] });
    },
    onError: (error: any) => toast.error(error.message || 'Lỗi khi thêm kỹ năng'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, formData }: { id: string; formData: FormData }) => skillApi.update(id, formData),
    onSuccess: () => {
      toast.success('Cập nhật kỹ năng thành công');
      setIsFormOpen(false);
      queryClient.invalidateQueries({ queryKey: ['skills'] });
    },
    onError: (error: any) => toast.error(error.message || 'Lỗi khi cập nhật kỹ năng'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => skillApi.delete(id),
    onSuccess: () => {
      toast.success('Đã xóa kỹ năng');
      setIsDeleteOpen(false);
      queryClient.invalidateQueries({ queryKey: ['skills'] });
    },
    onError: (error: any) => toast.error(error.message || 'Lỗi khi xóa kỹ năng'),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, action, reason }: { id: string; action: 'approve' | 'reject'; reason?: string }) => 
      skillApi.review(id, action, reason),
    onSuccess: (_, variables) => {
      toast.success(variables.action === 'approve' ? 'Đã duyệt kỹ năng' : 'Đã từ chối kỹ năng');
      setIsRejectOpen(false);
      setRejectReason('');
      queryClient.invalidateQueries({ queryKey: ['skills'] });
    },
    onError: (error: any) => toast.error(error.message || 'Lỗi khi xử lý'),
  });

  const handleStatusChange = (id: string, newStatus: SkillStatus) => {
    // Để thay đổi status nhanh, ta dùng updateMutation
    const formData = new FormData();
    formData.append('status', newStatus);
    updateMutation.mutate({ id, formData });
  };

  const handleOpenForm = (mode: 'add' | 'edit', entry?: Skill) => {
    setFormMode(mode);
    setCoverFile(null);
    if (mode === 'edit' && entry) {
      setCurrentEntry(entry);
      setCoverPreview(entry.coverImage?.url || null);
      
      const mappedSteps: StepFormState[] = (entry.steps || []).map(s => ({
        order: s.order,
        title: s.title,
        content: s.content,
        keptImages: s.images || [],
        newImageFile: null,
      }));
      setStepsState(mappedSteps);
    } else {
      setCurrentEntry({ 
        category: 'khac', 
        status: 'active', 
        difficulty: 'co_ban' 
      });
      setCoverPreview(null);
      setStepsState([{ order: 1, title: '', content: '', keptImages: [], newImageFile: null }]);
    }
    setIsFormOpen(true);
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const addStep = () => {
    setStepsState(prev => [
      ...prev,
      { order: prev.length + 1, title: '', content: '', keptImages: [], newImageFile: null }
    ]);
  };

  const removeStep = (index: number) => {
    setStepsState(prev => {
      const newSteps = [...prev];
      newSteps.splice(index, 1);
      return newSteps.map((s, i) => ({ ...s, order: i + 1 }));
    });
  };

  const updateStep = (index: number, field: keyof StepFormState, value: any) => {
    setStepsState(prev => {
      const newSteps = [...prev];
      newSteps[index] = { ...newSteps[index], [field]: value };
      return newSteps;
    });
  };

  const handleStepImageChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      updateStep(index, 'newImageFile', file);
      updateStep(index, 'newImagePreview', URL.createObjectURL(file));
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentEntry.title || !currentEntry.category) {
      toast.error('Vui lòng điền tiêu đề và danh mục');
      return;
    }

    const formData = new FormData();
    formData.append('title', currentEntry.title);
    formData.append('category', currentEntry.category);
    if (currentEntry.summary) formData.append('summary', currentEntry.summary);
    if (currentEntry.difficulty) formData.append('difficulty', currentEntry.difficulty);
    if (currentEntry.duration) formData.append('duration', currentEntry.duration);
    if (currentEntry.videoUrl) formData.append('videoUrl', currentEntry.videoUrl);
    if (currentEntry.status) formData.append('status', currentEntry.status);

    if (coverFile) {
      formData.append('coverImage', coverFile);
    }

    // Prepare steps
    const stepsData = stepsState.map(s => ({
      order: s.order,
      title: s.title,
      content: s.content,
    }));
    formData.append('steps', JSON.stringify(stepsData));

    // For editing, we need to pass keptImages
    if (formMode === 'edit') {
      const keptImagesMap: Record<string, any[]> = {};
      stepsState.forEach((s, idx) => {
        keptImagesMap[`step_${idx}`] = s.keptImages;
      });
      formData.append('keptImages', JSON.stringify(keptImagesMap));
    }

    // Append step images
    stepsState.forEach((s, idx) => {
      if (s.newImageFile) {
        formData.append(`step_${idx}_image`, s.newImageFile);
      }
    });

    if (formMode === 'add') {
      createMutation.mutate(formData);
    } else if (currentEntry._id) {
      updateMutation.mutate({ id: currentEntry._id, formData });
    }
  };

  const getCategoryLabel = (cat?: string) => {
    const map: Record<string, string> = {
      so_cap_cuu: "Sơ Cấp Cứu", pccc: "PCCC", thien_tai: "Thiên Tai", an_toan_dien: "An Toàn Điện", tai_nan: "Tai Nạn", tam_ly: "Tâm Lý", khac: "Khác"
    };
    return cat ? (map[cat] || 'Khác') : 'Khác';
  };

  const SKILL_CATEGORIES = [
    { key: 'all', label: 'Tất cả danh mục' },
    { key: 'so_cap_cuu', label: 'Sơ Cấp Cứu' },
    { key: 'pccc', label: 'PCCC' },
    { key: 'thien_tai', label: 'Thiên Tai' },
    { key: 'an_toan_dien', label: 'An Toàn Điện' },
    { key: 'tai_nan', label: 'Tai Nạn' },
    { key: 'tam_ly', label: 'Tâm Lý' },
    { key: 'khac', label: 'Khác' },
  ];

  // Client-side filter theo category
  const filteredItems = data?.items?.filter((item: Skill) =>
    selectedCategory === 'all' || item.category === selectedCategory
  ) || [];

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quản Lý Thư Viện Kỹ Năng</h1>
          <p className="text-muted-foreground mt-1">
            Thêm, sửa, xóa và xét duyệt các bài viết hướng dẫn kỹ năng.
          </p>
        </div>
        <Button onClick={() => handleOpenForm('add')} className="shrink-0 gap-2">
          <Plus className="w-4 h-4" />
          Thêm Bài Kỹ Năng
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full sm:w-auto">
          <TabsList>
            <TabsTrigger value="pending">Chờ duyệt</TabsTrigger>
            <TabsTrigger value="active">Đang hiển thị</TabsTrigger>
            <TabsTrigger value="hidden">Đã ẩn</TabsTrigger>
            <TabsTrigger value="rejected">Đã từ chối</TabsTrigger>
            <TabsTrigger value="all">Tất cả</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm tiêu đề, danh mục..."
            className="pl-8 bg-background"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Category filter chips */}
      <div className="flex flex-wrap gap-2">
        {SKILL_CATEGORIES.map(c => (
          <button
            key={c.key}
            onClick={() => setSelectedCategory(c.key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
              selectedCategory === c.key
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background text-muted-foreground border-border hover:bg-muted'
            }`}
          >
            {c.label}
            {selectedCategory !== c.key && data?.items && (
              <span className="ml-1 opacity-60">
                ({data.items.filter((i: Skill) => c.key === 'all' ? true : i.category === c.key).length})
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-16">Ảnh</TableHead>
              <TableHead>Tiêu đề</TableHead>
              <TableHead>Danh mục</TableHead>
              <TableHead>Độ khó</TableHead>
              <TableHead>Người đóng góp</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">Đang tải dữ liệu...</TableCell>
              </TableRow>
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-destructive">Lỗi khi tải dữ liệu</TableCell>
              </TableRow>
            ) : (filteredItems.length === 0) ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">Không có dữ liệu</TableCell>
              </TableRow>
            ) : (
              filteredItems.map((item: Skill) => (
                <TableRow key={item._id}>
                  <TableCell>
                    {item.coverImage?.url ? (
                      <img src={item.coverImage.url} alt={item.title} className="w-10 h-10 object-cover rounded-md border" />
                    ) : (
                      <div className="w-10 h-10 bg-muted rounded-md flex items-center justify-center border">
                        <ImageIcon className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-foreground max-w-[200px] truncate" title={item.title}>{item.title}</div>
                    <div className="text-xs text-muted-foreground mt-1 max-w-[200px] truncate">{item.summary}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-normal bg-indigo-50 text-indigo-700 border-indigo-200">
                      {getCategoryLabel(item.category)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm capitalize">{item.difficulty?.replace('_', ' ')}</span>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {item.submittedBy ? item.submittedBy.name : 'Quản trị viên'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(item.createdAt), 'dd/MM/yyyy')}
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger className="focus:outline-none">
                        <Badge variant={item.status === 'active' ? 'default' : item.status === 'pending' ? 'secondary' : item.status === 'hidden' ? 'outline' : 'destructive'}
                               className={`cursor-pointer ${item.status === 'active' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20' : item.status === 'hidden' ? 'bg-slate-100 text-slate-600 border-slate-300' : ''}`}>
                          {item.status === 'active' ? 'Hiển thị' : item.status === 'pending' ? 'Chờ duyệt' : item.status === 'hidden' ? 'Đang ẩn' : 'Từ chối'}
                        </Badge>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem onClick={() => handleStatusChange(item._id, 'active')}>
                          <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></span> Hiển thị
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange(item._id, 'hidden')}>
                          <span className="w-2 h-2 rounded-full bg-slate-400 mr-2"></span> Ẩn đi
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange(item._id, 'pending')}>
                          <span className="w-2 h-2 rounded-full bg-amber-500 mr-2"></span> Chờ duyệt
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange(item._id, 'rejected')}>
                          <span className="w-2 h-2 rounded-full bg-red-500 mr-2"></span> Từ chối
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
                        {item.status === 'active' && (
                          <DropdownMenuItem onClick={() => handleStatusChange(item._id, 'hidden')}>
                            <XCircle className="mr-2 h-4 w-4 text-muted-foreground" />
                            Ẩn kỹ năng này
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => handleOpenForm('edit', item)}>
                          <Edit className="mr-2 h-4 w-4 text-muted-foreground" />
                          Chỉnh sửa
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10" onClick={() => { setEntryToDelete(item._id); setIsDeleteOpen(true); }}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Xóa bài viết
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
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{formMode === 'add' ? 'Thêm Bài Kỹ Năng Mới' : 'Chỉnh Sửa Bài Kỹ Năng'}</DialogTitle>
            <DialogDescription>Nhập thông tin chi tiết và các bước thực hiện.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleFormSubmit} className="space-y-6 py-4">
            
            {/* THÔNG TIN CHUNG */}
            <div className="bg-slate-50 p-4 rounded-lg border space-y-4">
              <h3 className="font-semibold text-sm uppercase text-slate-500 tracking-wider">Thông tin chung</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label>Tiêu đề *</Label>
                  <Input required value={currentEntry.title || ''} onChange={e => setCurrentEntry({...currentEntry, title: e.target.value})} placeholder="VD: Sơ cứu người đuối nước" />
                </div>
                
                <div className="space-y-2 col-span-2">
                  <Label>Tóm tắt</Label>
                  <Textarea value={currentEntry.summary || ''} onChange={e => setCurrentEntry({...currentEntry, summary: e.target.value})} placeholder="Đoạn mô tả ngắn gọn..." />
                </div>

                <div className="space-y-2">
                  <Label>Danh mục *</Label>
                  <Select value={currentEntry.category || 'khac'} onValueChange={v => setCurrentEntry({...currentEntry, category: v as any})}>
                    <SelectTrigger><SelectValue placeholder="Chọn danh mục" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="so_cap_cuu">Sơ cấp cứu</SelectItem>
                      <SelectItem value="pccc">Phòng cháy chữa cháy</SelectItem>
                      <SelectItem value="thien_tai">Thiên tai</SelectItem>
                      <SelectItem value="an_toan_dien">An toàn điện</SelectItem>
                      <SelectItem value="tai_nan">Tai nạn giao thông</SelectItem>
                      <SelectItem value="tam_ly">Tâm lý</SelectItem>
                      <SelectItem value="khac">Khác</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Độ khó</Label>
                  <Select value={currentEntry.difficulty || 'co_ban'} onValueChange={v => setCurrentEntry({...currentEntry, difficulty: v as any})}>
                    <SelectTrigger><SelectValue placeholder="Độ khó" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="co_ban">Cơ bản</SelectItem>
                      <SelectItem value="trung_binh">Trung bình</SelectItem>
                      <SelectItem value="nang_cao">Nâng cao</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Thời lượng ước tính</Label>
                  <Input value={currentEntry.duration || ''} onChange={e => setCurrentEntry({...currentEntry, duration: e.target.value})} placeholder="VD: 5-10 phút" />
                </div>
                
                <div className="space-y-2">
                  <Label>Trạng thái hiển thị</Label>
                  <Select value={currentEntry.status || 'active'} onValueChange={v => setCurrentEntry({...currentEntry, status: v as any})}>
                    <SelectTrigger><SelectValue placeholder="Trạng thái" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Đang hiển thị</SelectItem>
                      <SelectItem value="hidden">Tạm ẩn</SelectItem>
                      <SelectItem value="pending">Chờ duyệt</SelectItem>
                      <SelectItem value="rejected">Từ chối</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 col-span-2">
                  <Label>Video URL (YouTube)</Label>
                  <Input value={currentEntry.videoUrl || ''} onChange={e => setCurrentEntry({...currentEntry, videoUrl: e.target.value})} placeholder="https://youtube.com/watch?v=..." />
                </div>

                <div className="space-y-2 col-span-2">
                  <Label>Ảnh Bìa</Label>
                  <div className="flex items-center gap-4">
                    {coverPreview ? (
                      <div className="relative w-24 h-16 rounded overflow-hidden border">
                        <img src={coverPreview} alt="Cover preview" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => {setCoverFile(null); setCoverPreview(null);}} className="absolute top-1 right-1 bg-black/50 rounded-full p-0.5 text-white hover:bg-red-500">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-24 h-16 bg-muted rounded border flex items-center justify-center">
                        <ImageIcon className="w-6 h-6 text-muted-foreground/50" />
                      </div>
                    )}
                    <Input type="file" accept="image/*" onChange={handleCoverChange} className="flex-1 cursor-pointer" />
                  </div>
                </div>
              </div>
            </div>

            {/* CÁC BƯỚC THỰC HIỆN */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-sm uppercase text-slate-500 tracking-wider">Các bước thực hiện</h3>
                <Button type="button" variant="outline" size="sm" onClick={addStep} className="gap-1">
                  <Plus className="w-3 h-3" /> Thêm Bước
                </Button>
              </div>

              {stepsState.map((step, idx) => (
                <div key={idx} className="p-4 border rounded-lg bg-white relative space-y-3">
                  <div className="absolute top-3 right-3 text-sm font-semibold text-muted-foreground flex items-center gap-2">
                    Bước {idx + 1}
                    <button type="button" onClick={() => removeStep(idx)} className="text-red-500 hover:text-red-700 bg-red-50 p-1 rounded">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-2 pr-20">
                    <Label>Tiêu đề bước *</Label>
                    <Input required value={step.title} onChange={e => updateStep(idx, 'title', e.target.value)} placeholder="VD: Đánh giá hiện trường" />
                  </div>

                  <div className="space-y-2">
                    <Label>Nội dung chi tiết *</Label>
                    <Textarea required value={step.content} onChange={e => updateStep(idx, 'content', e.target.value)} placeholder="Mô tả chi tiết cách thực hiện..." className="min-h-[80px]" />
                  </div>

                  <div className="space-y-2">
                    <Label>Ảnh minh họa</Label>
                    <div className="flex items-center gap-4">
                      {/* Ảnh đã có từ server (edit mode) */}
                      {step.keptImages.map((img, iIndex) => (
                        <div key={iIndex} className="relative w-16 h-16 rounded overflow-hidden border">
                          <img src={img.url} alt="step image" className="w-full h-full object-cover" />
                          <button type="button" onClick={() => {
                            const newKept = [...step.keptImages];
                            newKept.splice(iIndex, 1);
                            updateStep(idx, 'keptImages', newKept);
                          }} className="absolute top-1 right-1 bg-black/50 rounded-full p-0.5 text-white hover:bg-red-500">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}

                      {/* Ảnh mới upload */}
                      {step.newImagePreview ? (
                        <div className="relative w-16 h-16 rounded overflow-hidden border border-emerald-500 border-2">
                          <img src={step.newImagePreview} alt="new step image" className="w-full h-full object-cover" />
                          <button type="button" onClick={() => {
                            updateStep(idx, 'newImageFile', null);
                            updateStep(idx, 'newImagePreview', null);
                          }} className="absolute top-1 right-1 bg-black/50 rounded-full p-0.5 text-white hover:bg-red-500">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <Input type="file" accept="image/*" onChange={(e) => handleStepImageChange(idx, e)} className="flex-1 max-w-[200px]" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <DialogFooter className="pt-4 border-t sticky bottom-0 bg-white z-10 py-4">
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Hủy</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {formMode === 'add' ? 'Thêm Kỹ Năng' : 'Lưu Thay Đổi'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa bài viết kỹ năng này?</AlertDialogTitle>
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
            <DialogDescription>Nhập lý do từ chối để người dùng biết tại sao.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Lý do từ chối</Label>
              <Textarea 
                value={rejectReason} 
                onChange={(e) => setRejectReason(e.target.value)} 
                placeholder="Bài viết sai nội dung, trùng lặp..."
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
