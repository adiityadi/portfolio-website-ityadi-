import type { Project, Settings } from "./data";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}

export function verifyOrigin(origin: string | null, requestUrl: string) {
  if (!origin || origin !== new URL(requestUrl).origin) {
    throw new ApiError(403, "This action must come from your portfolio.");
  }
}

function string(value: unknown, label: string, max: number, required = false) {
  if (typeof value !== "string") throw new ApiError(400, `${label} must be text.`);
  const result = value.trim();
  if (result.length > max || (required && !result)) throw new ApiError(400, `${label} is missing or too long.`);
  return result;
}

export function safeUrl(value: unknown, label: string, mediaOnly = false) {
  const url = string(value, label, 2048);
  if (!url) return "";
  if (/^\/api\/media\/[a-zA-Z0-9_-]+\.(png|jpg|webp|gif|glb)$/.test(url)) return url;
  if (/^\/assets\/[a-zA-Z0-9_-]+\.(png|jpg|jpeg|webp|gif)$/.test(url)) return url;
  if (!mediaOnly) {
    try {
      const parsed = new URL(url);
      if (parsed.protocol === "https:" && !parsed.username && !parsed.password) return parsed.href;
    } catch { /* invalid URL */ }
  }
  throw new ApiError(400, `${label} must be an HTTPS URL or an uploaded file.`);
}

export function validateProject(value: unknown, id: string): Project {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ApiError(400, "Enter project details.");
  const p = value as Record<string, unknown>;
  if (p.category !== "2d" && p.category !== "3d") throw new ApiError(400, "Choose a 2D or 3D project.");
  if (typeof p.published !== "boolean") throw new ApiError(400, "Choose draft or published status.");
  if (typeof p.sortOrder !== "number" || !Number.isInteger(p.sortOrder) || p.sortOrder < 0 || p.sortOrder > 100000) throw new ApiError(400, "Display order must be a whole number from 0 to 100000.");
  const imageUrl = safeUrl(p.imageUrl ?? "", "Cover image");
  const modelUrl = safeUrl(p.modelUrl ?? "", "3D model");
  if (!imageUrl && !modelUrl) throw new ApiError(400, "Add a cover image or a GLB model.");
  if (p.category === "2d" && !imageUrl) throw new ApiError(400, "2D projects need a cover image.");
  return {
    id, title: string(p.title, "Title", 100, true), category: p.category,
    medium: string(p.medium ?? "", "Medium", 100),
    description: string(p.description ?? "", "Description", 4000),
    year: string(p.year ?? "", "Year", 12), imageUrl, modelUrl,
    sourceUrl: safeUrl(p.sourceUrl ?? "", "Project link"), published: p.published, sortOrder: p.sortOrder,
  };
}

export function validateSettings(value: unknown): Settings {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ApiError(400, "Enter profile settings.");
  const p = value as Record<string, unknown>;
  const accentColor = string(p.accentColor, "Accent colour", 7);
  const backgroundColor = string(p.backgroundColor, "Background colour", 7);
  if (![accentColor, backgroundColor].every(x => /^#[\da-fA-F]{6}$/.test(x))) throw new ApiError(400, "Choose valid six-digit hex colours.");
  return {
    name: string(p.name, "Name", 100, true), headline: string(p.headline, "Headline", 180, true),
    biography: string(p.biography ?? "", "Biography", 2000), accentColor, backgroundColor,
    portraitUrl: safeUrl(p.portraitUrl ?? "", "Portrait"), logoUrl: safeUrl(p.logoUrl ?? "", "Logo"), contactUrl: safeUrl(p.contactUrl ?? "", "Contact link"),
  };
}

export function inspectUpload(bytes: Uint8Array, mime: string): { extension: string; contentType: string; kind: "image" | "model" } {
  const exact = (a: number[], offset = 0) => a.every((b, i) => bytes[offset + i] === b);
  let result: { extension: string; contentType: string; kind: "image" | "model" } | undefined;
  if (bytes.length >= 24 && exact([137, 80, 78, 71, 13, 10, 26, 10])) result = {extension:"png",contentType:"image/png",kind:"image"};
  else if (bytes.length >= 4 && exact([255,216,255])) result = {extension:"jpg",contentType:"image/jpeg",kind:"image"};
  else if (bytes.length >= 12 && exact([82,73,70,70]) && exact([87,69,66,80],8)) result = {extension:"webp",contentType:"image/webp",kind:"image"};
  else if (bytes.length >= 13 && (exact([71,73,70,56,55,97]) || exact([71,73,70,56,57,97]))) result = {extension:"gif",contentType:"image/gif",kind:"image"};
  else if (bytes.length >= 20 && exact([103,108,84,70])) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const jsonLength = view.getUint32(12,true);
    if (view.getUint32(4,true) !== 2 || view.getUint32(8,true) !== bytes.length || view.getUint32(16,true) !== 0x4e4f534a || jsonLength < 4 || jsonLength % 4 !== 0 || jsonLength > bytes.length - 20) throw new ApiError(400,"Upload a valid GLB 2.0 file.");
    try {
      const gltf = JSON.parse(new TextDecoder().decode(bytes.subarray(20,20+jsonLength)).trim());
      if (gltf?.asset?.version !== "2.0") throw new Error("Missing GLTF asset version");
    } catch { throw new ApiError(400,"The GLB model metadata is invalid."); }
    result = {extension:"glb",contentType:"model/gltf-binary",kind:"model"};
  }
  if (!result || (mime !== result.contentType && !(result.kind === "model" && ["", "application/octet-stream"].includes(mime)))) throw new ApiError(400,"Upload a PNG, JPG, WebP, GIF or GLB file with a matching file type.");
  return result;
}
