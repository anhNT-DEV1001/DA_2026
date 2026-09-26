import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ApiBody,
  ApiConsumes,
  ApiCookieAuth,
  ApiExtraModels,
  ApiOperation,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import {
  CurrentUser,
  Public,
  ResponseMessage,
} from '../../common/decorators/index.js';
import { createMulterOptions } from '../../common/utils/multer.util.js';
import { AuthService } from './auth.service.js';
import { LoginDto, RegisterDto } from './dtos/index.js';
import type { AuthUser, RefreshAuthUser } from './dtos/index.js';
import { JwtAccessGuard, JwtRefreshGuard } from './guards/index.js';
import { clearAuthCookies, setAuthCookies } from '../../common/utils/index.js';

const avatarUploadOptions = createMulterOptions({
  folder: 'avatars',
  allowedTypes: ['image'],
});

@ApiTags('Auth')
@ApiExtraModels(RegisterDto)
@UseGuards(JwtAccessGuard)
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  @Post('register')
  @ApiOperation({
    summary: 'Đăng ký tài khoản người dùng',
    security: [],
  })
  @Public()
  @ResponseMessage('Đăng ký tài khoản thành công')
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiBody({
    schema: {
      allOf: [
        { $ref: getSchemaPath(RegisterDto) },
        {
          type: 'object',
          properties: {
            avatar: { type: 'string', format: 'binary' },
          },
        },
      ],
    },
  })
  @UseInterceptors(FileInterceptor('avatar', avatarUploadOptions))
  async registerController(
    @Body() dto: RegisterDto,
    @UploadedFile() avatar?: Express.Multer.File,
  ) {
    const response = await this.authService.register(dto, avatar);
    return response;
  }

  @Post('login')
  @ApiOperation({
    summary: 'Đăng nhập và tạo access/refresh token cookies',
    security: [],
  })
  @Public()
  @ResponseMessage('Đăng nhập thành công')
  async loginController(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(dto);
    setAuthCookies(
      response,
      result.token.accessToken,
      result.token.refreshToken,
      this.config,
    );
    return result;
  }

  @Get('me')
  @ApiCookieAuth('access-token-cookie')
  @ApiOperation({
    summary: 'Lấy thông tin người dùng đang đăng nhập kèm roles và permissions',
  })
  getMeController(@CurrentUser() auth: AuthUser) {
    return auth;
  }

  @Post('logout')
  @Public()
  @ApiOperation({ summary: 'Đăng xuất và xoá phiên đăng nhập hiện tại' })
  async logoutController(
    @Req() req: Request,
    @Res({ passthrough: true }) response: Response,
    @CurrentUser() auth?: AuthUser,
  ) {
    try {
      let sessionId = auth?.token?.sessionId;
      if (!sessionId) {
        const rawCookie = req?.headers?.cookie;
        let accessToken = req?.cookies?.accessToken;
        if (rawCookie) {
          const matches = [
            ...rawCookie.matchAll(/(?:^|;\s*)accessToken=([^;]+)/g),
          ];
          if (matches.length > 0) {
            accessToken = decodeURIComponent(matches[matches.length - 1][1]);
          }
        }
        if (accessToken) {
          const payload = this.jwtService.decode(accessToken) as {
            sid?: string;
          };
          sessionId = payload?.sid;
        }
      }

      if (sessionId) {
        await this.authService.logoutBySessionId(sessionId);
      }
    } catch {
      // Bỏ qua lỗi session nếu đã bị xóa hoặc hết hạn trong DB
    }

    clearAuthCookies(response, this.config);
    return { message: 'Đăng xuất thành công' };
  }

  @Post('refresh')
  @ApiOperation({
    summary: 'Luân chuyển refresh token và cấp cặp token mới',
    security: [{ 'refresh-token-cookie': [] }],
  })
  @ApiCookieAuth('refresh-token-cookie')
  @UseGuards(JwtRefreshGuard)
  @Public()
  async refreshController(
    @CurrentUser() auth: RefreshAuthUser,
    @Res({ passthrough: true }) response: Response,
  ) {
    try {
      const tokens = await this.authService.refresh(
        auth.user,
        auth.token.sessionId,
        auth.token.refreshToken,
      );

      setAuthCookies(
        response,
        tokens.accessToken,
        tokens.refreshToken,
        this.config,
      );
      return tokens;
    } catch (error) {
      clearAuthCookies(response, this.config);
      throw error;
    }
  }
}
