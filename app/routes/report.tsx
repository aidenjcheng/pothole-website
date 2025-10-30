import { createClient as createServerClient } from "~/lib/supabase/server";
import { createClient as createBrowserClient } from "~/lib/supabase/client";
import {
  type LoaderFunctionArgs,
  redirect,
  useLoaderData,
  useNavigate,
} from "react-router";
import { Link } from "react-router";
import { useState, useEffect, useRef } from "react";
import { cn } from "~/lib/utils";
import {
  Plus,
  MoreVertical,
  MapPin,
  Calendar,
  CheckCircle,
  Clock,
  Compass,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import Sidebar from "~/components/sidebar/Sidebar";
import { Menu, MenuTrigger, MenuItem, MenuPopup } from "~/components/ui/menu";
import { CommandMenu } from "~/maps/maps";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "~/components/ui/dialog";
import type { Pothole } from "~/types/global";

interface Report {
  id: string;
  lat?: number;
  lng?: number;
  county?: string;
  status: "pending" | "completed";
  created_at: string;
  updated_at: string;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { supabase } = createServerClient(request);

  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    return redirect("/login");
  }

  const url = new URL(request.url);
  const lat = url.searchParams.get("lat");
  const lng = url.searchParams.get("lng");

  // If lat/lng are provided, create a new report and redirect to it
  if (lat && lng) {
    // Get county information using Google Geocoding
    let county = "";
    try {
      // Import and call the geocoding action directly on server
      const { action } = await import("~/actions/geocode.server");
      const result = await action({
        request: new Request("http://localhost", {
          method: "POST",
          body: JSON.stringify({ lat: parseFloat(lat), lng: parseFloat(lng) }),
          headers: { "Content-Type": "application/json" },
        }),
        params: {},
        context: {},
      } as any);

      if (result.status === 200) {
        const data = await result.json();
        county = data.county || "Unknown";
      } else {
        county = "Unknown";
      }
    } catch (error) {
      console.error("Error fetching county:", error);
      county = "Unknown";
    }

    // Create new report
    const { data: newReport, error: createError } = await supabase
      .from("reports")
      .insert({
        user_id: data.user.id,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        county,
        status: "pending",
      })
      .select()
      .single();

    if (createError) {
      console.error("Error creating report:", createError);
    } else if (newReport) {
      return redirect(`/reports/${newReport.id}`);
    }
  }

  // Fetch user's reports
  const { data: reports, error: reportsError } = await supabase
    .from("reports")
    .select("*")
    .eq("user_id", data.user.id)
    .order("created_at", { ascending: false });

  if (reportsError) {
    console.error("Error fetching reports:", reportsError);
  }

  return {
    user: data.user,
    reports: reports || [],
  };
};

