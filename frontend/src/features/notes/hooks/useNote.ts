"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { noteService } from "../services";
import type {
  CreateNoteDto,
  NoteItem,
  NoteQueryParams,
  UpdateNoteDto,
} from "../types";

export const NOTE_QUERY_KEYS = {
  all: ["notes"] as const,
  lists: () => [...NOTE_QUERY_KEYS.all, "list"] as const,
  list: (params?: NoteQueryParams) =>
    [...NOTE_QUERY_KEYS.lists(), params] as const,
  details: () => [...NOTE_QUERY_KEYS.all, "detail"] as const,
  detail: (id: number) => [...NOTE_QUERY_KEYS.details(), id] as const,
};

/**
 * Danh sách toàn bộ ghi chú của người dùng hiện tại (không phân trang)
 */
export function useNoteList(
  params?: Pick<NoteQueryParams, "search">,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: NOTE_QUERY_KEYS.list(params),
    queryFn: async () => {
      const res = await noteService.getListNotes(params);
      return Array.isArray(res) ? res : res.items;
    },
    enabled: options?.enabled ?? true,
  });
}

export function useNote() {
  const queryClient = useQueryClient();

  /** Cập nhật trực tiếp một ghi chú trong mọi cache danh sách (không refetch) */
  const patchListCaches = (updater: (items: NoteItem[]) => NoteItem[]) => {
    queryClient.setQueriesData<NoteItem[]>(
      { queryKey: NOTE_QUERY_KEYS.lists() },
      (old) => (old ? updater(old) : old),
    );
  };

  const createMutation = useMutation({
    mutationFn: (dto: CreateNoteDto) => noteService.createNote(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTE_QUERY_KEYS.lists() });
    },
  });

  // Không invalidate sau khi lưu để tránh refetch liên tục khi đang gõ (tự động lưu)
  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdateNoteDto }) =>
      noteService.updateNote(id, dto),
    onMutate: ({ id, dto }) => {
      patchListCaches((items) =>
        items.map((note) => (note.id === id ? { ...note, ...dto } : note)),
      );
    },
    onSuccess: (updated) => {
      patchListCaches((items) =>
        items.map((note) => (note.id === updated.id ? updated : note)),
      );
      queryClient.setQueryData(NOTE_QUERY_KEYS.detail(updated.id), updated);
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: NOTE_QUERY_KEYS.lists() });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (noteId: number) => noteService.deleteNote(noteId),
    onMutate: (noteId) => {
      patchListCaches((items) => items.filter((note) => note.id !== noteId));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: NOTE_QUERY_KEYS.lists() });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (noteId: number) => noteService.restoreNote(noteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTE_QUERY_KEYS.lists() });
    },
  });

  return {
    // Mutations
    createNote: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    createError: createMutation.error,

    updateNote: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    updateError: updateMutation.error,

    deleteNote: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    deleteError: deleteMutation.error,

    restoreNote: restoreMutation.mutateAsync,
    isRestoring: restoreMutation.isPending,
    restoreError: restoreMutation.error,
  };
}
