import { ProfileForm } from "./_components/profile-form";

export default function PersonalPage() {
  return (
    <main className="flex-1 p-4 md:p-6 lg:p-8 w-full max-w-7xl mx-auto space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          Hồ sơ cá nhân
        </h1>
        <p className="text-sm text-muted-foreground">
          Quản lý thông tin tài khoản, cập nhật ảnh đại diện và hồ sơ người dùng
          của bạn.
        </p>
      </div>

      <ProfileForm />
    </main>
  );
}
