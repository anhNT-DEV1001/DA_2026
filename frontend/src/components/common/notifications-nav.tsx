"use client";

import * as React from "react";
import { Bell } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";

export function NotificationsNav() {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className="size-8 text-muted-foreground hover:text-foreground relative cursor-pointer"
            title="Thông báo"
          >
            <Bell className="size-4" />
            <span className="sr-only">Thông báo</span>
          </Button>
        }
      />
      <PopoverContent align="end" className="w-80 p-0">
        <PopoverHeader className="p-3 border-b">
          <div className="flex items-center justify-between">
            <PopoverTitle className="text-sm font-semibold">
              Thông báo
            </PopoverTitle>
          </div>
        </PopoverHeader>
        <div className="p-6 text-center text-sm text-muted-foreground">
          Chưa có thông báo mới nào
        </div>
      </PopoverContent>
    </Popover>
  );
}
