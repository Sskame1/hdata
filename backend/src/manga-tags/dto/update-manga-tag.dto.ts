import { IsString, IsOptional, MinLength } from "class-validator";

export class UpdateMangaTagDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @IsOptional()
  color?: string;
}
