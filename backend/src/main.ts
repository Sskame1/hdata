/* Точка входа. CORS, ValidationPipe, BigInt serialisation patch. */
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";

/* Prisma BigInt → Number (иначе JSON.stringify ломается) */
(BigInt.prototype as unknown as Record<string, unknown>).toJSON = function () {
  return Number(this);
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({ origin: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  await app.listen(process.env.PORT ?? 4000);
  console.log(`Backend listening on http://localhost:${process.env.PORT ?? 4000}`);
}
bootstrap();
