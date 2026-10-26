import { apiClient } from "@/lib/axios";
import type {
  CreateNoteDto,
  NoteItem,
  NoteQueryParams,
  PaginatedNoteResponse,
  UpdateNoteDto,
} from "../types";

export const noteService = {
  /**
   * Không truyền page/limit thì backend trả về toàn bộ ghi chú (mảng)
   */
  getListNotes: async (
    params?: NoteQueryParams,
  ): Promise<PaginatedNoteResponse | NoteItem[]> => {
    return apiClient.get<unknown, PaginatedNoteResponse | NoteItem[]>(
      "/notes",
      {
        params,
      },
    );
  },

  getNoteById: async (id: number): Promise<NoteItem> => {
    return apiClient.get<unknown, NoteItem>(`/notes/${id}`);
  },

  createNote: async (dto: CreateNoteDto): Promise<NoteItem> => {
    return apiClient.post<unknown, NoteItem>("/notes", dto);
  },

  updateNote: async (id: number, dto: UpdateNoteDto): Promise<NoteItem> => {
    return apiClient.patch<unknown, NoteItem>(`/notes/${id}`, dto);
  },

  deleteNote: async (id: number): Promise<NoteItem> => {
    return apiClient.delete<unknown, NoteItem>(`/notes/${id}`);
  },

  /**
   * Khôi phục ghi chú đã xóa (hoàn tác)
   */
  restoreNote: async (id: number): Promise<NoteItem> => {
    return apiClient.patch<unknown, NoteItem>(`/notes/${id}/restore`);
  },
};
