/* CRUD тегов. DELETE каскадно удаляет связи через onDelete: Cascade в Prisma. */
import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from "@nestjs/common";
import { TagsService } from "./tags.service";
import { CreateTagDto } from "./dto/create-tag.dto";
import { UpdateTagDto } from "./dto/update-tag.dto";

@Controller("tags")
export class TagsController {
  constructor(private readonly service: TagsService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Post()
  create(@Body() dto: CreateTagDto) {
    return this.service.create(dto);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateTagDto) {
    return this.service.update(id, dto);
  }

  @Delete()
  delete(@Query("id") id: string) {
    return this.service.delete(id);
  }
}
