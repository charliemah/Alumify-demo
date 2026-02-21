import { describe, it, expect, afterEach } from "vitest";
import { buildApp } from "./app";

describe("health", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  afterEach(async () => {
    if (app) await app.close();
  });

  it("returns status ok", async () => {
    app = await buildApp();
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.status).toBe("ok");
    expect(body.timestamp).toBeDefined();
  });
});
