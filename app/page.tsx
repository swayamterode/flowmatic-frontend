import { redirect } from "next/navigation";

/**
 * `/` is not a page. Login pushes here and proxy.ts sends signed-in visitors
 * here from the auth routes, so it forwards to the real landing screen rather
 * than holding a copy of it.
 */
export default function Home() {
  redirect("/dashboard");
}
