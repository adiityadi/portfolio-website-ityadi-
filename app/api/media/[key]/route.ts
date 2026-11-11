import { api, ApiError, owner, allProjects, getSettings } from "../../../lib/server";
import { database } from "../../../lib/storage";
import type { RowDataPacket } from "mysql2";
export const dynamic = "force-dynamic";
export async function GET(request: Request, context: {params:Promise<{key:string}>}) { return api(async () => {
  const {key} = await context.params;
  if (!/^[a-f0-9-]{36}\.(png|jpg|webp|gif|glb)$/.test(key)) throw new ApiError(404,"File not found.");
  const relativeUrl=`/api/media/${key}`;
  const origin=process.env.APP_URL || request.url;
  const absoluteUrl=new URL(relativeUrl,origin).href;
  const [projects,settings]=await Promise.all([allProjects(),getSettings()]);
  const references=[relativeUrl,absoluteUrl];
  const isPublic=projects.some(p=>references.includes(p.imageUrl)||references.includes(p.modelUrl)) || references.includes(settings.logoUrl) || references.includes(settings.portraitUrl);
  if(!isPublic) await owner(request);
  const [rows]=await database().execute<RowDataPacket[]>("SELECT content_type,content FROM portfolio_media WHERE media_key=?",[key]);
  if(!rows[0]) throw new ApiError(404,"File not found.");
  const body=new Uint8Array(rows[0].content as Buffer);
  return new Response(body,{headers:{"Content-Type":String(rows[0].content_type),"Content-Length":String(body.byteLength),"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff","Content-Disposition":`inline; filename="${key}"`}});
});}
