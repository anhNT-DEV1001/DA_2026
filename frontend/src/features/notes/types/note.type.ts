export const NOTE_COLORS = [
  "yellow",
  "pink",
  "green",
  "blue",
  "purple",
  "orange",
  "gray",
] as const;

export type NoteColor = (typeof NOTE_COLORS)[number];

export interface NoteItem {
  id: number;
  userId: number;
  // Nội dung HTML từ trình soạn thảo
  content: string;
  // Nội dung text thuần (dùng cho tìm kiếm / xem trước)
  contentText: string;
  color: NoteColor;
  createdAt?: string | null;
  updatedAt?: string | null;
  createdBy?: number | null;
  updatedBy?: number | null;
}

export type Note = NoteItem;

export interface CreateNoteDto {
  content?: string;
  contentText?: string;
  color?: NoteColor;
}

export type UpdateNoteDto = Partial<CreateNoteDto>;

export interface NoteQueryParams {
  search?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedNoteResponse {
  items: NoteItem[];
  meta: {
    page: number;
    limit: number;
    itemCount: number;
    pageCount: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  };
}
