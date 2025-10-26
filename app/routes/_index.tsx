import { createClient } from '~/lib/supabase/server'
import { type LoaderFunctionArgs, redirect, useLoaderData } from 'react-router'
import MapApp from '~/maps/maps'

export const action = async ({ request }: { request: Request }) => {
  const { supabase } = createClient(request)
  const formData = await request.formData()

  const action = formData.get('action') as string

  const potholeId = formData.get('potholeId') as string
  const userId = formData.get('userId') as string

  try {
    if (action === 'upvote') {
      const { data: existingUpvotes, error: checkError } = await supabase
        .from('pothole_upvotes')
        .select('*')
        .eq('pothole_id', potholeId)
        .eq('user_id', userId)
        .eq('vote_type', 'upvote');

      if (checkError) throw checkError;

      if (existingUpvotes && existingUpvotes.length > 0) {
        return { error: 'You have already upvoted this pothole!' };
      }

      const { error } = await supabase
        .from('pothole_upvotes')
        .insert({
          pothole_id: potholeId,
          user_id: userId,
          vote_type: 'upvote'
        });

      if (error) throw error;

      return { success: true, action: 'upvote', potholeId };
    }

    if (action === 'downvote') {
      const { data: existingDownvotes, error: checkError } = await supabase
        .from('pothole_upvotes')
        .select('*')
        .eq('pothole_id', potholeId)
        .eq('user_id', userId)
        .eq('vote_type', 'downvote');

      if (checkError) throw checkError;

      if (existingDownvotes && existingDownvotes.length > 0) {
        return { error: 'You have already downvoted this pothole!' };
      }

      const { error } = await supabase
        .from('pothole_upvotes')
        .insert({
          pothole_id: potholeId,
          user_id: userId,
          vote_type: 'downvote'
        });

      if (error) throw error;

      return { success: true, action: 'downvote', potholeId };
    }

    return { error: 'Invalid action' };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'An error occurred' };
  }
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { supabase } = createClient(request)

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    return redirect('/login')
  }
  
  const { data: potholes, error: potholesError } = await supabase
    .from('potholes')
    .select('*')
    .order('created_at', { ascending: false });

  console.log('_index loader: Fetched potholes:', potholes?.length || 0);
  if (potholesError) {
    console.error("Failed to fetch potholes:", potholesError);
  }

  return {
    user: data.user,
    potholes: potholes || []
  }
}

// export function meta({}: Route.MetaArgs) {
//   return [
//     { title: "New React Router App" },
//     { name: "description", content: "Welcome to React Router!" },
//   ];
// }

export default function Home() {
  const { user, potholes } = useLoaderData<typeof loader>()

  console.log('Home component: Received potholes:', potholes.length);
  console.log('Home component: potholes data:', potholes);

  return <MapApp initialPotholes={potholes} user={user} />;
}
