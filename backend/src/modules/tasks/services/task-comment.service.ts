import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { unlink } from 'fs/promises';
import { DataSource, EntityManager } from 'typeorm';
import { TaskComment } from '../entities/task-comment.entity.js';
import {
  CreateTaskCommentDto,
  UpdateTaskCommentDto,
} from '../dtos/task-comment.dto.js';
import { TaskPageQuery } from '../dtos/task.dto.js';
import {
  PageMetadataResponse,
  PageResponse,
} from '../../../common/responses/paginate.response.js';
import { TasksService } from './tasks.service.js';
import { TaskRealtimeService } from './task-realtime.service.js';

/** Nội dung rỗng sau khi bỏ thẻ HTML (vd: "<p></p>"); bình luận chỉ có ảnh vẫn hợp lệ */
function isBlank(content: string) {
  if (/<img\s/i.test(content)) return false;
  return !content
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

@Injectable()
export class TaskCommentService {
  constructor(
    private readonly source: DataSource,
    private readonly tasks: TasksService,
    private readonly realtime: TaskRealtimeService,
  ) {}

  /** Lưu ảnh chèn vào bình luận/mô tả; xóa file nếu người dùng không có quyền với task */
  async uploadImage(
    workspaceId: number,
    taskId: number,
    actorId: number,
    file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Vui lòng chọn ảnh');
    try {
      await this.source.transaction((manager) =>
        this.tasks.access(manager, workspaceId, taskId, actorId),
      );
    } catch (error) {
      await unlink(file.path).catch(() => undefined);
      throw error;
    }
    return { url: `/uploads/task-images/${file.filename}` };
  }

  private async comment(
    manager: EntityManager,
    taskId: number,
    commentId: number,
    lock = false,
  ) {
    const comment = await manager.getRepository(TaskComment).findOne({
      where: { id: commentId, taskId },
      ...(lock ? { lock: { mode: 'pessimistic_write' as const } } : {}),
    });
    if (!comment) throw new NotFoundException('Không tìm thấy bình luận');
    return comment;
  }

  /** Bình luận mới nhất trước; kèm thông tin cơ bản của tác giả */
  async list(
    workspaceId: number,
    taskId: number,
    actorId: number,
    query: TaskPageQuery,
  ) {
    await this.tasks.access(this.source.manager, workspaceId, taskId, actorId);
    const [items, total] = await this.source
      .getRepository(TaskComment)
      .createQueryBuilder('c')
      .leftJoin('c.author', 'u')
      .addSelect(['u.id', 'u.fullName', 'u.username', 'u.avatar'])
      .where('c.taskId = :taskId', { taskId })
      .orderBy('c.id', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();

    return new PageResponse(
      items,
      new PageMetadataResponse({ pageRequest: query, itemCount: total }),
    );
  }

  async create(
    workspaceId: number,
    taskId: number,
    actorId: number,
    dto: CreateTaskCommentDto,
    origin?: string,
  ) {
    if (isBlank(dto.content))
      throw new BadRequestException('Nội dung bình luận không được để trống');
    const { task, comment } = await this.source.transaction(async (manager) => {
      const task = await this.tasks.access(manager, workspaceId, taskId, actorId);
      if (dto.parentId) {
        const parent = await this.comment(manager, taskId, dto.parentId);
        if (parent.parentId)
          throw new BadRequestException('Chỉ có thể trả lời bình luận gốc');
      }
      const repo = manager.getRepository(TaskComment);
      const comment = repo.create({
        taskId,
        authorId: actorId,
        parentId: dto.parentId ?? null,
        contentType: dto.contentType ?? 'html',
        content: dto.content,
        editedAt: null,
        createdBy: actorId,
        updatedBy: actorId,
      });
      await repo.save(comment);
      return { task, comment };
    });
    this.realtime.emit(
      task,
      'comment.created',
      { taskId, commentId: comment.id, actorId },
      origin,
    );
    return comment;
  }

  async update(
    workspaceId: number,
    taskId: number,
    commentId: number,
    actorId: number,
    dto: UpdateTaskCommentDto,
    origin?: string,
  ) {
    if (isBlank(dto.content))
      throw new BadRequestException('Nội dung bình luận không được để trống');
    let changed = false;
    const { task, comment } = await this.source.transaction(async (manager) => {
      const task = await this.tasks.access(manager, workspaceId, taskId, actorId);
      const comment = await this.comment(manager, taskId, commentId, true);
      if (comment.authorId !== actorId)
        throw new ForbiddenException('Bạn chỉ có thể sửa bình luận của mình');
      if (comment.content === dto.content) return { task, comment };
      comment.content = dto.content;
      comment.editedAt = new Date();
      comment.updatedBy = actorId;
      await manager.getRepository(TaskComment).save(comment);
      changed = true;
      return { task, comment };
    });
    if (changed)
      this.realtime.emit(
        task,
        'comment.updated',
        { taskId, commentId, actorId },
        origin,
      );
    return comment;
  }

  async remove(
    workspaceId: number,
    taskId: number,
    commentId: number,
    actorId: number,
    origin?: string,
  ) {
    const { task, comment } = await this.source.transaction(async (manager) => {
      const task = await this.tasks.access(manager, workspaceId, taskId, actorId);
      const comment = await this.comment(manager, taskId, commentId, true);
      if (comment.authorId !== actorId)
        throw new ForbiddenException('Bạn chỉ có thể xóa bình luận của mình');
      comment.deletedBy = actorId;
      comment.updatedBy = actorId;
      comment.deletedAt = new Date();
      await manager.getRepository(TaskComment).save(comment);
      return { task, comment };
    });
    this.realtime.emit(
      task,
      'comment.deleted',
      { taskId, commentId, actorId },
      origin,
    );
    return { id: comment.id, deletedAt: comment.deletedAt };
  }
}
