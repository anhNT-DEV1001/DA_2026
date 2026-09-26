"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Eye, EyeOff, Loader2 } from "lucide-react";
import Image from "next/image";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateTimePicker } from "@/components/common/datetime-picker";
import { toast } from "@/components/ui/toast";
import { useAuth } from "@/features/auth";
import { formatLocalDate } from "@/lib/utils";

export function RegisterForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter();
  const { registerMutation } = useAuth();

  const [formData, setFormData] = useState<{
    fullName: string;
    username: string;
    email: string;
    phone: string;
    gender: string;
    dob: Date | null;
    address: string;
    password: string;
    passwordConfirm: string;
  }>({
    fullName: "",
    username: "",
    email: "",
    phone: "",
    gender: "Nam",
    dob: null,
    address: "",
    password: "",
    passwordConfirm: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side validations
    if (
      !formData.fullName.trim() ||
      !formData.username.trim() ||
      !formData.email.trim() ||
      !formData.phone.trim() ||
      !formData.password ||
      !formData.passwordConfirm
    ) {
      toast.add({
        title: "Thiếu thông tin",
        description:
          "Vui lòng điền đầy đủ tất cả các trường có dấu hoa thị (*).",
        type: "warning",
      });
      return;
    }

    if (formData.password.length < 6) {
      toast.add({
        title: "Mật khẩu yếu",
        description: "Mật khẩu phải có ít nhất 6 ký tự.",
        type: "warning",
      });
      return;
    }

    if (formData.password !== formData.passwordConfirm) {
      toast.add({
        title: "Mật khẩu không khớp",
        description: "Mật khẩu xác nhận không trùng khớp.",
        type: "warning",
      });
      return;
    }

    try {
      await registerMutation.mutateAsync({
        fullName: formData.fullName.trim(),
        username: formData.username.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        gender: formData.gender,
        password: formData.password,
        passwordConfirm: formData.passwordConfirm,
        dob: formData.dob ? formatLocalDate(formData.dob) : undefined,
        address: formData.address.trim() || undefined,
      });

      toast.add({
        title: "Thành công",
        description: "Tài khoản của bạn đã được khởi tạo thành công!",
        type: "success",
      });

      setIsSuccess(true);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Đăng ký không thành công. Vui lòng kiểm tra lại thông tin.";

      toast.add({
        title: "Đăng ký thất bại",
        description: message,
        type: "error",
      });
    }
  };

  const isPending = registerMutation.isPending;

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-12">
          {/* Form đăng ký */}
          <div className="p-6 md:p-8 md:col-span-7">
            {isSuccess ? (
              <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
                <div className="rounded-full bg-green-100 p-3 dark:bg-green-900/30">
                  <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
                </div>
                <h2 className="text-2xl font-bold">Đăng ký thành công!</h2>
                <p className="text-muted-foreground text-sm max-w-sm">
                  Tài khoản của bạn đã được khởi tạo thành công trên hệ thống.
                  Vui lòng nhấn xác nhận để chuyển đến trang đăng nhập.
                </p>
                <Button
                  onClick={() => router.push("/login")}
                  className="mt-2 w-full max-w-xs"
                >
                  Xác nhận & Đăng nhập
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <FieldGroup>
                  <div className="flex flex-col items-center gap-2 text-center">
                    <h1 className="text-2xl font-bold">Tạo tài khoản mới</h1>
                  </div>

                  {/* 1. Họ và tên */}
                  <Field>
                    <FieldLabel htmlFor="fullName">
                      Họ và tên{" "}
                      <span className="text-destructive font-bold">*</span>
                    </FieldLabel>
                    <Input
                      id="fullName"
                      name="fullName"
                      type="text"
                      placeholder="Họ và tên đầy đủ"
                      value={formData.fullName}
                      onChange={handleChange}
                      disabled={isPending}
                      required
                    />
                  </Field>

                  {/* 2. Tên đăng nhập */}
                  <Field>
                    <FieldLabel htmlFor="username">
                      Tên đăng nhập{" "}
                      <span className="text-destructive font-bold">*</span>
                    </FieldLabel>
                    <Input
                      id="username"
                      name="username"
                      type="text"
                      placeholder="Tên tài khoản dùng để đăng nhập"
                      value={formData.username}
                      onChange={handleChange}
                      disabled={isPending}
                      required
                    />
                  </Field>

                  {/* 3. Mật khẩu & Xác nhận mật khẩu */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="password">
                        Mật khẩu{" "}
                        <span className="text-destructive font-bold">*</span>
                      </FieldLabel>
                      <div className="relative">
                        <Input
                          id="password"
                          name="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Tối thiểu 6 ký tự"
                          value={formData.password}
                          onChange={handleChange}
                          disabled={isPending}
                          className="pr-9"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors focus:outline-none disabled:pointer-events-none cursor-pointer"
                          tabIndex={-1}
                          aria-label={
                            showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"
                          }
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="passwordConfirm">
                        Xác nhận mật khẩu{" "}
                        <span className="text-destructive font-bold">*</span>
                      </FieldLabel>
                      <div className="relative">
                        <Input
                          id="passwordConfirm"
                          name="passwordConfirm"
                          type={showPasswordConfirm ? "text" : "password"}
                          placeholder="Nhập lại mật khẩu"
                          value={formData.passwordConfirm}
                          onChange={handleChange}
                          disabled={isPending}
                          className="pr-9"
                          required
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowPasswordConfirm((prev) => !prev)
                          }
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors focus:outline-none disabled:pointer-events-none cursor-pointer"
                          tabIndex={-1}
                          aria-label={
                            showPasswordConfirm
                              ? "Ẩn mật khẩu"
                              : "Hiện mật khẩu"
                          }
                        >
                          {showPasswordConfirm ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </Field>
                  </div>

                  {/* 4. Email & Số điện thoại */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="email">
                        Email{" "}
                        <span className="text-destructive font-bold">*</span>
                      </FieldLabel>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="Vui lòng nhập email"
                        value={formData.email}
                        onChange={handleChange}
                        disabled={isPending}
                        required
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="phone">
                        Số điện thoại{" "}
                        <span className="text-destructive font-bold">*</span>
                      </FieldLabel>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        placeholder="Vui lòng nhập số điện thoại"
                        value={formData.phone}
                        onChange={handleChange}
                        disabled={isPending}
                        required
                      />
                    </Field>
                  </div>

                  {/* 5. Giới tính & Ngày sinh (dob) */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="gender">
                        Giới tính{" "}
                        <span className="text-destructive font-bold">*</span>
                      </FieldLabel>
                      <Select
                        value={formData.gender}
                        onValueChange={(val) =>
                          setFormData((prev) => ({
                            ...prev,
                            gender: val ?? "Nam",
                          }))
                        }
                        disabled={isPending}
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

                    <Field>
                      <FieldLabel htmlFor="dob">Ngày sinh</FieldLabel>
                      <DateTimePicker
                        id="dob"
                        mode="date"
                        format="dd/mm/yyyy"
                        placeholder="dd/mm/yyyy"
                        value={formData.dob}
                        onChange={(date) =>
                          setFormData((prev) => ({ ...prev, dob: date }))
                        }
                        disabled={isPending}
                      />
                    </Field>
                  </div>

                  {/* 6. Địa chỉ */}
                  <Field>
                    <FieldLabel htmlFor="address">Địa chỉ</FieldLabel>
                    <Input
                      id="address"
                      name="address"
                      type="text"
                      placeholder="Địa chỉ của bạn"
                      value={formData.address}
                      onChange={handleChange}
                      disabled={isPending}
                    />
                  </Field>

                  <Field>
                    <Button
                      type="submit"
                      className="w-full mt-2"
                      disabled={isPending}
                    >
                      {isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Đang tạo tài khoản...
                        </>
                      ) : (
                        "Đăng ký tài khoản"
                      )}
                    </Button>
                  </Field>

                  <FieldDescription className="text-center">
                    Đã có tài khoản?{" "}
                    <Link
                      href="/login"
                      className="font-medium text-primary underline underline-offset-4 hover:opacity-80"
                    >
                      Đăng nhập ngay
                    </Link>
                  </FieldDescription>
                </FieldGroup>
              </form>
            )}
          </div>

          {/* Banner giới thiệu bên phải */}
          <div className="relative hidden bg-muted md:block md:col-span-5">
            <div className="absolute inset-0 flex flex-col justify-end p-8 bg-gradient-to-t from-black/85 via-black/40 to-transparent text-white z-10">
              <h2 className="text-xl font-bold">
                Bắt đầu quản lý công việc của bạn
              </h2>
              <p className="text-sm text-gray-200 mt-2 leading-relaxed">
                Tối ưu hóa quy trình làm việc, trải nghiệm AI mới.
              </p>
            </div>
            <Image
              src="/register.jpg"
              alt="Register Visual"
              fill
              className="object-cover dark:brightness-[0.7]"
              priority
            />
          </div>
        </CardContent>
      </Card>

      <FieldDescription className="px-6 text-center text-xs text-muted-foreground">
        Bằng cách đăng ký, bạn đồng ý tuân thủ{" "}
        <a href="#" className="underline">
          Quy chế hệ thống
        </a>{" "}
        và{" "}
        <a href="#" className="underline">
          Chính sách bảo mật
        </a>
        .
      </FieldDescription>
    </div>
  );
}
