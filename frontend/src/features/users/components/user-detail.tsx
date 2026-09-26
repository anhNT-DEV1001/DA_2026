"use client";

import * as React from "react";
import { Modal } from "@/components/common/modal";
import { DateTimePicker } from "@/components/common/datetime-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { useUser } from "../hooks";
import { useRoleList } from "@/features/roles";
import type { CreateUserDto, UpdateUserDto, UserItem } from "../types";
import {
  Camera,
  Pencil,
  ShieldCheck,
  UserPlus,
  Check,
  Eye,
  EyeOff,
} from "lucide-react";

export interface UserDetailProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  user?: UserItem | null;
  onSuccess?: (savedUser: UserItem) => void;
  trigger?: React.ReactNode;
}

interface FormState {
  username: string;
  fullName: string;
  email: string;
  phone: string;
  gender: string;
  address: string;
  dob: string;
  password: string;
  passwordConfirm: string;
  roleIds: number[];
  avatarFile: File | null;
  avatarPreview: string | null;
}

const initialFormState: FormState = {
  username: "",
  fullName: "",
  email: "",
  phone: "",
  gender: "Nam",
  address: "",
  dob: "",
  password: "",
  passwordConfirm: "",
  roleIds: [],
  avatarFile: null,
  avatarPreview: null,
};

