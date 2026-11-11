import { json, owner, api, ApiError, boundedBody } from "../../lib/server";
import { database } from "../../lib/storage";
import { inspectUpload } from "../../lib/validation";
export const dynamic = "force-dynamic";
const MAX = 8 * 1024 * 1024;
export async function POST(request: Request) { return api(async () => {
  await owner(request);
  if (!request.headers.get("content-type")?.startsWith("multipart/form-data")) throw new ApiError(415,"Choose a file to upload.");
  if (Number(request.headers.get("content-length") || 0) > MAX + 65536) throw new ApiError(413,"Files must be 8 MB or smaller.");
  const body = await boundedBody(request,MAX + 65536);
  let form: FormData;
  try { form = await new Response(body,{headers:{"Content-Type":request.headers.get("content-type")!}}).formData(); }
  catch { throw new ApiError(400,"The upload could not be read. Choose the file again."); }
  const file = form.get("file");
  if (!file || typeof file === "string" || file.size === 0) throw new ApiError(400,"Choose a non-empty file.");
  if (file.size > MAX) throw new ApiError(413,"Files must be 8 MB or smaller.");
  const buffer = await file.arrayBuffer(); const inspected = inspectUpload(new Uint8Array(buffer),file.type);
  const key = `${crypto.randomUUID()}.${inspected.extension}`;
  await database().execute("INSERT INTO portfolio_media (media_key,content_type,content) VALUES (?,?,?)",[key,inspected.contentType,Buffer.from(buffer)]);
  return json({url:`/api/media/${key}`,kind:inspected.kind,name:file.name},201);
}); }
