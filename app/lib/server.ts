import "server-only";
import type { RowDataPacket } from "mysql2";
import { database, databaseConfigured } from "./storage";
import { getOwnerSession, verifyWriteOrigin } from "./auth";
import { seedProjects, defaultSettings, type Project, type Settings } from "./data";
import { ApiError } from "./validation";

export { ApiError };

export async function owner(request?: Request) {
  if (request && !["GET","HEAD"].includes(request.method)) verifyWriteOrigin(request);
  const user = await getOwnerSession();
  if (!user) throw new ApiError(401, "Sign in to open your studio.");
  return user;
}

export async function allProjects(includeDrafts = false): Promise<Project[]> {
  const merged = new Map(seedProjects.map(p => [p.id,p]));
  if (databaseConfigured()) {
    const [rows] = await database().execute<RowDataPacket[]>("SELECT id,data,archived FROM portfolio_projects");
    for (const row of rows) {
      if (row.archived) merged.delete(row.id);
      else merged.set(row.id, typeof row.data === "string" ? JSON.parse(row.data) : row.data);
    }
  }
  return [...merged.values()].filter(p => includeDrafts || p.published).sort((a,b) => a.sortOrder-b.sortOrder || a.title.localeCompare(b.title));
}

export async function getSettings(): Promise<Settings> {
  if (!databaseConfigured()) return defaultSettings;
  const [rows] = await database().execute<RowDataPacket[]>("SELECT data FROM portfolio_settings WHERE id=1");
  return rows[0] ? {...defaultSettings,...(typeof rows[0].data === "string" ? JSON.parse(rows[0].data) : rows[0].data)} : defaultSettings;
}

export async function saveProject(project: Project, archived = false) {
  await database().execute("INSERT INTO portfolio_projects (id,data,archived) VALUES (?,?,?) ON DUPLICATE KEY UPDATE data=VALUES(data),archived=VALUES(archived)",[project.id,JSON.stringify(project),archived ? 1 : 0]);
}
export async function saveSettings(settings:Settings) {
  await database().execute("INSERT INTO portfolio_settings (id,data) VALUES (1,?) ON DUPLICATE KEY UPDATE data=VALUES(data)",[JSON.stringify(settings)]);
}

export async function readJson(request: Request) {
  if (!request.headers.get("content-type")?.includes("application/json")) throw new ApiError(415,"Send JSON project details.");
  const text = new TextDecoder().decode(await boundedBody(request,65536));
  try { return JSON.parse(text); } catch { throw new ApiError(400,"The submitted details are not valid JSON."); }
}

export async function boundedBody(request: Request, max: number): Promise<Uint8Array<ArrayBuffer>> {
  if (Number(request.headers.get("content-length") || 0) > max) throw new ApiError(413,"The submitted data is too large.");
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader(); const chunks: Uint8Array[] = []; let length = 0;
  try {
    for (;;) {
      const {done,value} = await reader.read(); if (done) break;
      length += value.byteLength;
      if (length > max) { await reader.cancel(); throw new ApiError(413,"The submitted data is too large."); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const result = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { result.set(chunk,offset); offset += chunk.byteLength; }
  return result;
}

export function json(value: unknown, status = 200) {
  return Response.json(value,{status,headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
}

export function api(handler: () => Promise<Response>): Promise<Response> {
  return handler().catch(error => {
    if (error instanceof ApiError) return json({error:error.message},error.status);
    console.error("Portfolio API failed", error instanceof Error ? error.name : "unknown error");
    return json({error:"The portfolio store is temporarily unavailable. Please try again."},503);
  });
}