function getInitials(name?: string | null): string {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function UserDetailModal({
  open,
  onOpenChange,
  user,
  onSuccess,
  trigger,
}: UserDetailProps) {
  const isEdit = Boolean(user);

  const { createUser, updateUser, isCreating, isUpdating } = useUser(user?.id);
  const { data: rolesData, isLoading: isLoadingRoles } = useRoleList({
    limit: 100,
  });

  const availableRoles = React.useMemo(() => {
    if (!rolesData) return [];
    if (Array.isArray(rolesData)) return rolesData;
    return rolesData.items || [];
  }, [rolesData]);

  const isSubmitting = isCreating || isUpdating;

  const [form, setForm] = React.useState<FormState>(initialFormState);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (user) {
      const assignedRoleIds = user.userRoles?.map((ur) => ur.roleId) || [];
      const formattedDob = user.dob ? user.dob.split("T")[0] : "";

      setForm({
        username: user.username || "",
        fullName: user.fullName || "",
        email: user.email || "",
        phone: user.phone || "",
        gender: user.gender || "Nam",
        address: user.address || "",
        dob: formattedDob,
        password: "",
        passwordConfirm: "",
        roleIds: assignedRoleIds,
        avatarFile: null,
        avatarPreview: user.avatar || null,
      });
    } else {
      setForm(initialFormState);
    }
    setErrors({});
    setShowPassword(false);
  }, [user, open]);

  const handleChange = <K extends keyof FormState>(
    field: K,
    value: FormState[K],
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));

    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleRoleToggle = (roleId: number) => {
    setForm((prev) => {
      const exists = prev.roleIds.includes(roleId);
      const newRoleIds = exists
        ? prev.roleIds.filter((id) => id !== roleId)
        : [...prev.roleIds, roleId];
      return { ...prev, roleIds: newRoleIds };
    });

    if (errors.roleIds) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.roleIds;
        return next;
      });
    }
  };

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setForm((prev) => ({
        ...prev,
        avatarFile: file,
        avatarPreview: previewUrl,
      }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.fullName.trim()) {
      newErrors.fullName = "Vui lòng nhập họ và tên.";
    }

    if (!form.email.trim()) {
      newErrors.email = "Vui lòng nhập email.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      newErrors.email = "Email không đúng định dạng.";
    }

    if (!form.phone.trim()) {
      newErrors.phone = "Vui lòng nhập số điện thoại.";
    }

    if (!form.gender) {
      newErrors.gender = "Vui lòng chọn giới tính.";
    }

    if (form.roleIds.length === 0) {
      newErrors.roleIds = "Vui lòng gán ít nhất một vai trò.";
    }

    if (!isEdit) {
      if (!form.username.trim()) {
        newErrors.username = "Vui lòng nhập tên đăng nhập.";
      }
      if (!form.password) {
        newErrors.password = "Vui lòng nhập mật khẩu.";
      } else if (form.password.length < 6) {
        newErrors.password = "Mật khẩu phải có ít nhất 6 ký tự.";
      }
      if (!form.passwordConfirm) {
        newErrors.passwordConfirm = "Vui lòng xác nhận lại mật khẩu.";
      } else if (form.password !== form.passwordConfirm) {
        newErrors.passwordConfirm = "Mật khẩu xác nhận không khớp.";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!validate() || isSubmitting) return;

    try {
      if (isEdit && user) {
        const dto: UpdateUserDto = {
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          gender: form.gender,
          address: form.address.trim() || undefined,
          dob: form.dob || undefined,
          roleIds: form.roleIds,
          avatar: form.avatarFile ?? undefined,
        };

        const updated = await updateUser({ id: user.id, dto });

        toast.add({
          title: "Cập nhật thành công",
          description: `Thông tin tài khoản "${updated.fullName}" đã được cập nhật.`,
          type: "success",
        });

        onSuccess?.(updated);
        onOpenChange?.(false);
      } else {
        const dto: CreateUserDto = {
          username: form.username.trim(),
          password: form.password,
          passwordConfirm: form.passwordConfirm,
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          gender: form.gender,
          address: form.address.trim() || undefined,
          dob: form.dob || undefined,
          roleIds: form.roleIds,
          avatar: form.avatarFile ?? undefined,
        };

        const created = await createUser(dto);

        toast.add({
          title: "Tạo người dùng thành công",
          description: `Tài khoản "${created.fullName}" đã được tạo thành công.`,
          type: "success",
        });

        onSuccess?.(created);
        onOpenChange?.(false);
      }
    } catch (error: unknown) {
      const err = error as {
        response?: { data?: { message?: string | string[] } };
        message?: string;
      };
      const apiMessage = err?.response?.data?.message || err?.message;
      const displayMessage = Array.isArray(apiMessage)
        ? apiMessage.join(", ")
        : apiMessage || "Có lỗi xảy ra khi lưu người dùng. Vui lòng thử lại!";

      toast.add({
        title: isEdit ? "Cập nhật thất bại" : "Tạo người dùng thất bại",
        description: displayMessage,
        type: "error",
      });
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      trigger={trigger}
      size="4xl"
      title={isEdit ? "Cập nhật người dùng" : "Thêm người dùng mới"}
      description={
        isEdit
          ? `Chỉnh sửa thông tin chi tiết của tài khoản "${user?.fullName}".`
          : "Khởi tạo tài khoản người dùng mới và phân quyền trong hệ thống."
      }
      icon={
        isEdit ? (
          <Pencil className="size-5 text-primary" />
        ) : (
          <UserPlus className="size-5 text-primary" />
        )
      }
      cancelText="Hủy bỏ"
      confirmText={isEdit ? "Lưu thay đổi" : "Tạo người dùng"}
      isLoading={isSubmitting}
      onConfirm={handleSubmit}
    >
      <form
        className="space-y-5 py-2 max-h-[72vh] overflow-y-auto pr-1"
        onSubmit={(e) => e.preventDefault()}
      >
        {/* Avatar Upload Preview */}
        <div className="flex items-center gap-4 p-3 rounded-xl bg-muted/40 border border-border/60">
          <div className="relative group">
            <Avatar
              size="lg"
              className="size-16 border-2 border-border shadow-sm"
            >
              {form.avatarPreview && (
                <AvatarImage
                  src={form.avatarPreview}
                  alt={form.fullName || "Avatar"}
                  className="object-cover"
                />
              )}
              <AvatarFallback className="font-bold text-base bg-primary/10 text-primary">
                {getInitials(form.fullName || form.username)}
              </AvatarFallback>
            </Avatar>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 flex items-center justify-center bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              title="Đổi ảnh đại diện"
            >
              <Camera className="size-5" />
            </button>
          </div>
          <div className="flex flex-col gap-1 min-w-0">
            <span className="text-xs font-semibold text-foreground">
              Ảnh đại diện
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarFileChange}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit text-xs h-7 mt-1 gap-1.5"
              onClick={() => fileInputRef.current?.click()}
            >
              <Camera className="size-3" />
              Tải ảnh lên
            </Button>
          </div>
        </div>

        {/* Thông tin cơ bản: Username & FullName */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="user-username" className="text-xs font-semibold">
              Tên đăng nhập <span className="text-destructive">*</span>
            </Label>
            <Input
              id="user-username"
              placeholder="VD: nguyenvana"
              value={form.username}
              disabled={isEdit}
              onChange={(e) => handleChange("username", e.target.value)}
              className={
                errors.username
                  ? "border-destructive focus-visible:ring-destructive/20"
                  : ""
              }
            />
            {errors.username && (
              <p className="text-[11px] text-destructive">{errors.username}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="user-fullname" className="text-xs font-semibold">
              Họ và tên <span className="text-destructive">*</span>
            </Label>
            <Input
              id="user-fullname"
              placeholder="VD: Nguyễn Văn A"
              value={form.fullName}
              onChange={(e) => handleChange("fullName", e.target.value)}
              className={
                errors.fullName
                  ? "border-destructive focus-visible:ring-destructive/20"
                  : ""
              }
            />
            {errors.fullName && (
              <p className="text-[11px] text-destructive">{errors.fullName}</p>
            )}
          </div>
        </div>

        {/* Email & Phone */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="user-email" className="text-xs font-semibold">
              Email <span className="text-destructive">*</span>
            </Label>
            <Input
              id="user-email"
              type="email"
              placeholder="VD: nguyenvana@example.com"
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
              className={
                errors.email
                  ? "border-destructive focus-visible:ring-destructive/20"
                  : ""
              }
            />
            {errors.email && (
              <p className="text-[11px] text-destructive">{errors.email}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="user-phone" className="text-xs font-semibold">
              Số điện thoại <span className="text-destructive">*</span>
            </Label>
            <Input
              id="user-phone"
              placeholder="VD: 0912345678"
              value={form.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              className={
                errors.phone
                  ? "border-destructive focus-visible:ring-destructive/20"
                  : ""
              }
            />
            {errors.phone && (
              <p className="text-[11px] text-destructive">{errors.phone}</p>
            )}
          </div>
        </div>

        {/* Giới tính & Ngày sinh */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="user-gender" className="text-xs font-semibold">
              Giới tính <span className="text-destructive">*</span>
            </Label>
            <Select
              value={form.gender}
              onValueChange={(val) => handleChange("gender", val ?? "")}
            >
              <SelectTrigger id="user-gender" className="w-full">
                <SelectValue placeholder="Chọn giới tính" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Nam">Nam</SelectItem>
                <SelectItem value="Nữ">Nữ</SelectItem>
                <SelectItem value="Khác">Khác</SelectItem>
              </SelectContent>
            </Select>
            {errors.gender && (
              <p className="text-[11px] text-destructive">{errors.gender}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="user-dob" className="text-xs font-semibold">
              Ngày sinh
            </Label>
            <DateTimePicker
              id="user-dob"
              mode="date"
              format="dd/MM/yyyy"
              placeholder="Chọn ngày sinh"
              value={form.dob || null}
              maxDate={new Date()}
              clearable
              onChange={(date) => {
                handleChange(
                  "dob",
                  date ? date.toISOString().split("T")[0] : "",
                );
              }}
            />
          </div>
        </div>

        {/* Địa chỉ */}
        <div className="space-y-1.5">
          <Label htmlFor="user-address" className="text-xs font-semibold">
            Địa chỉ
          </Label>
          <Input
            id="user-address"
            placeholder="VD: 123 Đường Cầu Giấy, Hà Nội"
            value={form.address}
            onChange={(e) => handleChange("address", e.target.value)}
          />
        </div>

        {/* Mật khẩu khi tạo mới */}
        {!isEdit && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="user-password" className="text-xs font-semibold">
                Mật khẩu <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="user-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Ít nhất 6 ký tự"
                  value={form.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  className={
                    errors.password ? "border-destructive pr-9" : "pr-9"
                  }
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-[11px] text-destructive">
                  {errors.password}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="user-password-confirm"
                className="text-xs font-semibold"
              >
                Nhập lại mật khẩu <span className="text-destructive">*</span>
              </Label>
              <Input
                id="user-password-confirm"
                type={showPassword ? "text" : "password"}
                placeholder="Khớp với mật khẩu trên"
                value={form.passwordConfirm}
                onChange={(e) =>
                  handleChange("passwordConfirm", e.target.value)
                }
                className={errors.passwordConfirm ? "border-destructive" : ""}
              />
              {errors.passwordConfirm && (
                <p className="text-[11px] text-destructive">
                  {errors.passwordConfirm}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Gán vai trò (RoleIds) */}
        <div className="space-y-2 pt-1 border-t border-border/60">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold">
              Gán vai trò <span className="text-destructive">*</span>
            </Label>
            <span className="text-[11px] text-muted-foreground">
              Đã chọn: {form.roleIds.length} vai trò
            </span>
          </div>

          {isLoadingRoles ? (
            <div className="p-3 text-center text-xs text-muted-foreground">
              Đang tải danh sách vai trò...
            </div>
          ) : availableRoles.length === 0 ? (
            <div className="p-3 text-center text-xs text-muted-foreground italic">
              Chưa có vai trò nào trong hệ thống.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 p-2.5 rounded-lg border border-border/70 bg-card">
              {availableRoles.map((role, roleIndex) => {
                const isSelected = form.roleIds.includes(role.id);
                return (
                  <button
                    key={role.id ?? `role-${roleIndex}`}
                    type="button"
                    onClick={() => handleRoleToggle(role.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary shadow-xs"
                        : "bg-background text-muted-foreground hover:bg-muted/70 hover:text-foreground border-border"
                    }`}
                  >
                    {isSelected ? (
                      <Check className="size-3.5 stroke-[2.5]" />
                    ) : (
                      <ShieldCheck className="size-3.5 opacity-60" />
                    )}
                    <span>{role.name}</span>
                  </button>
                );
              })}
            </div>
          )}

          {errors.roleIds && (
            <p className="text-[11px] text-destructive">{errors.roleIds}</p>
          )}
        </div>
      </form>
    </Modal>
  );
}
