import { HTTPException } from "hono/http-exception";

type FieldType = "string" | "int" | "nullableInt" | "stringArray" | "intArray";

interface Field {
  key: string;
  column: string;
  type: FieldType;
  required?: boolean;
  max?: number;
}

interface Resource {
  table: string;
  fields: Field[];
}

const sort: Field = { key: "sort", column: "sort", type: "int" };

export const RESOURCES = {
  teams: {
    table: "teams",
    fields: [
      { key: "name", column: "name", type: "string", required: true, max: 100 },
      { key: "projectTitle", column: "project_title", type: "string", max: 100 },
      { key: "members", column: "members", type: "stringArray" },
      { key: "topicIds", column: "topic_ids", type: "intArray", max: 1_000_000 },
      { key: "progress", column: "progress", type: "intArray" },
      { key: "password", column: "password", type: "string", max: 100 },
      sort,
    ],
  },
  topics: {
    table: "topics",
    fields: [
      { key: "title", column: "title", type: "string", required: true, max: 200 },
      { key: "description", column: "description", type: "string", max: 5000 },
      { key: "color", column: "color", type: "string", max: 20 },
      sort,
    ],
  },
  schedule: {
    table: "schedule_items",
    fields: [
      { key: "timeLabel", column: "time_label", type: "string", max: 50 },
      { key: "title", column: "title", type: "string", required: true, max: 200 },
      { key: "description", column: "description", type: "string", max: 5000 },
      sort,
    ],
  },
  prompts: {
    table: "prompts",
    fields: [
      { key: "title", column: "title", type: "string", required: true, max: 200 },
      { key: "tool", column: "tool", type: "string", max: 100 },
      { key: "body", column: "body", type: "string", max: 20000 },
      sort,
    ],
  },
  materials: {
    table: "materials",
    fields: [
      { key: "title", column: "title", type: "string", required: true, max: 200 },
      { key: "description", column: "description", type: "string", max: 5000 },
      { key: "url", column: "url", type: "string", max: 500 },
      { key: "body", column: "body", type: "string", max: 50000 },
      sort,
    ],
  },
  judges: {
    table: "judges",
    fields: [{ key: "name", column: "name", type: "string", required: true, max: 50 }, sort],
  },
  tools: {
    table: "tools",
    fields: [
      { key: "name", column: "name", type: "string", required: true, max: 100 },
      { key: "description", column: "description", type: "string", max: 5000 },
      { key: "url", column: "url", type: "string", max: 500 },
      { key: "vendor", column: "vendor", type: "string", max: 50 },
      { key: "color", column: "color", type: "string", max: 20 },
      sort,
    ],
  },
} satisfies Record<string, Resource>;

export type ResourceName = keyof typeof RESOURCES;

export function isResourceName(name: string): name is ResourceName {
  return Object.hasOwn(RESOURCES, name);
}

function bad(message: string): never {
  throw new HTTPException(400, { message });
}

function isInt(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

function toColumnValue(field: Field, value: unknown): string | number | null {
  switch (field.type) {
    case "string": {
      if (typeof value !== "string") bad(`${field.key} must be a string`);
      const trimmed = value.trim();
      if (field.required && trimmed === "") bad(`${field.key} is required`);
      if (trimmed.length > (field.max ?? 1000)) bad(`${field.key} is too long`);
      return trimmed;
    }
    case "int":
      if (!isInt(value)) bad(`${field.key} must be an integer`);
      return value;
    case "nullableInt":
      if (value !== null && !isInt(value)) bad(`${field.key} must be an integer or null`);
      return value;
    case "stringArray": {
      if (!Array.isArray(value) || value.length > 50) bad(`${field.key} must be a list`);
      const items = value.map((item) => {
        if (typeof item !== "string" || item.length > 100) bad(`${field.key} has an invalid entry`);
        return item.trim();
      });
      return JSON.stringify(items.filter((item) => item !== ""));
    }
    case "intArray": {
      if (!Array.isArray(value) || value.length > 50) bad(`${field.key} must be a list`);
      for (const item of value) {
        if (!isInt(item) || item < 0 || item > (field.max ?? 50)) bad(`${field.key} has an invalid entry`);
      }
      return JSON.stringify([...new Set(value as number[])].sort((a, b) => a - b));
    }
  }
}

function fromRow(resource: Resource, row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { id: row.id };
  for (const field of resource.fields) {
    const raw = row[field.column];
    out[field.key] =
      field.type === "stringArray" || field.type === "intArray" ? JSON.parse(raw as string) : raw;
  }
  return out;
}

function assignments(
  resource: Resource,
  body: unknown,
  allowed?: string[],
): { column: string; value: string | number | null }[] {
  if (typeof body !== "object" || body === null) bad("Expected a JSON object");
  const input = body as Record<string, unknown>;
  return resource.fields
    .filter((field) => field.key in input && (!allowed || allowed.includes(field.key)))
    .map((field) => ({ column: field.column, value: toColumnValue(field, input[field.key]) }));
}

export function listStatement(db: D1Database, name: ResourceName): D1PreparedStatement {
  return db.prepare(`SELECT * FROM ${RESOURCES[name].table} ORDER BY sort, id`);
}

export function mapRows<T>(name: ResourceName, rows: Record<string, unknown>[]): T[] {
  return rows.map((row) => fromRow(RESOURCES[name], row) as T);
}

export async function listResource<T>(db: D1Database, name: ResourceName): Promise<T[]> {
  const { results } = await listStatement(db, name).all<Record<string, unknown>>();
  return mapRows<T>(name, results);
}

export async function createResource(db: D1Database, name: ResourceName, body: unknown) {
  const resource: Resource = RESOURCES[name];
  const set = assignments(resource, body);
  for (const field of resource.fields) {
    if (field.required && !set.some((entry) => entry.column === field.column)) {
      bad(`${field.key} is required`);
    }
  }
  const row = await db
    .prepare(
      `INSERT INTO ${resource.table} (${set.map((entry) => entry.column).join(", ")}) ` +
        `VALUES (${set.map(() => "?").join(", ")}) RETURNING *`,
    )
    .bind(...set.map((entry) => entry.value))
    .first<Record<string, unknown>>();
  return fromRow(resource, row!);
}

/** Updates the given fields; `allowed` narrows which keys the caller may touch. */
export async function updateResource(
  db: D1Database,
  name: ResourceName,
  id: number,
  body: unknown,
  allowed?: string[],
) {
  const resource: Resource = RESOURCES[name];
  const set = assignments(resource, body, allowed);
  if (set.length === 0) bad("Nothing to update");
  const row = await db
    .prepare(
      `UPDATE ${resource.table} SET ${set.map((entry) => `${entry.column} = ?`).join(", ")} ` +
        "WHERE id = ? RETURNING *",
    )
    .bind(...set.map((entry) => entry.value), id)
    .first<Record<string, unknown>>();
  if (!row) throw new HTTPException(404, { message: "Not found" });
  return fromRow(resource, row);
}

export async function deleteResource(db: D1Database, name: ResourceName, id: number) {
  await db.prepare(`DELETE FROM ${RESOURCES[name].table} WHERE id = ?`).bind(id).run();
}
