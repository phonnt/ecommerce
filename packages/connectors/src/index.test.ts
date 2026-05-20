import { describe, expect, it } from "vitest";
import { connectors } from "./index.js";

describe("mock marketplace connectors", () => {
  it("normalizes a successful sandbox connection", async () => {
    const result = await connectors.shopee.connect({
      accountId: "acct_1",
      channelId: "ch_1",
      credentials: { token: "sandbox" }
    });

    expect(result).toMatchObject({ ok: true, status: "success" });
  });
});
