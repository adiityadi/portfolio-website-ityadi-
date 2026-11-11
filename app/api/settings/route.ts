import { saveSettings, json, owner, readJson, api } from "../../lib/server";
import { validateSettings } from "../../lib/validation";
export const dynamic = "force-dynamic";
export async function PUT(request: Request) { return api(async () => { await owner(request); const settings = validateSettings(await readJson(request)); await saveSettings(settings); return json({settings}); }); }
