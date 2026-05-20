import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module.js";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: [/^http:\/\/localhost:\d+$/, /^https:\/\/.*yourdomain\.com$/],
    credentials: true
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true
    })
  );

  const config = new DocumentBuilder()
    .setTitle("Ecommerce API")
    .setDescription("OMS, inventory, channels, listings, sync jobs, and sync errors")
    .setVersion("0.1.0")
    .addBearerAuth()
    .addApiKey({ type: "apiKey", name: "x-account-id", in: "header" }, "account")
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("docs", app, document);

  await app.listen(process.env.PORT ? Number(process.env.PORT) : 3001);
}

void bootstrap();
