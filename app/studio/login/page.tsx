import { redirect } from "next/navigation";
import { authConfigured, getOwnerSession } from "../../lib/auth";
import Login from "./Login";
import "../studio.css";
export const dynamic="force-dynamic";
export default async function LoginPage(){
  if(await getOwnerSession()) redirect("/studio");
  return <Login configured={authConfigured()}/>;
}
