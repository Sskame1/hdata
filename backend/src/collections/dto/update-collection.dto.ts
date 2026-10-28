/* DTO для обновления коллекции */
import { IsString, MinLength } from "class-validator";

export class UpdateCollectionDto {
  @IsString()
  @MinLength(1)
  name!: string;
}
