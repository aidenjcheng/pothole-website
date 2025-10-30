import { createClient } from "~/lib/supabase/server";
import { type ActionFunctionArgs } from "react-router";

interface GoogleGeocodeResponse {
  results: Array<{
    address_components: Array<{
      long_name: string;
      short_name: string;
      types: string[];
    }>;
    formatted_address: string;
    geometry: {
      location: {
        lat: number;
        lng: number;
      };
    };
    types: string[];
  }>;
  status: string;
}

export async function action({ request }: ActionFunctionArgs) {
  const { lat, lng } = await request.json();

  if (typeof lat !== "number" || typeof lng !== "number") {
    return new Response(JSON.stringify({ error: "Invalid coordinates" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Get API key from environment - this runs on server so process is available
  const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error:
          "Google Maps API key not configured. Please add VITE_GOOGLE_MAPS_API_KEY to your .env.local file",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Google API error: ${response.status}`);
    }

    const data: GoogleGeocodeResponse = await response.json();

    if (data.status !== "OK") {
      throw new Error(`Geocoding failed: ${data.status}`);
    }

    // Find the county (administrative_area_level_2)
    let county = "Unknown";
    let state = "Unknown";

    // Look through all results to find the most comprehensive address
    for (const result of data.results) {
      if (
        result.types.includes("street_address") ||
        result.types.includes("route")
      ) {
        // This is likely the most specific result
        for (const component of result.address_components) {
          if (component.types.includes("administrative_area_level_2")) {
            county = component.long_name;
          }
          if (component.types.includes("administrative_area_level_1")) {
            state = component.short_name; // Use short name for states (e.g., "CA" instead of "California")
          }
        }
        break; // Found the specific address, stop looking
      }
    }

    // If we didn't find it in the specific result, look through all results
    if (county === "Unknown") {
      for (const result of data.results) {
        for (const component of result.address_components) {
          if (component.types.includes("administrative_area_level_2")) {
            county = component.long_name;
          }
          if (component.types.includes("administrative_area_level_1")) {
            state = component.short_name;
          }
        }
        if (county !== "Unknown") break;
      }
    }

    return new Response(JSON.stringify({ county, state }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in Google geocoding:", error);
    return new Response(
      JSON.stringify({ error: "Failed to get location information" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
