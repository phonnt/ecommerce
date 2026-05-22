import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module.js";
import { ProductsController } from "./products.controller.js";
import { PublicProductsController } from "./public-products.controller.js";
import { InventoryService } from "./inventory.service.js";
import { ProductsService } from "./products.service.js";

@Module({
  imports: [DatabaseModule],
  controllers: [ProductsController, PublicProductsController],
  providers: [ProductsService, InventoryService],
  exports: [ProductsService, InventoryService]
})
export class ProductsModule {}
