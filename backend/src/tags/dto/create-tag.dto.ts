/* DTO для создания тега */
import { IsString, IsOptional, MinLength } from "class-validator";

export class CreateTagDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @IsOptional()
  color?: string;
}
