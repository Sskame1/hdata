/* DTO для создания группы в коллекции */
import { IsString, IsUUID, MinLength } from "class-validator";

export class CreateGroupDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @IsUUID()
  collectionId!: string;
}
