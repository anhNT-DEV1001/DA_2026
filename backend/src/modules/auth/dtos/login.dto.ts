import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { UserResponse } from '../../users/dtos/index.js';

export class LoginDto {
  @ApiProperty({ example: 'da_root' })
  @IsString({ message: 'Tên đăng nhập phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Vui lòng nhập tên đăng nhập.' })
  @MaxLength(50, { message: 'Tên đăng nhập không được vượt quá 50 ký tự.' })
  username: string;

  @ApiProperty({ example: '123456' })
  @IsString({ message: 'Mật khẩu phải là chuỗi ký tự.' })
  @IsNotEmpty({ message: 'Vui lòng nhập mật khẩu.' })
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự.' })
  @MaxLength(100, { message: 'Mật khẩu không được vượt quá 100 ký tự.' })
  password: string;
}

export class LoginResponse {
  user: UserResponse;
  token: {
    accessToken: string;
    refreshToken: string;
    sessionId: string;
  };
}