export default function ReportsList() {
  const { user, reports } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [showSidebar, setShowSidebar] = useState<boolean>(true);
  const [commandDialogOpen, setCommandDialogOpen] = useState<boolean>(false);
  const [sidebarPotholes, setSidebarPotholes] = useState<Pothole[]>([]);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [potholes, setPotholes] = useState<Pothole[]>([]);
  const [selectedPothole, setSelectedPothole] = useState<Pothole | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<mapkit.Map | null>(null);
  const potholeToAnnotationRef = useRef<Map<string, mapkit.MarkerAnnotation>>(
    new Map()
  );
  const supabase = createBrowserClient();

  const handleOpenCommandMenu = () => {
    setCommandDialogOpen(true);
  };

  const handleCreateReport = () => {
    setDialogOpen(true);
  };

  // Load potholes for sidebar
  useEffect(() => {
    const loadSidebarPotholes = async () => {
      try {
        const { data, error } = await supabase
          .from("potholes")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(5);

        if (error) {
          console.error("Error loading sidebar potholes:", error);
        } else {
          setSidebarPotholes(data || []);
        }
      } catch (error) {
        console.error("Error loading sidebar potholes:", error);
      }
    };

    loadSidebarPotholes();
  }, []);

  // Load potholes when dialog opens
  useEffect(() => {
    if (dialogOpen) {
      loadPotholes();
    }
  }, [dialogOpen]);

  // Initialize map after potholes are loaded
  useEffect(() => {
    if (dialogOpen && potholes.length > 0 && !loading) {
      initializeMap();
    }
  }, [dialogOpen, potholes, loading]);

  // Cleanup map when dialog closes
  useEffect(() => {
    if (!dialogOpen && mapInstanceRef.current) {
      mapInstanceRef.current.destroy();
      mapInstanceRef.current = null;
      potholeToAnnotationRef.current.clear();
      setSelectedPothole(null);
    }
  }, [dialogOpen]);

  const loadPotholes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("potholes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading potholes:", error);
      } else {
        setPotholes(data || []);
      }
    } catch (error) {
      console.error("Error loading potholes:", error);
    } finally {
      setLoading(false);
    }
  };

  const initializeMap = () => {
    if (!window.mapkit || !mapContainerRef.current) return;

    // Initialize MapKit if not already done
    if (!window.mapkit.init) {
      window.mapkit.init({
        authorizationCallback: (done: (token: string) => void) => {
          done(import.meta.env.VITE_MAPKIT_TOKEN);
        },
      });
    }

    // Create map instance
    const map = new window.mapkit.Map(mapContainerRef.current, {
      center: new window.mapkit.Coordinate(39.0458, -76.6413), // Maryland center
    });

    mapInstanceRef.current = map;

    // Add pothole annotations
    potholes.forEach((pothole) => {
      const coordinate = new window.mapkit.Coordinate(
        pothole.latitude,
        pothole.longitude
      );
      const annotation = new window.mapkit.MarkerAnnotation(coordinate, {
        title: pothole.name,
        color: "#ff6b6b",
      });

      map.addAnnotation(annotation);
      potholeToAnnotationRef.current.set(pothole.id, annotation);
    });
  };

  const focusOnPothole = (pothole: Pothole) => {
    setSelectedPothole(pothole);
    const targetAnnotation = potholeToAnnotationRef.current.get(pothole.id);

    if (targetAnnotation && mapInstanceRef.current) {
      const span = new window.mapkit.CoordinateSpan(0.01, 0.01);
      const region = new window.mapkit.CoordinateRegion(
        targetAnnotation.coordinate,
        span
      );
      mapInstanceRef.current.setRegionAnimated(region);
    }
  };

  const handleContinue = async () => {
    if (!selectedPothole) return;

    try {
      // Call the geocoding API route
      const response = await fetch("/api/geocode", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lat: selectedPothole.latitude,
          lng: selectedPothole.longitude,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to get location information");
      }

      const { county } = data;
      console.log(`County: ${county}`);

      // Create report with the county data...
      const { data: newReport, error } = await supabase
        .from("reports")
        .insert({
          user_id: user.id,
          lat: selectedPothole.latitude,
          lng: selectedPothole.longitude,
          county,
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;

      setDialogOpen(false);
      navigate(`/report/${newReport.id}`);
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to create report");
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    if (
      confirm(
        "Are you sure you want to delete this report? This action cannot be undone."
      )
    ) {
      try {
        const supabase = createBrowserClient();
        const { error } = await supabase
          .from("reports")
          .delete()
          .eq("id", reportId)
          .eq("user_id", user.id);

        if (error) {
          console.error("Error deleting report:", error);
          alert("Failed to delete report. Please try again.");
        } else {
          // Refresh the page to update the list
          window.location.reload();
        }
      } catch (error) {
        console.error("Error deleting report:", error);
        alert("Failed to delete report. Please try again.");
      }
    }
  };

  const handleMarkCompleted = async (reportId: string) => {
    try {
      const supabase = createBrowserClient();
      const { error } = await supabase
        .from("reports")
        .update({ status: "completed", updated_at: new Date().toISOString() })
        .eq("id", reportId)
        .eq("user_id", user.id);

      if (error) {
        console.error("Error updating report:", error);
        alert("Failed to update report status. Please try again.");
      } else {
        // Refresh the page to update the list
        window.location.reload();
      }
    } catch (error) {
      console.error("Error updating report:", error);
      alert("Failed to update report status. Please try again.");
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "completed":
        return "Completed";
      default:
        return "Pending";
    }
  };

  return (
    <div className="w-full h-screen relative box-border flex flex-row overflow-hidden bg-[#f5f5f5]">
      {/* Sidebar */}
      <Sidebar
        onOpenCommandMenu={handleOpenCommandMenu}
        onNavigateToPothole={() => {}}
        potholes={sidebarPotholes}
        onToggle={() => setShowSidebar(false)}
        isVisible={showSidebar}
        commandDialogOpen={commandDialogOpen}
        user={user}
        showRecentPotholes={false}
      />
      <CommandMenu
        potholes={sidebarPotholes}
        focusOnPothole={() => {}}
        focusOnLocation={() => {}}
        externalOpen={commandDialogOpen}
        onExternalOpenChange={setCommandDialogOpen}
      />
      <div className="w-full max-h-screen h-full rounded-sm overflow-hidden border transition-all duration-300 ease-[cubic-bezier(0.215,0.61,0.355,1)] mt-1 ml-1 box-border bg-white">
        <div className="max-w-[1120px] mx-auto p-7 lg:px-10 w-full flex flex-col pt-10">
          <div className="flex items-center justify-between mb-6 ">
            <h1 className="text-2xl font-bold">My Reports</h1>
            <Button onClick={handleCreateReport}>New Report</Button>
          </div>
          {reports.length === 0 ? (
            <div className="text-center py-12">
              <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No reports yet
              </h3>
              <p className="text-gray-500 mb-4 text-pretty text-center">
                You haven't filed any pothole reports yet. Click "New Report" to
                get started.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* In Progress Reports */}
              <div>
                <h1 className="text-xl font-semibold mb-3">In Progress</h1>
                {reports.filter((report) => report.status === "pending")
                  .length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No reports in progress
                  </div>
                ) : (
                  <div className="space-y-2">
                    {reports
                      .filter((report) => report.status === "pending")
                      .map((report: Report) => (
                        <Link to={`/reports/${report.id}`} key={report.id}>
                          <div className="border-b py-1.5 hover:bg-gray-50 transition-colors cursor-pointer">
                            <div className="flex items-center justify-between">
                              <div className="flex-1 flex justify-between flex-row items-center">
                                <div className="flex items-center gap-2 pl-2">
                                  <DocumentIcon className="w-4 h-4" />
                                  <span className="font-medium text-sm">
                                    Report #{report.id.slice(-8)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-gray-600">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4" />
                                    <span>
                                      {new Date(
                                        report.created_at
                                      ).toLocaleDateString()}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <Menu>
                                <MenuTrigger>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => e.preventDefault()}
                                  >
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </MenuTrigger>
                                <MenuPopup>
                                  <MenuItem
                                    onClick={() =>
                                      handleMarkCompleted(report.id)
                                    }
                                  >
                                    Mark as Completed
                                  </MenuItem>
                                  <MenuItem
                                    onClick={() =>
                                      handleDeleteReport(report.id)
                                    }
                                    variant="destructive"
                                  >
                                    Delete Report
                                  </MenuItem>
                                </MenuPopup>
                              </Menu>
                            </div>
                          </div>
                        </Link>
                      ))}
                  </div>
                )}
              </div>

              {/* Completed Reports */}
              <div>
                <h1 className="text-xl font-semibold mb-3">Completed</h1>
                {reports.filter((report) => report.status === "completed")
                  .length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No completed reports yet
                  </div>
                ) : (
                  <div className="space-y-2">
                    {reports
                      .filter((report) => report.status === "completed")
                      .map((report: Report) => (
                        <Link to={`/reports/${report.id}`} key={report.id}>
                          <div className="border-b py-1.5 hover:bg-gray-50 transition-colors cursor-pointer">
                            <div className="flex items-center justify-between">
                              <div className="flex-1 flex justify-between flex-row items-center">
                                <div className="flex items-center gap-2 pl-2">
                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                  <span className="font-medium text-sm">
                                    Report #{report.id.slice(-8)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-gray-600">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4" />
                                    <span>
                                      {new Date(
                                        report.created_at
                                      ).toLocaleDateString()}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <Menu>
                                <MenuTrigger>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => e.preventDefault()}
                                  >
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </MenuTrigger>
                                <MenuPopup>
                                  <MenuItem
                                    onClick={() =>
                                      handleDeleteReport(report.id)
                                    }
                                    variant="destructive"
                                  >
                                    Delete Report
                                  </MenuItem>
                                </MenuPopup>
                              </Menu>
                            </div>
                          </div>
                        </Link>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Top Bar */}
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
          {!showSidebar && (
            <Button
              onClick={() => setShowSidebar(true)}
              size="icon"
              variant="outline"
              className="hover:!bg-accent"
              title="Open Sidebar"
            >
              <Compass className="size-4" />
            </Button>
          )}
        </div>

        {/* Create Report Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent
            className="!max-w-5xl   p-6"
            otherClasses="justify-center items-center before:!basis-0 !flex-row after:!flex-none"
          >
            <DialogHeader className="pb-0">
              <DialogTitle>Select a Pothole to Report</DialogTitle>
              <DialogDescription>
                Select a pothole to report from the list below.
              </DialogDescription>
            </DialogHeader>
            <div className="flex min-h-[25rem] gap-2">
              {/* Potholes Sidebar */}
              <div className="w-80  overflow-y-scroll">
                {loading ? (
                  <div className="text-center py-8">Loading potholes...</div>
                ) : potholes.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No potholes found
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden ">
                    {potholes.map((pothole) => (
                      <div
                        key={pothole.id}
                        className={` border-b last:border-b-0 cursor-pointer transition-colors p-2 ${
                          selectedPothole?.id === pothole.id
                            ? " bg-blue-50"
                            : "hover:bg-accent"
                        }`}
                        onClick={() => focusOnPothole(pothole)}
                      >
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-red-500 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {pothole.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(
                                pothole.created_at
                              ).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="bg-border h-full w-px"></div>
              {/* Map Area */}
              <div className="flex-1 relative">
                <div
                  ref={mapContainerRef}
                  className="w-full h-full rounded-lg overflow-hidden border "
                />
              </div>
            </div>
            <DialogFooter className="flex !justify-between gap-2 h-fit">
              {/* {selectedPothole && ( */}
              <>
                <Button onClick={() => setDialogOpen(false)} variant="outline">
                  Cancel{" "}
                </Button>
                <Button onClick={handleContinue} disabled={!selectedPothole}>
                  Continue
                </Button>
              </>
              {/* )} */}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export const DocumentIcon = ({
  className,
  ...props
}: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg
      className={cn("shrink-0 text-muted-foreground", className)}
      viewBox="0 0 16 16"
      fill="currentColor"
      {...props}
    >
      <path d="M4.356 15.468h7.28c1.464 0 2.222-.773 2.222-2.242v-6.2c0-.95-.123-1.388-.717-1.99l-3.59-3.65C8.979.805 8.507.668 7.652.668H4.356c-1.462 0-2.221.772-2.221 2.242v10.316c0 1.476.759 2.242 2.221 2.242m.11-1.34c-.663 0-.991-.349-.991-.984V2.992c0-.629.328-.984.99-.984h2.913v3.746c0 .977.485 1.45 1.456 1.45h3.685v5.94c0 .635-.335.984-.998.984zm4.491-8.1c-.28 0-.396-.124-.396-.404V2.192l3.773 3.835zM10.434 9H5.43a.43.43 0 0 0-.445.43.43.43 0 0 0 .445.438h5.004c.246 0 .43-.191.43-.437 0-.24-.184-.431-.43-.431m0 2.297H5.43a.43.43 0 0 0-.445.437c0 .24.185.424.445.424h5.004c.246 0 .43-.184.43-.424a.426.426 0 0 0-.43-.437"></path>
    </svg>
  );
};
