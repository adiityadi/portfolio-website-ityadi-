import { allProjects, json, owner, readJson, saveProject, api, ApiError } from "../../../lib/server";
import { validateProject } from "../../../lib/validation";
export const dynamic = "force-dynamic";
type Context = {params: Promise<{id:string}>};
export async function PUT(request: Request, context: Context) { return api(async () => {
  await owner(request); const {id} = await context.params;
  if (!(await allProjects(true)).some(p => p.id === id)) throw new ApiError(404,"Project not found.");
  const project = validateProject(await readJson(request),id); await saveProject(project); return json({project});
}); }
export async function DELETE(request: Request, context: Context) { return api(async () => {
  await owner(request); const {id} = await context.params;
  const project = (await allProjects(true)).find(p => p.id === id);
  if (!project) throw new ApiError(404,"Project not found.");
  await saveProject(project,true);
  return json({ok:true});
}); }
