"use client";

import * as React from "react";
import {
  EditorContent,
  Extension,
  useEditor,
  useEditorState,
  type Editor,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { Placeholder } from "@tiptap/extensions";
import {
  Bold,
  Code,
  Heading2,
  ImagePlus,
  Italic,
  Link2,
  Loader2,
  List,
  ListOrdered,
  Quote,
  Strikethrough,
  Underline,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { Modal } from "@/components/common/modal";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

/** Các extension dùng chung cho cả soạn thảo và hiển thị */
function extensions(placeholder?: string) {
  return [
    StarterKit.configure({
      heading: { levels: [2, 3] },
      horizontalRule: false,
      link: {
        openOnClick: false,
        autolink: true,
        defaultProtocol: "https",
        HTMLAttributes: { target: "_blank", rel: "noopener noreferrer nofollow" },
      },
    }),
    Image.configure({ HTMLAttributes: { loading: "lazy" } }),
    ...(placeholder ? [Placeholder.configure({ placeholder })] : []),
  ];
}

/**
 * Dùng khi Enter là phím gửi: Ctrl/Cmd + Enter xuống dòng giống Enter thường
 * (tách đoạn, thêm mục danh sách…). Shift + Enter giữ mặc định (ngắt dòng trong đoạn).
 */
const ModEnterNewLine = Extension.create({
  name: "modEnterNewLine",
  // Chạy trước Mod-Enter mặc định của HardBreak
  priority: 1000,
  addKeyboardShortcuts() {
    return {
      "Mod-Enter": () =>
          this.editor.commands.first(({ commands }) => [
            () => commands.newlineInCode(),
            () => commands.splitListItem("listItem"),
            () => commands.createParagraphNear(),
            () => commands.liftEmptyBlock(),
            () => commands.splitBlock(),
          ]),
    };
  },
});

/** Ảnh hợp lệ trong danh sách file (dán / kéo thả / chọn file) */
function imageFiles(files: FileList | null | undefined): File[] {
  return Array.from(files ?? []).filter((file) =>
    file.type.startsWith("image/"),
  );
}

const escapeHtml = (text: string) =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** Chuyển nội dung cũ (text thuần) thành HTML để editor hiển thị đúng xuống dòng */
export function toRichHtml(value: string | null | undefined): string {
  if (!value) return "";
  if (/<\/?[a-z][\s\S]*>/i.test(value)) return value;
  return value
    .split(/\r?\n/)
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join("");
}

/** Text thuần từ HTML (dùng cho lịch sử, xem trước…) */
export function htmlToText(value: string | null | undefined): string {
  if (!value) return "";
  if (typeof DOMParser === "undefined") return value.replace(/<[^>]*>/g, " ");
  const doc = new DOMParser().parseFromString(
    value.replace(/<\/(p|li|h[1-6]|blockquote|pre)>/gi, "$&\n"),
    "text/html",
  );
  return (doc.body.textContent ?? "").trim();
}

/** HTML của editor; rỗng thì trả về "" thay vì "<p></p>" */
export function getEditorHtml(editor: Editor): string {
  return editor.isEmpty ? "" : editor.getHTML();
}

type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  /** Ctrl/Cmd + Enter (hoặc Enter nếu bật `submitOnEnter`) */
  onSubmit?: () => void;
  /** Enter để gửi, Ctrl/Cmd + Enter để xuống dòng (kiểu khung chat) */
  submitOnEnter?: boolean;
  /** Vị trí thanh công cụ, mặc định ở trên */
  toolbarPosition?: "top" | "bottom";
  /** Nội dung đặt cuối thanh công cụ (vd: nút gửi) */
  toolbarEnd?: React.ReactNode;
  onFocus?: () => void;
  /** Tải ảnh lên và trả về URL; không truyền thì editor không cho chèn ảnh */
  onUploadImage?: (file: File) => Promise<string>;
  className?: string;
  contentClassName?: string;
  "aria-label"?: string;
};

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  disabled,
  autoFocus,
  onSubmit,
  submitOnEnter: enterToSubmit = false,
  toolbarPosition = "top",
  toolbarEnd,
  onFocus,
  onUploadImage,
  className,
  contentClassName,
  ...props
}: RichTextEditorProps) {
  // Ref để callback của editor luôn đọc hàm mới nhất
  const onChangeRef = React.useRef(onChange);
  const onSubmitRef = React.useRef(onSubmit);
  const onFocusRef = React.useRef(onFocus);
  const uploadRef = React.useRef<(files: File[]) => boolean>(() => false);
  const [uploading, setUploading] = React.useState(0);
  React.useEffect(() => {
    onChangeRef.current = onChange;
    onSubmitRef.current = onSubmit;
    onFocusRef.current = onFocus;
  });

  const editor = useEditor({
    immediatelyRender: false,
    editable: !disabled,
    autofocus: autoFocus ? "end" : false,
    extensions: [
      ...extensions(placeholder),
      ...(enterToSubmit ? [ModEnterNewLine] : []),
    ],
    content: toRichHtml(value),
    editorProps: {
      attributes: {
        class: cn(
          "rich-text min-h-24 px-3 py-2 text-sm outline-none",
          contentClassName,
        ),
        ...(props["aria-label"] ? { "aria-label": props["aria-label"] } : {}),
      },
      handlePaste: (_, event) =>
        uploadRef.current(imageFiles(event.clipboardData?.files)),
      handleDrop: (_, event) =>
        uploadRef.current(imageFiles((event as DragEvent).dataTransfer?.files)),
      handleKeyDown: (view, event) => {
        if (enterToSubmit) {
          // Enter gửi; trong khối code hoặc khi đang gõ dấu (IME) thì giữ hành vi mặc định
          const plainEnter =
            event.key === "Enter" &&
            !event.shiftKey &&
            !event.ctrlKey &&
            !event.metaKey &&
            !event.altKey &&
            !event.isComposing;
          if (
            !plainEnter ||
            view.state.selection.$from.parent.type.name === "codeBlock"
          )
            return false;
          onSubmitRef.current?.();
          return true;
        }
        if (
          event.key === "Enter" &&
          (event.ctrlKey || event.metaKey)
        ) {
          onSubmitRef.current?.();
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => onChangeRef.current(getEditorHtml(editor)),
    onFocus: () => onFocusRef.current?.(),
  });

  React.useEffect(() => {
    editor?.setEditable(!disabled);
  }, [editor, disabled]);

  /** Trả về true nếu đã nhận xử lý các file (để chặn hành vi dán/thả mặc định) */
  function uploadImages(files: File[]): boolean {
    if (!editor || !onUploadImage || disabled || !files.length) return false;
    for (const file of files) {
      if (!IMAGE_TYPES.includes(file.type)) {
        toast.add({
          title: "Định dạng ảnh không hỗ trợ",
          description: `${file.name}: chỉ chấp nhận JPG, PNG, WEBP, GIF.`,
          type: "error",
        });
        continue;
      }
      if (file.size > MAX_IMAGE_SIZE) {
        toast.add({
          title: "Ảnh quá lớn",
          description: `${file.name} vượt quá 5MB.`,
          type: "error",
        });
        continue;
      }
      setUploading((n) => n + 1);
      onUploadImage(file)
        .then((src) =>
          editor.chain().focus().setImage({ src, alt: file.name }).run(),
        )
        .catch((error: unknown) =>
          toast.add({
            title: "Không thể tải ảnh lên",
            description: error instanceof Error ? error.message : file.name,
            type: "error",
          }),
        )
        .finally(() => setUploading((n) => n - 1));
    }
    return true;
  }
  React.useEffect(() => {
    uploadRef.current = uploadImages;
  });

  // Đồng bộ khi giá trị bị đổi từ bên ngoài (reset sau khi gửi, dữ liệu mới từ server…)
  React.useEffect(() => {
    if (!editor) return;
    const next = toRichHtml(value);
    if (getEditorHtml(editor) !== next)
      editor.commands.setContent(next, { emitUpdate: false });
  }, [editor, value]);

  // Toolbar dưới luôn hiện (giữ nút gửi), chỉ ẩn các nút định dạng khi bị khóa
  const toolbar = (
    <RichTextToolbar
      editor={editor}
      position={toolbarPosition}
      disabled={disabled}
      uploading={uploading > 0}
      onPickImages={onUploadImage ? uploadImages : undefined}
      end={toolbarEnd}
    />
  );

  return (
    <div
      className={cn(
        "rounded-md border bg-background focus-within:ring-2 focus-within:ring-ring/50",
        disabled && "opacity-70",
        className,
      )}
    >
      {!disabled && toolbarPosition === "top" && toolbar}
      <EditorContent editor={editor} />
      {toolbarPosition === "bottom" && toolbar}
    </div>
  );
}

function RichTextToolbar({
  editor,
  position,
  disabled,
  uploading,
  onPickImages,
  end,
}: {
  editor: Editor | null;
  position: "top" | "bottom";
  disabled?: boolean;
  uploading: boolean;
  onPickImages?: (files: File[]) => boolean;
  end?: React.ReactNode;
}) {
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [link, setLink] = React.useState<string | null>(null);
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e?.isActive("bold") ?? false,
      italic: e?.isActive("italic") ?? false,
      underline: e?.isActive("underline") ?? false,
      strike: e?.isActive("strike") ?? false,
      heading: e?.isActive("heading", { level: 2 }) ?? false,
      bulletList: e?.isActive("bulletList") ?? false,
      orderedList: e?.isActive("orderedList") ?? false,
      blockquote: e?.isActive("blockquote") ?? false,
      codeBlock: e?.isActive("codeBlock") ?? false,
      link: e?.isActive("link") ?? false,
    }),
  });

  function openLink() {
    if (!editor) return;
    const previous = editor.getAttributes("link").href as string | undefined;
    setLink(previous ?? "https://");
  }

  function applyLink() {
    if (!editor || link === null) return;
    const url = link.trim();
    const chain = editor.chain().focus().extendMarkRange("link");
    if (!url || url === "https://") chain.unsetLink().run();
    else chain.setLink({ href: url }).run();
    setLink(null);
  }

  const items = [
    { key: "bold", label: "In đậm (Ctrl+B)", icon: Bold, run: () => editor?.chain().focus().toggleBold().run() },
    { key: "italic", label: "In nghiêng (Ctrl+I)", icon: Italic, run: () => editor?.chain().focus().toggleItalic().run() },
    { key: "underline", label: "Gạch chân (Ctrl+U)", icon: Underline, run: () => editor?.chain().focus().toggleUnderline().run() },
    { key: "strike", label: "Gạch ngang", icon: Strikethrough, run: () => editor?.chain().focus().toggleStrike().run() },
    { key: "heading", label: "Tiêu đề", icon: Heading2, run: () => editor?.chain().focus().toggleHeading({ level: 2 }).run() },
    { key: "bulletList", label: "Danh sách", icon: List, run: () => editor?.chain().focus().toggleBulletList().run() },
    { key: "orderedList", label: "Danh sách đánh số", icon: ListOrdered, run: () => editor?.chain().focus().toggleOrderedList().run() },
    { key: "blockquote", label: "Trích dẫn", icon: Quote, run: () => editor?.chain().focus().toggleBlockquote().run() },
    { key: "codeBlock", label: "Khối code", icon: Code, run: () => editor?.chain().focus().toggleCodeBlock().run() },
    { key: "link", label: "Chèn liên kết", icon: Link2, run: openLink },
  ] as const;

  return (
    <div
      role="toolbar"
      aria-label="Định dạng văn bản"
      className={cn(
        "flex flex-wrap items-center gap-0.5 px-1 py-1",
        position === "top" ? "border-b" : "border-t",
      )}
    >
      {!disabled && items.map(({ key, label, icon: Icon, run }) => (
        <Button
          key={key}
          type="button"
          variant="ghost"
          size="icon-sm"
          title={label}
          aria-label={label}
          aria-pressed={state?.[key] ?? false}
          className="text-muted-foreground aria-pressed:bg-muted aria-pressed:text-foreground"
          // Giữ selection trong editor khi bấm nút
          onMouseDown={(e) => e.preventDefault()}
          onClick={run}
        >
          <Icon />
        </Button>
      ))}

      {!disabled && onPickImages && (
        <>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            title="Chèn ảnh (hoặc dán / kéo thả ảnh vào ô soạn thảo)"
            aria-label="Chèn ảnh"
            disabled={uploading}
            className="text-muted-foreground"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? <Loader2 className="animate-spin" /> : <ImagePlus />}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept={IMAGE_TYPES.join(",")}
            multiple
            hidden
            onChange={(e) => {
              onPickImages(imageFiles(e.target.files));
              e.target.value = "";
            }}
          />
          {uploading && (
            <span className="ml-1 text-xs text-muted-foreground">
              Đang tải ảnh…
            </span>
          )}
        </>
      )}

      {end && <div className="ml-auto flex items-center gap-1">{end}</div>}

      <Modal
        open={link !== null}
        onOpenChange={(open) => {
          if (!open) setLink(null);
        }}
        title="Chèn liên kết"
        description="Để trống để gỡ liên kết khỏi đoạn văn bản đã chọn."
        icon={<Link2 className="size-5" />}
        size="sm"
        cancelText="Hủy"
        confirmText="Áp dụng"
        onConfirm={applyLink}
      >
        <Input
          autoFocus
          type="url"
          aria-label="Đường dẫn"
          placeholder="https://"
          value={link ?? ""}
          onChange={(e) => setLink(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              applyLink();
            }
          }}
        />
      </Modal>
    </div>
  );
}

