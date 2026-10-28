import { Controller, Get } from "@nestjs/common";
import { StatService } from "./stat.service";

@Controller("stat")
export class StatController {
  constructor(private readonly service: StatService) {}

  @Get()
  getStats() {
    return this.service.getStats();
  }
}
