"use client";

import * as React from "react";
import {
  format as dateFnsFormat,
  isValid,
  setHours,
  setMinutes,
  setSeconds,
  setMonth,
  setYear,
  getYear,
  getMonth,
  getDate,
  getHours,
  getMinutes,
  getSeconds,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
} from "date-fns";
import { vi } from "date-fns/locale";
import {
  Calendar as CalendarIcon,
  Clock,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  RotateCcw,
  Check,
} from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";

export type DateTimePickerMode =
  | "date"
  | "month"
  | "year"
  | "datetime"
  | "time";

export interface DateTimePickerProps {
  value?: Date | string | null;
  onChange?: (date: Date | null, formattedValue: string) => void;
  mode?: DateTimePickerMode;
  format?: string;
  showSeconds?: boolean;
  placeholder?: string;
  disabled?: boolean;
  clearable?: boolean;
  minDate?: Date;
  maxDate?: Date;
  className?: string;
  name?: string;
  id?: string;
}

// Chuẩn hóa chuỗi định dạng (ví dụ: dd/mm/yyyy -> dd/MM/yyyy cho date-fns)
function resolveFormat(
  mode: DateTimePickerMode,
  customFormat?: string,
  showSeconds?: boolean,
): string {
  if (customFormat) {
    let fmt = customFormat;
    // Tự động sửa các lỗi format phổ biến người dùng hay gõ
    if (/dd\/mm\/yyyy/i.test(fmt))
      fmt = fmt.replace(/dd\/mm\/yyyy/i, "dd/MM/yyyy");
    if (/mm\/yyyy/i.test(fmt)) fmt = fmt.replace(/mm\/yyyy/i, "MM/yyyy");
    if (/hh:mm:ss/i.test(fmt)) fmt = fmt.replace(/hh:mm:ss/i, "HH:mm:ss");
    if (/hh:mm/i.test(fmt)) fmt = fmt.replace(/hh:mm/i, "HH:mm");
    return fmt;
  }

  switch (mode) {
    case "month":
      return "MM/yyyy";
    case "year":
      return "yyyy";
    case "datetime":
      return showSeconds ? "dd/MM/yyyy HH:mm:ss" : "dd/MM/yyyy HH:mm";
    case "time":
      return showSeconds ? "HH:mm:ss" : "HH:mm";
    case "date":
    default:
      return "dd/MM/yyyy";
  }
}

// Parse value từ prop Date hoặc string
function parseValue(val?: Date | string | null): Date | null {
  if (!val) return null;
  if (val instanceof Date) return isValid(val) ? val : null;
  if (typeof val === "string") {
    const datePart = val.split("T")[0];
    const parts = datePart.split("-").map(Number);
    if (parts.length === 3 && !parts.some(isNaN)) {
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      if (isValid(d)) return d;
    }
  }
  const d = new Date(val);
  return isValid(d) ? d : null;
}

const MONTH_NAMES = [
  "Tháng 1",
  "Tháng 2",
  "Tháng 3",
  "Tháng 4",
  "Tháng 5",
  "Tháng 6",
  "Tháng 7",
  "Tháng 8",
  "Tháng 9",
  "Tháng 10",
  "Tháng 11",
  "Tháng 12",
];

const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

