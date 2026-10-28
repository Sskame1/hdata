import { IsString, IsOptional, IsNumber, Min } from "class-validator";
import { Type } from "class-transformer";

export class CreateMangaDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  coverFrom?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  pageCount?: number;
}

export class CreateChapterDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  chapterNumber!: number;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  pageCount?: number;
}
