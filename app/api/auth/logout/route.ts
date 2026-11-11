import { cookies } from "next/headers";
import { api,json } from "../../../lib/server";
import { SESSION_COOKIE,verifyWriteOrigin } from "../../../lib/auth";
export async function POST(request:Request){return api(async()=>{
  verifyWriteOrigin(request);
  (await cookies()).set(SESSION_COOKIE,"",{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"strict",path:"/",maxAge:0});
  return json({ok:true});
});}
