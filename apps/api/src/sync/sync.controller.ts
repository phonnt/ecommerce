import { Body, Controller, Get, Headers, Post, UseGuards } from "@nestjs/common";
import { ApiHeader, ApiTags } from "@nestjs/swagger";
import { Roles } from "../auth/rbac.js";
import { RolesGuard } from "../auth/roles.guard.js";
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
  updateInventory(
    @Headers("x-account-id") accountId: string,
    @Body("productId") productId: string,
    @Body("channelId") channelId: string
  ) {
    return this.sync.updateInventory(accountId, productId, channelId);
  }
}
