import { allProjects, getSettings, json, owner, readJson, saveProject, api } from "../../lib/server";
import { validateProject } from "../../lib/validation";
export const dynamic = "force-dynamic";
export async function GET() { return api(async () => { const [projects,settings] = await Promise.all([allProjects(),getSettings()]); return json({projects,settings}); }); }
export async function POST(request: Request) { return api(async () => { await owner(request); const project = validateProject(await readJson(request),crypto.randomUUID()); await saveProject(project); return json({project},201); }); }
