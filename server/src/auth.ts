import jwt from "jsonwebtoken";
import type { FastifyReply, FastifyRequest } from "fastify";
import { getClientSecret } from "./config";

export interface MondaySessionPayload {
  accountId?: number;
  userId?: number;
  iat?: number;
  exp?: number;
  [key: string]: unknown;
}

declare module "fastify" {
  interface FastifyRequest {
    mondaySession?: MondaySessionPayload;
  }
}

function readBearerToken(request: FastifyRequest): string | null {
  const authHeader = request.headers.authorization;
  if (!authHeader) {
    return null;
  }

  const [scheme, token] = authHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }
  return token;
}

/**
 * Validates monday session token for authenticated API routes.
 * Local bypass is allowed only when explicitly enabled and NODE_ENV is non-production.
 */
export async function requireSessionToken(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const isDev = process.env.NODE_ENV !== "production";
  if (isDev && process.env.SKIP_AUTH === "true") {
    request.log.warn("Auth bypassed via SKIP_AUTH in non-production environment.");
    request.mondaySession = { userId: 0, accountId: 0 };
    return;
  }

  const token = readBearerToken(request);
  if (!token) {
    reply.status(401).send({ error: "Missing Bearer token." });
    return;
  }

  let clientSecret: string;
  try {
    clientSecret = getClientSecret();
  } catch (err) {
    request.log.error({ err }, "MONDAY_CLIENT_SECRET is not configured");
    reply.status(500).send({ error: "Server misconfiguration: client secret missing." });
    return;
  }

  try {
    const payload = jwt.verify(token, clientSecret) as MondaySessionPayload;
    request.mondaySession = payload;
  } catch (err) {
    request.log.warn({ err }, "Session token verification failed");
    reply.status(401).send({ error: "Invalid session token." });
  }
}
