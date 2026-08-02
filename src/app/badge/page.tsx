import { redirect } from "next/navigation";

/**
 * People strip the filename off an image URL to find out what made it. Landing
 * them on a 404 wastes the one moment they were curious about the source.
 */
export default function BadgeIndex() {
  redirect("/embed");
}
