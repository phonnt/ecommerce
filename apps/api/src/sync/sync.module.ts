import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module.js";
import { ProductsModule } from "../products/products.module.js";
import { SyncController } from "./sync.controller.js";
import { SyncService } from "./sync.service.js";

@Module({
  imports: [DatabaseModule, ProductsModule],
  controllers: [SyncController],
  providers: [SyncService]
})
export class SyncModule {}
