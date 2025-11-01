import { redirect } from "next/navigation";

// Redirect to a main restaurant page
export default function Home() {
  redirect("/restaurants/ristorante-pizzeria-karalis");
}
