import { createClient as createServerClient } from '~/lib/supabase/server'
import { type LoaderFunctionArgs, redirect, useLoaderData } from 'react-router'
import ReportApp from '~/reports/reports'

async function getStateAndCounty(lat: number, lon: number) {
  const baseUrl = "https://geocoding.geo.census.gov/geographies/coordinates";
  const params = new URLSearchParams({
    x: lon.toString(), // longitude
    y: lat.toString(), // latitude
    benchmark: "Public_AR_Current",
    vintage: "Current_Current",
    format: "json"
  });

  const response = await fetch(`${baseUrl}?${params.toString()}`);
  const data = await response.json();

  const state = data.result.geographies.States?.[0]?.NAME || "Unknown";
  const county = data.result.geographies.Counties?.[0]?.NAME || "Unknown";

  console.log(`State: ${state}`);
  console.log(`County: ${county}`);

  return { state, county };
}

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { supabase } = createServerClient(request)

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    return redirect('/login')
  }

  const { uuid } = params;

  // Fetch the report from database
  const { data: report, error: reportError } = await supabase
    .from('reports')
    .select('*')
    .eq('id', uuid)
    .eq('user_id', data.user.id)
    .single()

  if (reportError || !report) {
    return redirect('/report')
  }

  const url = new URL(request.url);
  const lat = report.lat?.toString() || url.searchParams.get("lat");
  const lng = report.lng?.toString() || url.searchParams.get("lng");

  let county = report.county || "";
  if (lat && lng && !county) {
    try {
      const { county: fetchedCounty } = await getStateAndCounty(parseFloat(lat), parseFloat(lng));
      county = fetchedCounty;
    } catch (error) {
      console.error("Error fetching county:", error);
      county = "Unknown";
    }
  }

  return {
    user: data.user,
    report,
    lat,
    lng,
    county
  }
}

export default function Report() {
  const { user, report, lat, lng, county } = useLoaderData<typeof loader>()

  return <ReportApp user={user} report={report} lat={lat} lng={lng} county={county} />;
}
