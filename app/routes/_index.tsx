import { createClient } from "~/lib/supabase/server";
import { type LoaderFunctionArgs, redirect, useLoaderData } from "react-router";
import MapApp from "~/maps/maps";

// Removed action - upvote/downvote functionality moved to client-side

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { supabase } = createClient(request);

  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    return redirect("/login");
  }

  const { data: potholes, error: potholesError } = await supabase
    .from("potholes")
    .select("*")
    .order("created_at", { ascending: false });

  console.log("_index loader: Fetched potholes:", potholes?.length || 0);
  if (potholesError) {
    console.error("Failed to fetch potholes:", potholesError);
  }

  return {
    user: data.user,
    potholes: potholes || [],
  };
};

// export function meta({}: Route.MetaArgs) {
//   return [
//     { title: "New React Router App" },
//     { name: "description", content: "Welcome to React Router!" },
//   ];
// }

export default function Home() {
  const { user, potholes } = useLoaderData<typeof loader>();

  // console.log('Home component: Received potholes:', potholes.length);
  // console.log('Home component: potholes data:', potholes);

  return <MapApp initialPotholes={potholes} user={user} />;
}
