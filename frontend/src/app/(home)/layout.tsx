import { AppShell } from "@/components/common/app-shell";

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
