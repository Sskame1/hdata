/* CRUD групп внутри коллекций.
   Группы привязаны к коллекции — не пересекаются между разными коллекциями. */
import { Controller, Get, Post, Patch, Delete, Body, Param } from "@nestjs/common";
import { GroupsService } from "./groups.service";
import { CreateGroupDto } from "./dto/create-group.dto";
import { UpdateGroupDto } from "./dto/update-group.dto";

@Controller("collections/:collectionId/groups")
export class GroupsController {
  constructor(private readonly service: GroupsService) {}

  @Get()
  list(@Param("collectionId") collectionId: string) {
    return this.service.list(collectionId);
  }

  @Post()
  create(@Param("collectionId") collectionId: string, @Body() dto: CreateGroupDto) {
    return this.service.create({ ...dto, collectionId });
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateGroupDto) {
    return this.service.update(id, dto);
  }

  @Delete(":id")
  delete(@Param("id") id: string) {
    return this.service.delete(id);
  }
}
