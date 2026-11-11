import { redirect } from "next/navigation";
import { getOwnerSession } from "../lib/auth";
import Studio from "./Studio";
import "./studio.css";

export const dynamic = "force-dynamic";

export default async function StudioPage() {
  if (!await getOwnerSession()) redirect("/studio/login");
  return <Studio />;
}
