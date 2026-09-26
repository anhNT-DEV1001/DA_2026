import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { UsersService } from '../../users/users.service.js';
import { AuthUser, JwtPayload } from '../dtos/index.js';
import { InjectRepository } from '@nestjs/typeorm';
import { Role } from '../../admin/entites/index.js';
import { In, Repository } from 'typeorm';
import { UserSession } from '../entities/index.js';
import { AuthorizeService } from '../../admin/services/index.js';

const extractAccessToken = (request: Request): string | null => {
  const rawCookie = request?.headers?.cookie;
  if (rawCookie) {
    const matches = [...rawCookie.matchAll(/(?:^|;\s*)accessToken=([^;]+)/g)];
    if (matches.length > 1) {
      const latestToken = decodeURIComponent(matches[matches.length - 1][1]);
      if (request.cookies) {
        request.cookies.accessToken = latestToken;
      }
      return latestToken;
    }
  }
  return request?.cookies?.accessToken ?? null;
};

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(
  Strategy,
  'jwt-access',
) {
  constructor(
    private readonly config: ConfigService,
    private readonly userService: UsersService,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(UserSession)
    private readonly userSessionRepo: Repository<UserSession>,
    private readonly authorizeService: AuthorizeService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([extractAccessToken]),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('ACCESS_SECRET'),
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtPayload): Promise<AuthUser> {
    const accessToken = extractAccessToken(req);
    if (typeof accessToken !== 'string' || !payload.sub || !payload.sid) {
      throw new UnauthorizedException(
        'Thông tin xác thực không hợp lệ. Vui lòng đăng nhập lại.',
      );
    }

    const [user, session] = await Promise.all([
      this.userService.getByIdWithRoles(payload.sub),
      this.userSessionRepo.findOne({
        where: {
          userId: payload.sub,
          sid: payload.sid,
        },
      }),
    ]);

    const sessionExpiresAt = session
      ? new Date(session.expiresAt).getTime()
      : Number.NaN;
    if (
      !session ||
      !Number.isFinite(sessionExpiresAt) ||
      sessionExpiresAt <= Date.now()
    ) {
      throw new UnauthorizedException(
        'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
      );
    }

    if (!user) {
      throw new UnauthorizedException(
        'Người dùng không tồn tại hoặc đã bị khóa !',
      );
    }

    if (!user.userRoles) user.userRoles = [];
    const roleIds = user.userRoles.map((ur) => ur.roleId);
    if (!user.id) throw new BadRequestException('Lỗi dữ liệu');
    const [roles, permissions] = await Promise.all([
      this.roleRepo.find({
        where: { id: In(roleIds) },
      }),
      this.authorizeService.getUserPermission(user.id),
    ]);

    return {
      user,
      token: {
        accessToken,
        sessionId: payload.sid,
      },
      roles,
      permissions,
    };
  }
}
