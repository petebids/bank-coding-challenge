import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { MOCK_OUTCOME_HEADER } from "@commission-quote/shared";
import { createApp } from "./app.js";

const VALID_PAYLOAD = { loanAmount: 10_000, loanTermInMonths: 24, riskBand: "MEDIUM" };

beforeEach(() => {
  process.env.VENDOR_API_KEY = "test-api-key";
});

describe("POST /commission-quotes", () => {
  it("rejects requests without an api-key header", async () => {
    const app = createApp();
    const res = await request(app).post("/commission-quotes").send(VALID_PAYLOAD);
    expect(res.status).toBe(401);
  });

  it("rejects requests with the wrong api-key", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/commission-quotes")
      .set("api-key", "wrong-key")
      .send(VALID_PAYLOAD);
    expect(res.status).toBe(401);
  });

  it("rejects an invalid payload", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/commission-quotes")
      .set("api-key", "test-api-key")
      .send({ loanAmount: -5, loanTermInMonths: 24, riskBand: "MEDIUM" });
    expect(res.status).toBe(400);
  });

  it("returns a quote when forced to succeed", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/commission-quotes")
      .set("api-key", "test-api-key")
      .set(MOCK_OUTCOME_HEADER, "success")
      .send(VALID_PAYLOAD);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      commissionRate: 0.025,
      totalCommission: 250,
    });
    expect(typeof res.body.quoteId).toBe("string");
  });

  it("returns an error when forced to fail", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/commission-quotes")
      .set("api-key", "test-api-key")
      .set(MOCK_OUTCOME_HEADER, "error")
      .send(VALID_PAYLOAD);

    expect(res.status).toBe(502);
  });
});
