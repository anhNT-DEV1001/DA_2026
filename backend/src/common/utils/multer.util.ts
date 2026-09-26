import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { extname } from 'path';
import { existsSync, mkdirSync } from 'fs';

// 1. Định nghĩa các nhóm file được hỗ trợ
export type AllowedFileType = 'image' | 'pdf' | 'excel' | 'doc' | 'video';

// Bảng ánh xạ MIME types cho từng nhóm file
const MIME_TYPE_MAP: Record<AllowedFileType, string[]> = {
  image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  pdf: ['application/pdf'],
  excel: [
    'application/vnd.ms-excel', // .xls
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'text/csv', // .csv
  ],
  doc: [
    'application/msword', // .doc
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'text/plain', // .txt
  ],
  video: ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo'],
};

// Giới hạn dung lượng mặc định theo loại file
const DEFAULT_MAX_SIZES: Record<AllowedFileType, number> = {
  image: 5 * 1024 * 1024, // 5MB
  pdf: 10 * 1024 * 1024, // 10MB
  excel: 10 * 1024 * 1024, // 10MB
  doc: 10 * 1024 * 1024, // 10MB
  video: 50 * 1024 * 1024, // 50MB
};

interface MulterCustomOptions {
  folder: string; // Thư mục con trong ./uploads (vd: 'avatars', 'documents', 'videos')
  allowedTypes: AllowedFileType[]; // Danh sách loại file cho phép (vd: ['image'] hoặc ['pdf', 'doc'])
  maxFileSize?: number; // Tuỳ chỉnh dung lượng tối đa (bytes), nếu không truyền sẽ lấy theo loại lớn nhất
}

/**
 * Utility tạo cấu hình Multer dùng chung cho Controller
 */
export const createMulterOptions = (
  options: MulterCustomOptions,
): MulterOptions => {
  const { folder, allowedTypes, maxFileSize } = options;

  // Tính dung lượng tối đa (lấy mức cao nhất nếu không truyền thủ công)
  const calculatedMaxSize =
    maxFileSize ||
    Math.max(...allowedTypes.map((type) => DEFAULT_MAX_SIZES[type]));

  return {
    storage: diskStorage({
      destination: (req, file, cb) => {
        const uploadPath = `./uploads/${folder}`;
        // Tự động tạo cây thư mục nếu chưa tồn tại
        if (!existsSync(uploadPath)) {
          mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
      },
      filename: (req, file, cb: any) => {
        // Chuẩn hoá tên file: [fieldname]-[timestamp]-[random].[ext]
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = extname(file.originalname).toLowerCase();
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
      },
    }),
    fileFilter: (req, file, cb: any) => {
      // Gom toàn bộ MIME types hợp lệ từ các nhóm được khai báo
      const validMimeTypes = allowedTypes.flatMap(
        (type) => MIME_TYPE_MAP[type],
      );

      if (validMimeTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(
          new BadRequestException(
            `Định dạng file '${file.mimetype}' không hợp lệ. Chỉ chấp nhận các loại: [${allowedTypes.join(', ')}]`,
          ),
          false,
        );
      }
    },
    limits: {
      fileSize: calculatedMaxSize,
    },
  };
};
