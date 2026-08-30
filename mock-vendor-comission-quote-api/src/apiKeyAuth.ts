import type { NextFunction, Request, Response } from "express";

export function apiKeyAuth(req: Request, res: Response, next: NextFunction): void {
  const expectedKey = process.env.VENDOR_API_KEY;
  const providedKey = req.header("api-key");

  if (!expectedKey) {
    // Misconfigured server — fail closed rather than silently accepting every request.
    res.status(500).json({ error: "Vendor API key is not configured" });
    return;
  }

  if (!providedKey || providedKey !== expectedKey) {
    res.status(401).json({ error: "Missing or invalid api-key header" });
    return;
  }

  next();
}
