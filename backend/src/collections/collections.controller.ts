/* CRUD коллекций */
import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from "@nestjs/common";
import { CollectionsService } from "./collections.service";
import { CreateCollectionDto } from "./dto/create-collection.dto";
import { UpdateCollectionDto } from "./dto/update-collection.dto";

@Controller("collections")
export class CollectionsController {
  constructor(private readonly service: CollectionsService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Post()
  create(@Body() dto: CreateCollectionDto) {
    return this.service.create(dto);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateCollectionDto) {
    return this.service.update(id, dto);
  }

  @Delete()
  delete(@Query("id") id: string) {
    return this.service.delete(id);
  }
}
