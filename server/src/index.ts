import cors from "@fastify/cors";
import Fastify from "fastify";
import { z } from "zod";
import { EnvironmentVariablesManager } from "@mondaycom/apps-sdk";
import { requireSessionToken } from "./auth";
import {
  APP_PORT,
  WEBHOOK_SCENT_COLUMN_ID,
  getMondayApiTokenFromEnv,
} from "./config";
import { createFragrance, deleteFragrance, listFragrances, updateFragrance } from "./fragrance-store";
import { addItemUpdate, createSubItem, mondayGraphql } from "./monday-api";
import { fragranceInputSchema, fragranceUpdateSchema } from "./schema";
import { readMondayAuthHeader, readMondayWebhookChallenge, splitScents } from "./webhook-helpers";

// Inject monday code environment variables into process.env at startup
new EnvironmentVariablesManager({ updateProcessEnv: true });

const idParamsSchema = z.object({ id: z.string().min(1) });

type GetItemResponse = {
  items: Array<{ id: string; column_values: Array<{ id: string; text: string | null }> }>;
};

const itemCreatedWebhookSchema = z.object({
  pulseId: z.coerce.number().int().positive(),
  boardId: z.coerce.number().int().positive(),
  userId: z.coerce.number().int().positive().optional(),
  inputFields: z.record(z.string(), z.unknown()).optional(),
});

const webhookEnvelopeSchema = z.object({
  event: itemCreatedWebhookSchema,
});

/**
 * Board automation webhooks ("When an item is created, send a webhook") do not include
 * a signed Authorization header — that only applies to webhooks created via an integration
 * app OAuth token. Ownership of this endpoint was verified via the monday challenge handshake,
 * and the URL itself is secret within monday-code's infrastructure.
 *
 * Board automation webhooks often omit auth headers; use env API token for GraphQL.
 */
function resolveMondayTokenForWebhook(headers: Record<string, unknown>): string | null {
  const fromRequest = readMondayAuthHeader(headers);
  if (fromRequest) {
    return fromRequest;
  }
  return getMondayApiTokenFromEnv();
}

const app = Fastify({ logger: true });

