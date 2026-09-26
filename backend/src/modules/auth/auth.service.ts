import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserSession } from './entities/index.js';
import { Repository } from 'typeorm';
import {
  JwtPayload,
  LoginDto,
  LoginResponse,
  RegisterDto,
} from './dtos/index.js';
import { UsersService } from '../users/users.service.js';
import bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import { UserResponse } from '../users/dtos/index.js';
import { Role } from '../admin/entites/index.js';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserSession)
    private readonly userSessionRepo: Repository<UserSession>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    private readonly userService: UsersService,
    private readonly config: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  async register(
    dto: RegisterDto,
    avatar?: Express.Multer.File,
  ): Promise<UserResponse> {
    let roleIds = dto.roleIds;

    if (!roleIds || !roleIds.length) {
      const defaultRole = await this.roleRepo.findOne({
        where: [{ name: 'USER' }, { name: 'User' }, { name: 'user' }],
      });
      roleIds = defaultRole ? [defaultRole.id] : [];
    }

    const userData = avatar
      ? { ...dto, avatar: `/uploads/avatars/${avatar.filename}`, roleIds }
      : { ...dto, roleIds };

    return this.userService.createUser(userData);
  }

  async login(dto: LoginDto): Promise<LoginResponse> {
    const user = await this.userService.getByUsername(dto.username);
    if (!user)
      throw new BadRequestException(
        'Thông tin người dùng không đúng, vui lòng thử lại !',
      );
    const isValidPass = await bcrypt.compare(dto.password, user.password);
    if (!isValidPass)
      throw new BadRequestException(
        'Thông tin người dùng không đúng, vui lòng thử lại !',
      );
    const sessionId = randomUUID();

    const tokens = await this.generateTokens({
      sub: user.id,
      username: user.username,
      sid: sessionId,
    });
    const tokenHashed = await bcrypt.hash(tokens.refreshToken, 10);

    const session = this.userSessionRepo.create({
      userId: user.id,
      hashedToken: tokenHashed,
      sid: sessionId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdBy: user.id,
    });
    await this.userSessionRepo.save(session);

    return {
      user: new UserResponse().mapToResponse(user),
      token: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        sessionId,
      },
    };
  }

  async logout(user: UserResponse, sessionId: string): Promise<UserResponse> {
    const currentSession = await this.userSessionRepo.findOne({
      where: { userId: user.id, sid: sessionId },
    });
    if (!currentSession)
      throw new BadRequestException(
        'Lỗi đăng xuất, hệ thống không ghi nhận phiên đăng nhập hiện tại !',
      );

    await this.userSessionRepo.remove(currentSession);
    return user;
  }

  async logoutBySessionId(sessionId: string): Promise<void> {
    await this.userSessionRepo.delete({ sid: sessionId });
  }

  async refresh(
    user: UserResponse,
    currentSessionId: string,
    refreshToken: string,
  ) {
    const now = new Date();
    const currentUserSession = await this.userSessionRepo.findOne({
      where: { userId: user.id, sid: currentSessionId },
    });
    if (!currentUserSession)
      throw new UnauthorizedException(
        'Phiên đăng nhập không tồn tại, vui lòng đăng nhập lại !',
      );

    if (now > currentUserSession.expiresAt) {
      await this.userSessionRepo.remove(currentUserSession);
      throw new UnauthorizedException(
        'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại !',
      );
    }
    const checkToken = await bcrypt.compare(
      refreshToken,
      currentUserSession.hashedToken,
    );
    if (!checkToken) {
      await this.userSessionRepo.remove(currentUserSession);
      throw new UnauthorizedException(
        'Thông tin không hợp lệ, vui lòng đăng nhập lại hệ thống !',
      );
    }
    if (!user.id || !user.username)
      throw new BadRequestException('Lỗi dữ liệu');
    const tokens = await this.generateTokens({
      sub: user.id,
      username: user.username,
      sid: currentSessionId,
    });
    const hashedToken = await bcrypt.hash(tokens.refreshToken, 10);

    // Cập nhật trực tiếp để session không có khoảng thời gian bị xóa khỏi DB.
    // Khoảng trống remove/save trước đây có thể khiến request đồng thời nhận 401.
    currentUserSession.hashedToken = hashedToken;
    currentUserSession.expiresAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    );
    await this.userSessionRepo.save(currentUserSession);

    return tokens;
  }

  async generateTokens(payload: JwtPayload) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.config.get<string>('ACCESS_SECRET'),
        expiresIn: this.config.get<any>('ACCESS_EXPIRES_IN', '15m'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.config.get<string>('REFRESH_SECRET'),
        expiresIn: this.config.get<any>('REFRESH_EXPIRES_IN', '7d'),
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }
}
