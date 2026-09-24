import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { Trim } from '../../common/dto.js';
import { User } from '../../entities/users.entity.js';

export class LoginDto {
  @ApiProperty({ example: 'student@example.com', maxLength: 254 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email: string;
  @ApiProperty({
    example: '12345678',
    minLength: 8,
    maxLength: 128,
    format: 'password',
  })
  @IsString()
  @Length(8, 128)
  password: string;
}
export class RegisterDto extends LoginDto {
  @ApiProperty({ example: 'Ankith', minLength: 2, maxLength: 100 })
  @Trim()
  @IsString()
  @Length(2, 100)
  name: string;
}
export class AuthResponse {
  @ApiProperty() accessToken: string;
  @ApiProperty({ example: 'Bearer' }) tokenType: string;
  @ApiProperty({ example: 86400 }) expiresIn: number;
  @ApiProperty({ type: () => User }) user: User;
}
