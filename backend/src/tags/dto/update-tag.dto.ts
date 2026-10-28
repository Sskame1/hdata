/* DTO для обновления тега */
import { IsString, IsOptional, MinLength } from "class-validator";

export class UpdateTagDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @IsOptional()
  color?: string;
}
