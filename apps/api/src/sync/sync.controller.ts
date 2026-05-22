import { Body, Controller, Get, Headers, Post, UseGuards } from "@nestjs/common";
import { ApiBody, ApiHeader, ApiTags } from "@nestjs/swagger";
import { SyncInventoryRequestSchema } from "@ecommerce/shared";
import type { SyncInventoryRequest } from "@ecommerce/shared";
import { Roles } from "../auth/rbac.js";
import { RolesGuard } from "../auth/roles.guard.js";
import { SyncInventoryRequestDto } from "./sync.openapi.js";
import { SyncService } from "./sync.service.js";

@ApiTags("channels")
@ApiHeader({ name: "x-account-id", required: true })
@UseGuards(RolesGuard)
@Controller()
export class SyncController {
  constructor(private readonly sync: SyncService) {}

  @Get("channels")
  @Roles("owner", "admin", "staff", "seller")
  channels(@Headers("x-account-id") accountId: string) {
    return this.sync.listChannels(accountId);
  }

  @Get("sync-jobs")
  @Roles("owner", "admin", "staff")
  jobs(@Headers("x-account-id") accountId: string) {
    return this.sync.listJobs(accountId);
  }

  @Post("sync-jobs/push-listing")
  @Roles("owner", "admin")
  pushListing(
    @Headers("x-account-id") accountId: string,
    @Body("productId") productId: string,
    @Body("channelId") channelId: string
  ) {
    return this.sync.pushListing(accountId, productId, channelId);
  }

  @Post("sync-jobs/pull-orders")
  @Roles("owner", "admin", "staff")
  pullOrders(@Headers("x-account-id") accountId: string, @Body("channelId") channelId: string) {
    return this.sync.pullOrders(accountId, channelId);
  }

  @Post("sync-jobs/update-inventory")
  @Roles("owner", "admin", "staff", "seller")
  @ApiBody({ type: SyncInventoryRequestDto })
  updateInventory(
    @Headers("x-account-id") accountId: string,
    @Body() body: SyncInventoryRequest
  ) {
    const input = SyncInventoryRequestSchema.parse(body);
    return this.sync.updateInventory(accountId, input);
  }
}
