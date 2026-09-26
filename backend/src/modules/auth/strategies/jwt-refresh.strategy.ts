import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/users.service.js';
import { JwtPayload } from '../dtos/index.js';

const extractRefreshToken = (request: Request): string | null => {
  const cookies = request.cookies as Record<string, unknown> | undefined;
  const token = cookies?.refreshToken;
  return typeof token === 'string' ? token : null;
};

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    private readonly config: ConfigService,
    private readonly userService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([extractRefreshToken]),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('REFRESH_SECRET'),
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtPayload) {
    const refreshToken = extractRefreshToken(req);
    if (!refreshToken || !payload.sub || !payload.sid) {
      throw new UnauthorizedException(
        'Thông tin xác thực không hợp lệ, vui lòng đăng nhập lại !',
      );
    }

    const user = await this.userService.getByIdWithRoles(payload.sub);
    if (!user) {
      throw new UnauthorizedException(
        'Người dùng không tồn tại hoặc đã bị khóa !',
      );
    }

    return {
      user,
      token: {
        refreshToken,
        sessionId: payload.sid,
      },
    };
  }
}
