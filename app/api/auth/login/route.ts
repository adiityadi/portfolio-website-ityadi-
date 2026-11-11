import { cookies } from "next/headers";
import { api, ApiError, json, readJson } from "../../../lib/server";
import { authConfigured, SESSION_COOKIE, verifyWriteOrigin } from "../../../lib/auth";
import { createSession, SESSION_SECONDS, verifyPassword } from "../../../lib/auth-core";
import { claimLoginAttempt } from "../../../lib/storage";
export const dynamic="force-dynamic";
export async function POST(request:Request){return api(async()=>{
  verifyWriteOrigin(request);
  if(!authConfigured()) throw new ApiError(503,"The owner studio is awaiting hosting setup.");
  const input=await readJson(request);
  if(typeof input?.password!=="string" || input.password.length>1024) throw new ApiError(400,"Enter your owner password.");
  await claimLoginAttempt();
  if(!await verifyPassword(input.password,process.env.ADMIN_PASSWORD_HASH!)) throw new ApiError(401,"The password is incorrect.");
  (await cookies()).set(SESSION_COOKIE,createSession(process.env.SESSION_SECRET!,process.env.ADMIN_PASSWORD_HASH!),{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"strict",path:"/",maxAge:SESSION_SECONDS});
  return json({ok:true});
});}
