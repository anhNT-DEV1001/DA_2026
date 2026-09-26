"use client";

import * as React from "react";
import { DynamicIcon, iconNames, type IconName } from "lucide-react/dynamic";
import { Folder } from "lucide-react";

export interface MenuIconProps extends Omit<
  React.SVGProps<SVGSVGElement>,
  "name"
> {
  name?: string | null;
  className?: string;
  size?: number;
}

function normalizeIconName(name?: string | null): IconName | null {
  if (!name || typeof name !== "string") return null;

  // Xử lý các hậu tố thường gặp: user-icon, user_icon, UserIcon
  let cleaned = name.replace(/[-_]?icon$/i, "").trim();

  // Chuyển PascalCase hoặc camelCase thành kebab-case (VD: LayoutDashboard -> layout-dashboard)
  cleaned = cleaned
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();

  if (iconNames.includes(cleaned as IconName)) {
    return cleaned as IconName;
  }

  return null;
}

export function MenuIcon({
  name,
  className = "size-4",
  size,
  ...props
}: MenuIconProps) {
  const iconName = normalizeIconName(name);

  if (!iconName) {
    return (
      <Folder
        className={className}
        size={size}
        {...(props as React.ComponentProps<typeof Folder>)}
      />
    );
  }

  return (
    <DynamicIcon
      name={iconName}
      className={className}
      size={size}
      fallback={() => (
        <Folder
          className={className}
          size={size}
          {...(props as React.ComponentProps<typeof Folder>)}
        />
      )}
      {...props}
    />
  );
}
