import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function ExperienceEntry() {
  // Whop may mount the app at /experiences/[experienceId]. We don't need the id
  // for the UI today, so route users to the public landing page by default.
  redirect("/");
}


