import { IsString, IsOptional, MinLength } from "class-validator";

export class CreateMangaTagDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @IsOptional()
  color?: string;
}
