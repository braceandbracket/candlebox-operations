import cors from "@fastify/cors";
import Fastify from "fastify";
import { z } from "zod";
import { EnvironmentVariablesManager } from "@mondaycom/apps-sdk";
import { requireSessionToken } from "./auth";
import { APP_PORT } from "./config";
import { createFragrance, deleteFragrance, listFragrances, updateFragrance } from "./fragrance-store";
import { mondayGraphql } from "./monday-api";
import { fragranceInputSchema, fragranceUpdateSchema } from "./schema";
import { calculateSlaDueDate } from "./sla";

// Inject monday code environment variables into process.env at startup
new EnvironmentVariablesManager({ updateProcessEnv: true });

const idParamsSchema = z.object({ id: z.string().min(1) });

type GetItemResponse = {
  items: Array<{ id: string; column_values: Array<{ id: string; text: string | null }> }>;
};

const slaWebhookSchema = z.object({
  pulseId: z.coerce.number().int().positive(),
  boardId: z.coerce.number().int().positive(),
  userId: z.coerce.number().int().positive().optional(),
  inputFields: z.record(z.string(), z.unknown()).optional(),
});

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

  /**
   * SLA webhook
   * @param {Object} request - Request object
   * @param {Object} reply - Reply object
   * @returns {Object} - SLA
   */
  app.post("/webhooks/sla", async (request, reply) => {
    const parsed = slaWebhookSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400).send({ error: parsed.error.flatten() });
      return;
    }

    const mondayToken = request.headers["x-monday-token"];
    if (typeof mondayToken !== "string" || !mondayToken) {
      reply.status(401).send({ error: "Missing x-monday-token header." });
      return;
    }

    const { pulseId, boardId } = parsed.data;
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
      reply.status(404).send({ error: "Item not found for SLA calculation." });
      return;
    }

    const qtyColumnId = "numbers";
    const dueDateColumnId = "date_13";
    const statusColumnId = "status";

    const qtyColumn = item.column_values.find((column) => column.id === qtyColumnId);
    const quantity = Number.parseInt(qtyColumn?.text ?? "1", 10);
    const dueDate = calculateSlaDueDate(Number.isFinite(quantity) ? quantity : 1);

    const mutation = `
      mutation UpdateSla($boardId: ID!, $itemId: ID!, $columnValues: JSON!) {
        change_multiple_column_values(board_id: $boardId, item_id: $itemId, column_values: $columnValues) {
          id
        }
      }
    `;
    const columnValues = JSON.stringify({
      [dueDateColumnId]: { date: dueDate },
      [statusColumnId]: { label: "In Queue" },
    });

    await mondayGraphql(mutation, mondayToken, { boardId, itemId: pulseId, columnValues });
    reply.status(200).send({ ok: true, dueDate });
  });

  try {
    await app.listen({ port: APP_PORT, host: "0.0.0.0" });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

startServer();