/**
 * Hiển thị HTML ở chế độ chỉ đọc. Nội dung được phân tích qua schema của Tiptap
 * nên thẻ/thuộc tính không được hỗ trợ (script, onerror…) đều bị loại bỏ.
 */
export function RichTextContent({
  html,
  className,
}: {
  html: string;
  className?: string;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    editable: false,
    extensions: extensions(),
    content: toRichHtml(html),
    editorProps: {
      attributes: { class: cn("rich-text text-sm outline-none", className) },
    },
  });

  React.useEffect(() => {
    if (editor && getEditorHtml(editor) !== toRichHtml(html))
      editor.commands.setContent(toRichHtml(html), { emitUpdate: false });
  }, [editor, html]);

  const [preview, setPreview] = React.useState<{
    src: string;
    alt: string;
  } | null>(null);

  return (
    <>
      <EditorContent
        editor={editor}
        className="rich-text-readonly"
        onClick={(event) => {
          const target = event.target as HTMLElement;
          if (target instanceof HTMLImageElement)
            setPreview({ src: target.src, alt: target.alt });
        }}
      />
      <Modal
        open={preview !== null}
        onOpenChange={(open) => {
          if (!open) setPreview(null);
        }}
        title={preview?.alt || "Xem ảnh"}
        size="5xl"
        bodyClassName="flex items-center justify-center bg-muted/30"
        footer={
          preview && (
            <a
              href={preview.src}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Mở ảnh gốc
            </a>
          )
        }
      >
        {preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview.src}
            alt={preview.alt}
            className="max-h-[70vh] max-w-full rounded-md object-contain"
          />
        )}
      </Modal>
    </>
  );
}
