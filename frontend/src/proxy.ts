import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Danh sách các public route không yêu cầu đăng nhập
const PUBLIC_ROUTES = ["/login", "/register"];

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const accessToken = request.cookies.get("accessToken")?.value;

  // Kiểm tra route hiện tại có phải là public route không
  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  // 1. Người dùng chưa đăng nhập nhưng cố truy cập vào route được bảo vệ
  if (!accessToken && !isPublicRoute) {
    const returnUrl = encodeURIComponent(`${pathname}${search}`);
    const loginUrl = new URL(`/login?returnUrl=${returnUrl}`, request.url);
    return NextResponse.redirect(loginUrl);
  }

  // 2. Người dùng đã đăng nhập nhưng cố truy cập vào public route (/login, /register)
  if (accessToken && isPublicRoute) {
    const returnUrl = request.nextUrl.searchParams.get("returnUrl");
    const redirectUrl =
      returnUrl && returnUrl.startsWith("/") ? returnUrl : "/";
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  }

  return NextResponse.next();
}

// Cấu hình matcher để bỏ qua các tài nguyên tĩnh và API
export const config = {
  matcher: [
    /*
     * Khớp toàn bộ request paths NGOẠI TRỪ:
     * - /api/* (API routes / rewrites)
     * - /_next/static (static build files)
     * - /_next/image (image optimization files)
     * - /favicon.ico, /robots.txt, /sitemap.xml
     * - Các file tĩnh (ảnh, icon...)
     */
    "/((?!api|uploads|_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
