import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { AuthModule } from "./auth/auth.module.js";
import { TenantGuard } from "./auth/tenant.guard.js";
import { OrdersModule } from "./orders/orders.module.js";
import { ProductsModule } from "./products/products.module.js";
import { SyncModule } from "./sync/sync.module.js";

@Module({
  imports: [AuthModule, ProductsModule, OrdersModule, SyncModule],
  providers: [
    {
      provide: APP_GUARD,
      useClass: TenantGuard
    }
  ]
})
export class AppModule {}
