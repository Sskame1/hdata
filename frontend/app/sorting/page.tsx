/* /sorting — устарело, перенаправление на /media */
import { redirect } from "next/navigation";

export default function Page() {
  redirect("/media");
}
