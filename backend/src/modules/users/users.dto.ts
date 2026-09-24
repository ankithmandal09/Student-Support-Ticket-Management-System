import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsString, Length } from 'class-validator';
import { Optional, Trim } from '../../common/dto.js';
import { Role } from '../../common/enums.js';
import { RegisterDto } from '../auth/auth.dto.js';
import { User } from '../../entities/users.entity.js';
export class CreateUserDto extends RegisterDto {
  @ApiProperty({ enum: Role }) @IsEnum(Role) role: Role;
  @ApiPropertyOptional({ example: 'Administration', maxLength: 100 })
  @Optional()
  @Trim()
  @IsString()
  @Length(2, 100)
  department?: string;
}
export class ActiveDto {
  @ApiProperty({
    example: false,
    description:
      'Deactivation is rejected until all assigned active tickets are transferred.',
  })
  @IsBoolean()
  isActive: boolean;
}
export class UserPage {
  @ApiProperty({ type: [User] }) items: User[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
}
