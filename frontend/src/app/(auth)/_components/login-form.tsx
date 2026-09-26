"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
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
import { toast } from "@/components/ui/toast";
import { useAuth } from "@/features/auth";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loginMutation } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim() || !password) {
      toast.add({
        title: "Thiếu thông tin",
        description: "Vui lòng điền đầy đủ tên đăng nhập và mật khẩu.",
        type: "warning",
      });
      return;
    }

    try {
      await loginMutation.mutateAsync({
        username: username.trim(),
        password,
      });

      toast.add({
        title: "Thành công",
        description: "Đăng nhập thành công!",
        type: "success",
      });

      const returnUrl = searchParams.get("returnUrl");
      const redirectTarget =
        returnUrl && returnUrl.startsWith("/") ? returnUrl : "/";

      router.push(redirectTarget);
      router.refresh();
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.";

      toast.add({
        title: "Đăng nhập thất bại",
        description: message,
        type: "error",
      });
    }
  };

  const isPending = loginMutation.isPending;

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form className="p-6 md:p-8" onSubmit={handleSubmit}>
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">Chào mừng trở lại</h1>
                <p className="text-balance text-muted-foreground text-sm">
                  Đăng nhập vào tài khoản hệ thống của bạn
                </p>
              </div>

              <Field>
                <FieldLabel htmlFor="username">
                  Tên đăng nhập{" "}
                  <span className="text-destructive font-bold">*</span>
                </FieldLabel>
                <Input
                  id="username"
                  type="text"
                  placeholder="Nhập tên đăng nhập"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isPending}
                  required
                />
              </Field>

              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">
                    Mật khẩu{" "}
                    <span className="text-destructive font-bold">*</span>
                  </FieldLabel>
                  {/* <a
                    href="#"
                    className="ml-auto text-sm underline-offset-2 hover:underline text-muted-foreground"
                  >
                    Quên mật khẩu?
                  </a> */}
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Nhập mật khẩu"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isPending}
                    className="pr-9"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors focus:outline-none disabled:pointer-events-none cursor-pointer"
                    tabIndex={-1}
                    aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
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
                <Button type="submit" className="w-full" disabled={isPending}>
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang xử lý...
                    </>
                  ) : (
                    "Đăng nhập"
                  )}
                </Button>
              </Field>

              <FieldDescription className="text-center">
                Chưa có tài khoản?{" "}
                <Link
                  href="/register"
                  className="font-medium text-primary underline underline-offset-4 hover:opacity-80"
                >
                  Đăng ký ngay
                </Link>
              </FieldDescription>
            </FieldGroup>
          </form>

          <div className="relative hidden bg-muted md:block">
            <div className="absolute inset-0 flex flex-col justify-end p-8 bg-gradient-to-t from-black/80 via-black/40 to-transparent text-white z-10">
              <h2 className="text-xl font-bold">DA Workspace</h2>
              <p className="text-sm text-gray-200 mt-1">
                Hệ thống quản lý công việc thông minh
              </p>
            </div>
            <Image
              src="/login.jpg"
              alt="Workspace Auth"
              fill
              className="object-cover dark:brightness-[0.7]"
              priority
            />
          </div>
        </CardContent>
      </Card>

      <FieldDescription className="px-6 text-center text-xs text-muted-foreground">
        Bằng cách tiếp tục, bạn đồng ý với{" "}
        <a href="#" className="underline">
          Điều khoản dịch vụ
        </a>{" "}
        và{" "}
        <a href="#" className="underline">
          Chính sách bảo mật
        </a>{" "}
        của chúng tôi.
      </FieldDescription>
    </div>
  );
}