async function startServer() {
  await app.register(cors, { origin: true });

  /**
   * Health check endpoint
   * @returns {Object} - Health status
   */
  app.get("/health", async () => ({ ok: true }));

  /**
   * Get all fragrances
   * @param {Object} _request - Request object
   * @param {Object} reply - Reply object
   * @returns {Object} - Fragrances
   */
  app.get("/fragrances", { preHandler: requireSessionToken }, async (_request, reply) => {
    const fragrances = await listFragrances();
    reply.send({ data: fragrances });
  });

  /**
   * Create a new fragrance
   * @param {Object} request - Request object
   * @param {Object} reply - Reply object
   * @returns {Object} - Fragrance
   */
  app.post("/fragrances", { preHandler: requireSessionToken }, async (request, reply) => {
    const parsed = fragranceInputSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400).send({ error: parsed.error.flatten() });
      return;
    }
    const fragrance = await createFragrance(parsed.data);
    reply.status(201).send({ data: fragrance });
  });

  /**
   * Update a fragrance
   * @param {Object} request - Request object
   * @param {Object} reply - Reply object
   * @returns {Object} - Fragrance
   */
  app.put("/fragrances/:id", { preHandler: requireSessionToken }, async (request, reply) => {
    const parsedParams = idParamsSchema.safeParse(request.params);
    const parsedBody = fragranceUpdateSchema.safeParse(request.body);

    if (!parsedParams.success || !parsedBody.success) {
      reply.status(400).send({
        error: {
          params: parsedParams.success ? null : parsedParams.error.flatten(),
          body: parsedBody.success ? null : parsedBody.error.flatten(),
        },
      });
      return;
    }

    /**
     * Update a fragrance
     * @param {Object} id - Fragrance ID
     * @param {Object} parsedBody.data - Fragrance data
     * @returns {Object} - Fragrance
     */
    const fragrance = await updateFragrance(parsedParams.data.id, parsedBody.data);
    if (!fragrance) {
      reply.status(404).send({ error: "Fragrance not found." });
      return;
    }
    reply.send({ data: fragrance });
  });

  /**
   * Delete a fragrance
   * @param {Object} request - Request object
   * @param {Object} reply - Reply object
   * @returns {Object} - Fragrance
   */
  app.delete("/fragrances/:id", { preHandler: requireSessionToken }, async (request, reply) => {
    const parsedParams = idParamsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      reply.status(400).send({ error: parsedParams.error.flatten() });
      return;
    }
    const deleted = await deleteFragrance(parsedParams.data.id);
    if (!deleted) {
      reply.status(404).send({ error: "Fragrance not found." });
      return;
    }
    reply.status(204).send();
  });

  app.post("/webhooks/production-tasks", async (request, reply) => {
    const challenge = readMondayWebhookChallenge(request.body);
    if (challenge !== null) {
      reply.status(200).send({ challenge });
      return;
    }

    const parsedDirect = itemCreatedWebhookSchema.safeParse(request.body);
    const parsedEnvelope = webhookEnvelopeSchema.safeParse(request.body);
    const eventPayload = parsedDirect.success
      ? parsedDirect.data
      : parsedEnvelope.success
        ? parsedEnvelope.data.event
        : null;
    if (!eventPayload) {
      reply.status(400).send({
        error: {
          direct: parsedDirect.success ? null : parsedDirect.error.flatten(),
          envelope: parsedEnvelope.success ? null : parsedEnvelope.error.flatten(),
        },
      });
      return;
    }

    const mondayToken = resolveMondayTokenForWebhook(request.headers as Record<string, unknown>);
    if (!mondayToken) {
      reply.status(401).send({
        error:
          "No monday API credentials: board webhooks omit x-monday-token. Set MONDAY_API_TOKEN on the server (monday personal API token with access to this board).",
      });
      return;
    }

    try {
      const { pulseId } = eventPayload;
      const query = `
        query GetItem($itemId: [ID!]) {
          items(ids: $itemId) {
            id
            column_values { id text }
          }
        }
      `;

      const itemResult = await mondayGraphql<GetItemResponse>(query, mondayToken, { itemId: [pulseId] });
      const item = itemResult.items[0];
      if (!item) {
        reply.status(404).send({ error: "Item not found for production task creation." });
        return;
      }

      const scentColumn = item.column_values.find((column) => column.id === WEBHOOK_SCENT_COLUMN_ID);
      const scentNames = splitScents(scentColumn?.text).slice(0, 3);
      if (scentNames.length === 0) {
        reply.status(400).send({ error: "No scent profiles found in configured scent column." });
        return;
      }

      const fragrances = await listFragrances();
      const fragranceByName = new Map(
        fragrances.map((fragrance) => [fragrance.name.trim().toLowerCase(), fragrance])
      );

      const createdSubItems: string[] = [];
      for (const [index, scentName] of scentNames.entries()) {
        const subItemName = `Candle ${index + 1} - ${scentName}`;
        const subItemId = await createSubItem(mondayToken, pulseId, subItemName);
        createdSubItems.push(subItemId);

        const fragrance = fragranceByName.get(scentName.toLowerCase());
        const recipe = fragrance?.description?.trim();
        const updateBody = recipe && recipe.length > 0 ? `Recipe: ${recipe}` : `Recipe: ${scentName}`;
        await addItemUpdate(mondayToken, Number.parseInt(subItemId, 10), updateBody);
      }

      reply.status(200).send({ ok: true, subItems: createdSubItems });
    } catch (err) {
      request.log.error({ err }, "Production task webhook processing failed");
      reply.status(500).send({
        error: "Webhook processing failed.",
      });
    }
  });

  try {
    await app.listen({ port: APP_PORT, host: "0.0.0.0" });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

startServer();
