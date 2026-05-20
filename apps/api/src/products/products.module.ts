import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module.js";
import { ProductsController } from "./products.controller.js";
import { PublicProductsController } from "./public-products.controller.js";
import { ProductsService } from "./products.service.js";

@Module({
  imports: [DatabaseModule],
  controllers: [ProductsController, PublicProductsController],
  providers: [ProductsService],
  exports: [ProductsService]
})
export class ProductsModule {}
