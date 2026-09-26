"use client";

import { useEffect, useRef, useState } from "react";
import {
  Camera,
  Check,
  IdCard,
  Info,
  Loader2,
  Lock,
  RotateCcw,
  Save,
  Shield,
  Upload,
  User,
  X,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DateTimePicker } from "@/components/common/datetime-picker";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { useAuth } from "@/features/auth";
import { formatLocalDate, parseLocalDate } from "@/lib/utils";

export function ProfileForm() {
  const { user, roles, updateProfile, isUpdatingProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<{
    fullName: string;
    email: string;
    phone: string;
    gender: string;
    address: string;
    dob: Date | null;
  }>({
    fullName: "",
    email: "",
    phone: "",
    gender: "Nam",
    address: "",
    dob: null,
  });

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Helper chuẩn hóa URL avatar
  const getAvatarUrl = (path?: string | null) => {
    if (!path) return "";
    if (
      path.startsWith("http://") ||
      path.startsWith("https://") ||
      path.startsWith("blob:")
    ) {
      return path;
    }
    return path.startsWith("/") ? path : `/${path}`;
  };

  // Đồng bộ thông tin user từ store vào form state
  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.fullName || "",
        email: user.email || "",
        phone: user.phone || "",
        gender: user.gender || "Nam",
        address: user.address || "",
        dob: parseLocalDate(user.dob),
      });

      setAvatarPreview(getAvatarUrl(user.avatar));
    }
  }, [user]);

  // Dọn dẹp object URL preview khi unmount hoặc đổi ảnh
  useEffect(() => {
    return () => {
      if (avatarPreview && avatarPreview.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.add({
        title: "File không hợp lệ",
        description: "Vui lòng chọn định dạng file hình ảnh (JPG, PNG, WEBP).",
        type: "warning",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.add({
        title: "File quá lớn",
        description: "Dung lượng ảnh tối đa cho phép là 5MB.",
        type: "warning",
      });
      return;
    }

    if (avatarPreview && avatarPreview.startsWith("blob:")) {
      URL.revokeObjectURL(avatarPreview);
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleCancelAvatar = () => {
    if (avatarPreview && avatarPreview.startsWith("blob:")) {
      URL.revokeObjectURL(avatarPreview);
    }
    setAvatarFile(null);
    setAvatarPreview(getAvatarUrl(user?.avatar));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleReset = () => {
    if (user) {
      setFormData({
        fullName: user.fullName || "",
        email: user.email || "",
        phone: user.phone || "",
        gender: user.gender || "Nam",
        address: user.address || "",
        dob: parseLocalDate(user.dob),
      });

      handleCancelAvatar();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.id) {
      toast.add({
        title: "Lỗi người dùng",
        description: "Không tìm thấy thông tin tài khoản hiện tại.",
        type: "error",
      });
      return;
    }

    if (!formData.fullName.trim() || !formData.email.trim()) {
      toast.add({
        title: "Thiếu thông tin",
        description: "Họ và tên và Email là các thông tin bắt buộc.",
        type: "warning",
      });
      return;
    }

    try {
      const data = new FormData();
      data.append("fullName", formData.fullName.trim());
      data.append("email", formData.email.trim());
      if (formData.phone.trim()) {
        data.append("phone", formData.phone.trim());
      }
      if (formData.gender) {
        data.append("gender", formData.gender);
      }
      if (formData.address.trim()) {
        data.append("address", formData.address.trim());
      }
      if (formData.dob) {
        data.append("dob", formatLocalDate(formData.dob));
      }
      if (avatarFile) {
        data.append("avatar", avatarFile);
      }

      await updateProfile({ id: user.id, data });

      setAvatarFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      toast.add({
        title: "Cập nhật thành công",
        description: "Thông tin hồ sơ và ảnh đại diện đã được lưu thay đổi.",
        type: "success",
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Có lỗi xảy ra khi cập nhật hồ sơ cá nhân.";
      toast.add({
        title: "Cập nhật thất bại",
        description: message,
        type: "error",
      });
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return "U";
    const parts = name.trim().split(" ");
    return parts[parts.length - 1]?.charAt(0).toUpperCase() || "U";
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* ===================== CỘT TRÁI (COL 1-4) ===================== */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Card 1: Ảnh đại diện */}
          <Card className="flex-1 flex flex-col justify-between shadow-xs border-border/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">
                Ảnh đại diện
              </CardTitle>
              <CardDescription className="text-xs">
                Hình ảnh hiển thị nhận diện của bạn trên hệ thống.
              </CardDescription>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col items-center justify-center text-center space-y-3 pt-0 pb-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                className="hidden"
                onChange={handleAvatarSelect}
                disabled={isUpdatingProfile}
              />

              {/* Vùng Avatar kèm nút tròn màu xanh ở góc avatar */}
              <div className="relative inline-block my-2">
                <Avatar
                  className="h-32 w-32 ring-4 ring-muted shadow-md cursor-pointer transition hover:opacity-95"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <AvatarImage
                    src={avatarPreview || ""}
                    alt={formData.fullName || "Avatar"}
                    className="object-cover"
                  />
                  <AvatarFallback className="text-3xl font-bold bg-primary/10 text-primary">
                    {getInitials(formData.fullName)}
                  </AvatarFallback>
                </Avatar>

                {/* Nút upload tròn màu xanh */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUpdatingProfile}
                  className="absolute bottom-0 right-0 size-9 rounded-full bg-blue-600 hover:bg-blue-700 active:scale-95 text-white shadow-md flex items-center justify-center border-2 border-background cursor-pointer transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none"
                  title="Nhấn để thêm hoặc thay đổi ảnh đại diện"
                  aria-label="Thêm hoặc thay đổi ảnh đại diện"
                >
                  <Camera className="size-4" />
                </button>
              </div>

              {/* Trạng thái ảnh khi đã chọn file mới */}
              {avatarFile && (
                <div className="flex flex-col items-center gap-1.5 w-full pt-1">
                  <div className="text-xs text-primary font-medium flex items-center justify-center gap-1 bg-primary/10 px-3 py-1.5 rounded-md w-full">
                    <Check className="size-3.5 shrink-0" />
                    Đã thêm ảnh
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelAvatar}
                    disabled={isUpdatingProfile}
                    className="cursor-pointer text-xs text-destructive hover:text-destructive h-7 px-2"
                  >
                    <X className="size-3.5 mr-1" />
                    Hủy ảnh đã chọn
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card 2: Thông tin hệ thống / Không được sửa */}
          <Card className="flex-1 flex flex-col justify-between shadow-xs border-border/80 bg-muted/20">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Lock className="size-4 text-muted-foreground" />
                <CardTitle className="text-base font-semibold">
                  Thông tin cố định
                </CardTitle>
              </div>
              <CardDescription className="text-xs">
                Thông tin định danh do hệ thống quản lý, không thể tự sửa.
              </CardDescription>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col justify-center space-y-4 pt-0 pb-4">
              {/* Tên đăng nhập */}
              <Field>
                <FieldLabel
                  htmlFor="fixed-username"
                  className="text-xs text-muted-foreground font-medium flex items-center gap-1.5"
                >
                  <User className="size-3.5" />
                  Tên đăng nhập
                </FieldLabel>
                <Input
                  id="fixed-username"
                  value={user?.username || "--"}
                  disabled
                  className="bg-muted/50 font-medium cursor-not-allowed text-foreground"
                />
              </Field>

              {/* Quyền */}
              <Field>
                <FieldLabel
                  htmlFor="fixed-roles"
                  className="text-xs text-muted-foreground font-medium flex items-center gap-1.5"
                >
                  <Shield className="size-3.5" />
                  Quyền
                </FieldLabel>
                <Input
                  id="fixed-roles"
                  value={
                    roles && roles.length > 0
                      ? roles.map((role) => role.name).join(", ")
                      : "Chưa cấp quyền"
                  }
                  disabled
                  className="bg-muted/50 font-medium cursor-not-allowed text-foreground"
                />
              </Field>
            </CardContent>
          </Card>
        </div>

        {/* ===================== CỘT PHẢI (COL 5-12) ===================== */}
        <div className="lg:col-span-8 flex flex-col">
          {/* Card 3: Thông tin cá nhân có thể thay đổi & Nút lưu */}
          <Card className="flex-1 flex flex-col justify-between shadow-xs border-border/80">
            <CardHeader>
              <CardTitle className="text-lg font-bold">
                Thông tin cá nhân
              </CardTitle>
              <CardDescription>
                Cập nhật thông tin liên hệ và chi tiết hồ sơ cá nhân của bạn.
              </CardDescription>
            </CardHeader>

            <CardContent className="flex-1 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                {/* Họ và tên */}
                <Field>
                  <FieldLabel htmlFor="fullName">
                    Họ và tên{" "}
                    <span className="text-destructive font-bold">*</span>
                  </FieldLabel>
                  <Input
                    id="fullName"
                    name="fullName"
                    placeholder="Ví dụ: Nguyễn Văn A"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    disabled={isUpdatingProfile}
                    required
                  />
                </Field>

                {/* Email */}
                <Field>
                  <FieldLabel htmlFor="email">
                    Địa chỉ Email{" "}
                    <span className="text-destructive font-bold">*</span>
                  </FieldLabel>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="email@example.com"
                    value={formData.email}
                    onChange={handleInputChange}
                    disabled={isUpdatingProfile}
                    required
                  />
                </Field>

                {/* Số điện thoại */}
                <Field>
                  <FieldLabel htmlFor="phone">Số điện thoại</FieldLabel>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="0912345678"
                    value={formData.phone}
                    onChange={handleInputChange}
                    disabled={isUpdatingProfile}
                  />
                </Field>

                {/* Giới tính */}
                <Field>
                  <FieldLabel htmlFor="gender">Giới tính</FieldLabel>
                  <Select
                    value={formData.gender}
                    onValueChange={(val) =>
                      setFormData((prev) => ({
                        ...prev,
                        gender: val ?? "Nam",
                      }))
                    }
                    disabled={isUpdatingProfile}
                  >
                    <SelectTrigger id="gender" className="w-full">
                      <SelectValue placeholder="Chọn giới tính" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Nam">Nam</SelectItem>
                      <SelectItem value="Nữ">Nữ</SelectItem>
                      <SelectItem value="Khác">Khác</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                {/* Ngày sinh với DateTimePicker chung */}
                <Field>
                  <FieldLabel htmlFor="dob">Ngày sinh</FieldLabel>
                  <DateTimePicker
                    id="dob"
                    mode="date"
                    format="dd/mm/yyyy"
                    placeholder="Chọn ngày sinh"
                    value={formData.dob}
                    onChange={(date) =>
                      setFormData((prev) => ({ ...prev, dob: date }))
                    }
                    maxDate={new Date()}
                    clearable
                    disabled={isUpdatingProfile}
                  />
                  <FieldDescription>Định dạng: ngày/tháng/năm</FieldDescription>
                </Field>

                {/* Địa chỉ */}
                <Field className="md:col-span-2">
                  <FieldLabel htmlFor="address">Địa chỉ</FieldLabel>
                  <Input
                    id="address"
                    name="address"
                    placeholder="Nhập địa chỉ cư trú của bạn"
                    value={formData.address}
                    onChange={handleInputChange}
                    disabled={isUpdatingProfile}
                  />
                </Field>
              </div>
            </CardContent>

            <CardFooter className="mt-auto flex items-center justify-between border-t border-border/60 px-6 py-4 bg-muted/10">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleReset}
                disabled={isUpdatingProfile}
                className="cursor-pointer gap-1.5 text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="size-4" />
                Đặt lại
              </Button>

              <Button
                type="submit"
                disabled={isUpdatingProfile}
                className="cursor-pointer gap-2 min-w-32"
              >
                {isUpdatingProfile ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <Save className="size-4" />
                    Lưu thay đổi
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </form>
  );
}
