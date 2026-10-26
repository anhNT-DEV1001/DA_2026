import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Note } from './entities/index.js';
import { CreateNoteDto, NoteRequest, UpdateNoteDto } from './dtos/index.js';
import {
  PageMetadataResponse,
  PageResponse,
} from '../../common/responses/index.js';

@Injectable()
export class NotesService {
  constructor(
    @InjectRepository(Note)
    private readonly noteRepo: Repository<Note>,
  ) {}

  /**
   * Danh sách ghi chú của user (mới nhất trước).
   * Có truyền page/limit thì trả về dạng phân trang, ngược lại trả về toàn bộ.
   */
  async findAll(
    userId: number,
    query: NoteRequest,
  ): Promise<PageResponse<Note> | Note[]> {
    const qb = this.noteRepo
      .createQueryBuilder('note')
      .where('note.userId = :userId', { userId })
      .orderBy('note.id', 'DESC');

    const search = query.search?.trim();
    if (search) {
      qb.andWhere('note.contentText ILIKE :search', {
        search: `%${search}%`,
      });
    }

    if (query.page !== undefined || query.limit !== undefined) {
      const [items, itemCount] = await qb
        .skip(query.skip)
        .take(query.limit ?? 15)
        .getManyAndCount();
      const meta = new PageMetadataResponse({ pageRequest: query, itemCount });
      return new PageResponse(items, meta);
    }

    return qb.getMany();
  }

  async findOne(userId: number, noteId: number): Promise<Note> {
    const note = await this.noteRepo.findOne({
      where: { id: noteId, userId },
    });
    if (!note) {
      throw new NotFoundException(`Không tìm thấy ghi chú #${noteId}.`);
    }
    return note;
  }

  async create(userId: number, dto: CreateNoteDto): Promise<Note> {
    const content = dto.content ?? '';
    const note = this.noteRepo.create({
      userId,
      content,
      contentText: dto.contentText ?? this.toPlainText(content),
      color: dto.color ?? 'yellow',
      createdBy: userId,
      updatedBy: userId,
    });
    return this.noteRepo.save(note);
  }

  async update(
    userId: number,
    noteId: number,
    dto: UpdateNoteDto,
  ): Promise<Note> {
    const note = await this.findOne(userId, noteId);

    if (dto.content !== undefined) {
      note.content = dto.content;
      note.contentText = dto.contentText ?? this.toPlainText(dto.content);
    }

    if (dto.color !== undefined) {
      note.color = dto.color;
    }

    note.updatedBy = userId;

    return this.noteRepo.save(note);
  }

  async remove(userId: number, noteId: number): Promise<Note> {
    const note = await this.findOne(userId, noteId);
    note.deletedBy = userId;
    return this.noteRepo.softRemove(note);
  }

  /** Khôi phục ghi chú đã xóa mềm (hoàn tác thao tác xóa) */
  async restore(userId: number, noteId: number): Promise<Note> {
    const note = await this.noteRepo.findOne({
      where: { id: noteId, userId },
      withDeleted: true,
    });
    if (!note?.deletedAt) {
      throw new NotFoundException(`Không tìm thấy ghi chú đã xóa #${noteId}.`);
    }

    await this.noteRepo.update(note.id, {
      deletedAt: null,
      deletedBy: null,
      updatedBy: userId,
    });

    return this.findOne(userId, noteId);
  }

  /** Dự phòng khi client không gửi contentText: bỏ thẻ HTML và giải mã entity cơ bản */
  private toPlainText(html: string): string {
    return html
      .replace(/<(br|\/p|\/li|\/h\d)[^>]*>/gi, '\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&')
      .replace(/\n{2,}/g, '\n')
      .trim();
  }
}
