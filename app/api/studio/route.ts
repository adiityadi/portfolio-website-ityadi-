import { allProjects, getSettings, json, owner, api } from "../../lib/server";
export const dynamic = "force-dynamic";
export async function GET(request: Request) { return api(async () => { const user = await owner(request); const [projects,settings] = await Promise.all([allProjects(true),getSettings()]); return json({projects,settings,owner:{displayName:user.displayName,email:user.email}}); }); }
