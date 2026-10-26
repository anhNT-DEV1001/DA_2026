import { StickyBoard } from "@/features/notes";

export default function NotePage() {
  return (
    <main className="flex-1 p-4 md:p-6 lg:p-8 w-full max-w-7xl mx-auto space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          Ghi chú
        </h1>
        <p className="text-sm text-muted-foreground">
          Quản lý ghi chú của bạn, tạo, chỉnh sửa và xóa ghi chú một cách dễ dàng.
        </p>
      </div>

      <StickyBoard />
    </main>
  );
}
