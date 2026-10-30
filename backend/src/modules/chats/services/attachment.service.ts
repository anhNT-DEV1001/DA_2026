import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { unlink } from 'fs/promises';
import { resolve } from 'path';
import { DataSource, In, IsNull, LessThan } from 'typeorm';
import { Message, MessageAttachment } from '../entities/index.js';
import { ChatAccessService } from './chat-access.service.js';

/** Ngoài ./uploads (public); file chỉ tải được qua API có kiểm tra quyền */
export const CHAT_STORAGE_ROOT = './storage';
export const CHAT_FILE_FOLDER = 'chat-files';

// File đã upload nhưng không được gửi kèm tin nào sau khoảng này thì bị dọn
const PENDING_TTL_MS = 24 * 60 * 60 * 1000;
const CLEANUP_BATCH = 500;

const absolutePath = (filePath: string) => resolve(CHAT_STORAGE_ROOT, filePath);

@Injectable()
export class AttachmentService {
  private readonly logger = new Logger(AttachmentService.name);

  constructor(
    private readonly source: DataSource,
    private readonly chatAccess: ChatAccessService,
  ) {}

  /** Lưu file trước khi gửi tin; xoá file nếu người dùng không có quyền với conversation */
  async upload(
    conversationId: number,
    userId: number,
    file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Vui lòng chọn file');
    try {
      const { conversation } = await this.chatAccess.conversation(userId, conversationId);
      this.chatAccess.assertWritable(conversation);
    } catch (error) {
      await unlink(file.path).catch(() => undefined);
      throw error;
    }
    const repo = this.source.getRepository(MessageAttachment);
    const saved = await repo.save(
      repo.create({
        conversationId,
        messageId: null,
        // Multer đọc tên file theo latin1; trình duyệt gửi UTF-8 (tên tiếng Việt)
        originalName: Buffer.from(file.originalname, 'latin1').toString('utf8'),
        filePath: `${CHAT_FILE_FOLDER}/${file.filename}`,
        mimeType: file.mimetype,
        size: file.size,
        createdBy: userId,
        updatedBy: userId,
      }),
    );
    return {
      id: saved.id,
      conversationId,
      originalName: saved.originalName,
      mimeType: saved.mimeType,
      size: saved.size,
      createdAt: saved.createdAt,
    };
  }

  /** File chưa gửi chỉ người upload thấy; file của tin đã xoá thì không tải được nữa */
  async resolveDownload(
    conversationId: number,
    attachmentId: number,
    userId: number,
  ) {
    await this.chatAccess.conversation(userId, conversationId);
    const attachment = await this.source
      .getRepository(MessageAttachment)
      .findOne({ where: { id: attachmentId, conversationId } });
    const visible =
      attachment &&
      (attachment.messageId
        ? await this.source
            .getRepository(Message)
            .existsBy({ id: attachment.messageId })
        : attachment.createdBy === userId);
    if (!attachment || !visible)
      throw new NotFoundException('Không tìm thấy file đính kèm');
    return {
      path: absolutePath(attachment.filePath),
      originalName: attachment.originalName,
      mimeType: attachment.mimeType,
    };
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupPending() {
    const repo = this.source.getRepository(MessageAttachment);
    const stale = await repo.find({
      select: { id: true, filePath: true },
      where: {
        messageId: IsNull(),
        createdAt: LessThan(new Date(Date.now() - PENDING_TTL_MS)),
      },
      take: CLEANUP_BATCH,
    });
    if (!stale.length) return;
    await Promise.all(
      stale.map((a) => unlink(absolutePath(a.filePath)).catch(() => undefined)),
    );
    await repo.delete({ id: In(stale.map((a) => a.id)) });
    this.logger.log(`Đã dọn ${stale.length} file chat không được gửi`);
  }
}