export function DateTimePicker({
  value,
  onChange,
  mode = "date",
  format: propFormat,
  showSeconds = false,
  placeholder,
  disabled = false,
  clearable = true,
  minDate,
  maxDate,
  className,
  id,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false);

  // Ngày hiện thời đang được chọn
  const selectedDate = React.useMemo(() => parseValue(value), [value]);

  // Ngày đang duyệt trên giao diện lịch
  const [viewDate, setViewDate] = React.useState<Date>(
    () => selectedDate || new Date(),
  );

  // Tab view: "calendar" | "month" | "year" | "time"
  const [currentView, setCurrentView] = React.useState<
    "calendar" | "month" | "year" | "time"
  >(() => {
    if (mode === "year") return "year";
    if (mode === "month") return "month";
    if (mode === "time") return "time";
    return "calendar";
  });

  // Mobile tab khi ở chế độ datetime: "date" | "time"
  const [activeTab, setActiveTab] = React.useState<"date" | "time">("date");

  // Format thực tế
  const actualFormat = React.useMemo(
    () => resolveFormat(mode, propFormat, showSeconds),
    [mode, propFormat, showSeconds],
  );

  // Placeholder mặc định
  const defaultPlaceholder = React.useMemo(() => {
    if (placeholder) return placeholder;
    switch (mode) {
      case "month":
        return "Chọn tháng (MM/yyyy)";
      case "year":
        return "Chọn năm (yyyy)";
      case "datetime":
        return showSeconds ? "dd/mm/yyyy hh:mm:ss" : "dd/mm/yyyy hh:mm";
      case "time":
        return showSeconds ? "hh:mm:ss" : "hh:mm";
      case "date":
      default:
        return "Chọn ngày (dd/mm/yyyy)";
    }
  }, [mode, placeholder, showSeconds]);

  const isDateDisabled = React.useCallback(
    (day: Date) => {
      if (minDate && day < minDate) return true;
      if (maxDate && day > maxDate) return true;
      return false;
    },
    [minDate, maxDate],
  );

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setViewDate(selectedDate || new Date());
      if (mode === "year") setCurrentView("year");
      else if (mode === "month") setCurrentView("month");
      else if (mode === "time") setCurrentView("time");
      else setCurrentView("calendar");
      setActiveTab("date");
    }
    setOpen(nextOpen);
  };

  // Cập nhật giá trị
  const handleSelectDate = (newDate: Date | null) => {
    if (!newDate) {
      onChange?.(null, "");
      return;
    }

    let resultDate = newDate;

    // Giữ lại giờ phút giây nếu ở chế độ datetime
    if (mode === "datetime" && selectedDate) {
      resultDate = setHours(resultDate, getHours(selectedDate));
      resultDate = setMinutes(resultDate, getMinutes(selectedDate));
      resultDate = setSeconds(resultDate, getSeconds(selectedDate));
    }

    const formatted = dateFnsFormat(resultDate, actualFormat, { locale: vi });
    onChange?.(resultDate, formatted);

    // Tự động đóng nếu là date/month/year đơn thuần
    if (mode === "date" || mode === "month" || mode === "year") {
      setOpen(false);
    }
  };

  // Cập nhật Time (Giờ, Phút, Giây)
  const handleTimeChange = (
    type: "hour" | "minute" | "second",
    val: number,
  ) => {
    const base = selectedDate || new Date();
    let updated: Date;
    if (type === "hour") updated = setHours(base, val);
    else if (type === "minute") updated = setMinutes(base, val);
    else updated = setSeconds(base, val);

    const formatted = dateFnsFormat(updated, actualFormat, { locale: vi });
    onChange?.(updated, formatted);
  };

  // Chọn Hôm nay / Bây giờ
  const handleNow = () => {
    const now = new Date();
    setViewDate(now);
    const formatted = dateFnsFormat(now, actualFormat, { locale: vi });
    onChange?.(now, formatted);
    if (mode !== "datetime") {
      setOpen(false);
    }
  };

  // Xóa giá trị
  const handleClear = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    onChange?.(null, "");
  };

  // Danh sách các ngày trong tháng hiện tại
  const calendarDays = React.useMemo(() => {
    const start = startOfWeek(startOfMonth(viewDate), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(viewDate), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [viewDate]);

  // Hiển thị text trigger
  const displayValue = React.useMemo(() => {
    if (!selectedDate) return "";
    try {
      return dateFnsFormat(selectedDate, actualFormat, { locale: vi });
    } catch {
      return "";
    }
  }, [selectedDate, actualFormat]);

  // Danh sách năm (1950 - 2050)
  const years = React.useMemo(() => {
    const currentYear = getYear(viewDate);
    const startYear = Math.max(1940, currentYear - 50);
    const endYear = Math.min(2070, currentYear + 50);
    const list: number[] = [];
    for (let y = startYear; y <= endYear; y++) {
      list.push(y);
    }
    return list;
  }, [viewDate]);

  // Scroll đến năm hiện tại trong danh sách năm
  const yearContainerRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (currentView === "year" && yearContainerRef.current) {
      const activeEl = yearContainerRef.current.querySelector(
        "[data-selected='true']",
      );
      if (activeEl) {
        activeEl.scrollIntoView({ block: "center" });
      }
    }
  }, [currentView]);

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <button
            type="button"
            id={id}
            disabled={disabled}
            className={cn(
              "flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors outline-none hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
              !displayValue && "text-muted-foreground",
              className,
            )}
          >
            <div className="flex items-center gap-2 truncate">
              {mode === "time" ? (
                <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
              ) : (
                <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <span className="truncate">
                {displayValue || defaultPlaceholder}
              </span>
            </div>

            <div className="flex items-center gap-1.5 pl-2">
              {clearable && displayValue && !disabled && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={handleClear}
                  onKeyDown={(e) => e.key === "Enter" && handleClear()}
                  className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                  title="Xóa lựa chọn"
                >
                  <X className="h-3.5 w-3.5" />
                </span>
              )}
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground opacity-60" />
            </div>
          </button>
        }
      />

      <PopoverContent
        align="start"
        className="w-auto p-0 shadow-lg border rounded-lg bg-popover text-popover-foreground overflow-hidden"
      >
        {/* Mobile Tabs cho mode datetime */}
        {mode === "datetime" && (
          <div className="flex border-b text-xs font-medium md:hidden">
            <button
              type="button"
              onClick={() => setActiveTab("date")}
              className={cn(
                "flex-1 py-2 text-center transition-colors flex items-center justify-center gap-1.5",
                activeTab === "date"
                  ? "border-b-2 border-primary text-primary font-semibold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <CalendarIcon className="h-3.5 w-3.5" />
              Ngày
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("time")}
              className={cn(
                "flex-1 py-2 text-center transition-colors flex items-center justify-center gap-1.5",
                activeTab === "time"
                  ? "border-b-2 border-primary text-primary font-semibold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Clock className="h-3.5 w-3.5" />
              Giờ
            </button>
          </div>
        )}

        <div className="flex flex-col md:flex-row">
          {/* PHẦN 1: BỘ CHỌN LỊCH NGÀY/THÁNG/NĂM */}
          {mode !== "time" && (
            <div
              className={cn(
                "p-3 w-[300px]",
                mode === "datetime" &&
                  activeTab !== "date" &&
                  "hidden md:block",
              )}
            >
              {/* MUI-STYLE HEADER & VIEW SWITCHER */}
              <div className="flex items-center justify-between pb-2 mb-1 border-b">
                <button
                  type="button"
                  onClick={() => {
                    if (currentView === "calendar") setCurrentView("month");
                    else if (currentView === "month") setCurrentView("year");
                    else setCurrentView("calendar");
                  }}
                  className="flex items-center gap-1.5 font-semibold text-sm px-2 py-1 rounded-md hover:bg-accent transition-colors"
                >
                  <span>
                    {currentView === "year"
                      ? `Năm ${getYear(viewDate)}`
                      : currentView === "month"
                        ? `Năm ${getYear(viewDate)}`
                        : `${MONTH_NAMES[getMonth(viewDate)]}, ${getYear(viewDate)}`}
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200",
                      currentView !== "calendar" && "rotate-180",
                    )}
                  />
                </button>

                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => {
                      if (currentView === "year") {
                        setViewDate(subMonths(viewDate, 120)); // Lùi 10 năm
                      } else if (currentView === "month") {
                        setViewDate(subMonths(viewDate, 12)); // Lùi 1 năm
                      } else {
                        setViewDate(subMonths(viewDate, 1)); // Lùi 1 tháng
                      }
                    }}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => {
                      if (currentView === "year") {
                        setViewDate(addMonths(viewDate, 120)); // Tiến 10 năm
                      } else if (currentView === "month") {
                        setViewDate(addMonths(viewDate, 12)); // Tiến 1 năm
                      } else {
                        setViewDate(addMonths(viewDate, 1)); // Tiến 1 tháng
                      }
                    }}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* VIEW 1: LƯỚI NGÀY (CALENDAR VIEW) */}
              {currentView === "calendar" && (
                <div>
                  {/* Header thứ trong tuần */}
                  <div className="grid grid-cols-7 mb-1 text-center text-xs font-medium text-muted-foreground">
                    {WEEKDAYS.map((w) => (
                      <div
                        key={w}
                        className="h-8 flex items-center justify-center"
                      >
                        {w}
                      </div>
                    ))}
                  </div>

                  {/* Lưới các ô ngày */}
                  <div className="grid grid-cols-7 gap-1">
                    {calendarDays.map((day) => {
                      const isCurrentMonth = isSameMonth(day, viewDate);
                      const isSelected = selectedDate
                        ? isSameDay(day, selectedDate)
                        : false;
                      const isTodayDate = isToday(day);
                      const disabledDay = isDateDisabled(day);

                      return (
                        <button
                          key={day.toISOString()}
                          type="button"
                          disabled={disabledDay}
                          onClick={() => !disabledDay && handleSelectDate(day)}
                          className={cn(
                            "h-8 w-8 rounded-md text-xs font-normal transition-colors flex items-center justify-center select-none cursor-pointer",
                            !isCurrentMonth && "text-muted-foreground/35",
                            isCurrentMonth &&
                              !isSelected &&
                              !disabledDay &&
                              "hover:bg-accent hover:text-accent-foreground",
                            isTodayDate &&
                              !isSelected &&
                              !disabledDay &&
                              "border border-primary text-primary font-semibold",
                            isSelected &&
                              "bg-primary text-primary-foreground font-semibold hover:bg-primary/90",
                            disabledDay &&
                              "opacity-30 cursor-not-allowed pointer-events-none",
                          )}
                        >
                          {getDate(day)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* VIEW 2: LƯỚI THÁNG (MONTH PICKER) */}
              {currentView === "month" && (
                <div className="grid grid-cols-3 gap-2 py-2">
                  {MONTH_NAMES.map((name, index) => {
                    const isSelected =
                      selectedDate &&
                      getMonth(selectedDate) === index &&
                      getYear(selectedDate) === getYear(viewDate);
                    const isCurrent =
                      getMonth(new Date()) === index &&
                      getYear(new Date()) === getYear(viewDate);

                    return (
                      <Button
                        key={name}
                        type="button"
                        variant={isSelected ? "default" : "ghost"}
                        size="sm"
                        onClick={() => {
                          const updated = setMonth(viewDate, index);
                          setViewDate(updated);
                          if (mode === "month") {
                            handleSelectDate(updated);
                          } else {
                            setCurrentView("calendar");
                          }
                        }}
                        className={cn(
                          "h-10 text-xs font-normal",
                          isCurrent &&
                            !isSelected &&
                            "border border-primary/50 text-primary font-medium",
                          isSelected && "font-semibold shadow-xs",
                        )}
                      >
                        {name}
                      </Button>
                    );
                  })}
                </div>
              )}

              {/* VIEW 3: LƯỚI NĂM (YEAR PICKER - MUI SCROLL STYLE) */}
              {currentView === "year" && (
                <div
                  ref={yearContainerRef}
                  className="grid grid-cols-4 gap-2 py-2 max-h-[240px] overflow-y-auto pr-1"
                >
                  {years.map((y) => {
                    const isSelected =
                      selectedDate && getYear(selectedDate) === y;
                    const isCurrent = getYear(new Date()) === y;

                    return (
                      <Button
                        key={y}
                        type="button"
                        variant={isSelected ? "default" : "ghost"}
                        size="sm"
                        data-selected={isSelected}
                        onClick={() => {
                          const updated = setYear(viewDate, y);
                          setViewDate(updated);
                          if (mode === "year") {
                            handleSelectDate(updated);
                          } else {
                            setCurrentView("month");
                          }
                        }}
                        className={cn(
                          "h-9 text-xs font-normal",
                          isCurrent &&
                            !isSelected &&
                            "border border-primary/50 text-primary font-medium",
                          isSelected && "font-semibold shadow-xs",
                        )}
                      >
                        {y}
                      </Button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* PHÂN CÁCH GIỮA LỊCH VÀ BỘ CHỌN GIỜ */}
          {mode === "datetime" && (
            <Separator
              orientation="vertical"
              className="hidden md:block h-auto"
            />
          )}

          {/* PHẦN 2: BỘ CHỌN GIỜ KỸ THUẬT SỐ (DIGITAL TIME PICKER COLUMNS) */}
          {(mode === "time" || mode === "datetime") && (
            <div
              className={cn(
                "p-3 flex flex-col justify-between",
                mode === "datetime" && activeTab !== "time" && "hidden md:flex",
              )}
            >
              {/* Header hiển thị giờ số lớn */}
              <div className="flex items-center justify-center gap-1.5 pb-2 border-b font-mono font-bold text-sm tracking-wider text-primary">
                <Clock className="h-4 w-4 mr-1 text-muted-foreground" />
                <span>
                  {String(getHours(selectedDate || viewDate)).padStart(2, "0")}
                </span>
                <span>:</span>
                <span>
                  {String(getMinutes(selectedDate || viewDate)).padStart(
                    2,
                    "0",
                  )}
                </span>
                {showSeconds && (
                  <>
                    <span>:</span>
                    <span>
                      {String(getSeconds(selectedDate || viewDate)).padStart(
                        2,
                        "0",
                      )}
                    </span>
                  </>
                )}
              </div>

              {/* Các cột số cuộn được */}
              <div className="flex gap-2 pt-2">
                {/* Cột Giờ (00 - 23) */}
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-semibold uppercase text-muted-foreground pb-1">
                    Giờ
                  </span>
                  <div className="h-[210px] w-12 overflow-y-auto rounded-md border p-1 flex flex-col gap-1 text-center scroll-smooth">
                    {Array.from({ length: 24 }).map((_, h) => {
                      const isSelected =
                        selectedDate && getHours(selectedDate) === h;
                      return (
                        <button
                          key={h}
                          type="button"
                          onClick={() => handleTimeChange("hour", h)}
                          className={cn(
                            "h-7 w-full rounded text-xs transition-colors flex items-center justify-center cursor-pointer",
                            isSelected
                              ? "bg-primary text-primary-foreground font-semibold"
                              : "hover:bg-muted text-muted-foreground hover:text-foreground",
                          )}
                        >
                          {String(h).padStart(2, "0")}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Cột Phút (00 - 59) */}
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-semibold uppercase text-muted-foreground pb-1">
                    Phút
                  </span>
                  <div className="h-[210px] w-12 overflow-y-auto rounded-md border p-1 flex flex-col gap-1 text-center scroll-smooth">
                    {Array.from({ length: 60 }).map((_, m) => {
                      const isSelected =
                        selectedDate && getMinutes(selectedDate) === m;
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => handleTimeChange("minute", m)}
                          className={cn(
                            "h-7 w-full rounded text-xs transition-colors flex items-center justify-center cursor-pointer",
                            isSelected
                              ? "bg-primary text-primary-foreground font-semibold"
                              : "hover:bg-muted text-muted-foreground hover:text-foreground",
                          )}
                        >
                          {String(m).padStart(2, "0")}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Cột Giây (00 - 59) - Tuỳ chọn theo showSeconds */}
                {showSeconds && (
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-semibold uppercase text-muted-foreground pb-1">
                      Giây
                    </span>
                    <div className="h-[210px] w-12 overflow-y-auto rounded-md border p-1 flex flex-col gap-1 text-center scroll-smooth">
                      {Array.from({ length: 60 }).map((_, s) => {
                        const isSelected =
                          selectedDate && getSeconds(selectedDate) === s;
                        return (
                          <button
                            key={s}
                            type="button"
                            onClick={() => handleTimeChange("second", s)}
                            className={cn(
                              "h-7 w-full rounded text-xs transition-colors flex items-center justify-center cursor-pointer",
                              isSelected
                                ? "bg-primary text-primary-foreground font-semibold"
                                : "hover:bg-muted text-muted-foreground hover:text-foreground",
                            )}
                          >
                            {String(s).padStart(2, "0")}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* PHẦN 3: ACTION BAR DƯỚI ĐÁY (MUI STYLE) */}
        <div className="flex items-center justify-between border-t bg-muted/20 px-3 py-2 text-xs">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleNow}
            className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            {mode === "time" ? "Hiện tại" : "Hôm nay"}
          </Button>

          <div className="flex items-center gap-1.5">
            {clearable && selectedDate && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleClear()}
                className="h-7 text-xs px-2 text-destructive hover:bg-destructive/10"
              >
                Xóa
              </Button>
            )}
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => setOpen(false)}
              className="h-7 text-xs px-3 font-medium"
            >
              <Check className="h-3 w-3 mr-1" />
              Xác nhận
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
