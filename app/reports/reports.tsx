import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router";
import { Compass, Slash, ArrowLeft } from "lucide-react";
import { Button } from "~/components/ui/button";
import Sidebar from "~/components/sidebar/Sidebar";
import { createClient } from "~/lib/supabase/client";
import { CommandMenu } from "~/maps/maps";
import type { User } from "@supabase/supabase-js";
import type { Pothole } from "~/types/index";

interface Report {
  id: string;
  lat?: number;
  lng?: number;
  county?: string;
  status: "pending" | "completed";
  created_at: string;
  updated_at: string;
}

interface ReportAppProps {
  user: User;
  report?: Report;
  lat?: string | null;
  lng?: string | null;
  county: string;
}

export default function ReportApp({
  user,
  report,
  lat,
  lng,
  county,
}: ReportAppProps) {
  const navigate = useNavigate();
  const [showSidebar, setShowSidebar] = useState<boolean>(true);
  const [isCompleting, setIsCompleting] = useState<boolean>(false);
  const [sidebarPotholes, setSidebarPotholes] = useState<Pothole[]>([]);
  const supabase = createClient();

  // Information field component
  const InfoField = ({
    label,
    value,
  }: {
    label: string;
    value: string | number | undefined;
  }) => (
    <div className="mb-3">
      <h4 className="text-xs font-medium text-muted-foreground mb-1">
        {label}
      </h4>
      <div className="bg-muted p-2 rounded border min-w-32">
        <span className="text-sm text-foreground break-words font-mono">
          {value || "N/A"}
        </span>
      </div>
    </div>
  );

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

  // Function to inject county data into the embedded form
  useEffect(() => {
    if (county) {
      const injectCountyData = () => {
        try {
          // Get the iframe document
          const iframe = document.getElementById(
            "mdot-iframe"
          ) as HTMLIFrameElement;
          if (iframe && iframe.contentWindow) {
            const iframeDoc =
              iframe.contentDocument || iframe.contentWindow.document;

            // Find the county select element and set it
            const countySelect = iframeDoc.querySelector(
              'select[name="county"]'
            ) as HTMLSelectElement;
            if (countySelect) {
              // Find the option that matches our county
              const options = countySelect.querySelectorAll("option");
              for (let option of options) {
                if (
                  option.textContent
                    ?.toLowerCase()
                    .includes(county.toLowerCase())
                ) {
                  countySelect.value = option.value;
                  // Trigger change event
                  countySelect.dispatchEvent(
                    new Event("change", { bubbles: true })
                  );
                  break;
                }
              }
            }
          }
        } catch (error) {
          // CORS might prevent direct access, that's okay - the form will still work
          console.log(
            "Could not auto-fill county due to CORS restrictions, but form is still functional"
          );
        }
      };

      // Try to inject after iframe loads
      const iframe = document.getElementById(
        "mdot-iframe"
      ) as HTMLIFrameElement;
      if (iframe) {
        iframe.addEventListener("load", injectCountyData);
        // Also try immediately in case it's already loaded
        setTimeout(injectCountyData, 2000);
      }
    }
  }, [county]);

  const handleMarkCompleted = async () => {
    if (!report) return;

    setIsCompleting(true);
    try {
      const { error } = await supabase
        .from("reports")
        .update({
          status: "completed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", report.id)
        .eq("user_id", user.id);

      if (error) {
        console.error("Error updating report:", error);
        alert("Failed to mark report as completed. Please try again.");
        return;
      }

      // Navigate back to reports list to show the updated status
      navigate("/report");
    } catch (error) {
      console.error("Error updating report:", error);
      alert("Failed to mark report as completed. Please try again.");
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <div className="w-full h-screen relative box-border flex flex-row overflow-hidden bg-[#f5f5f5]">
      {/* Sidebar */}
      <Sidebar
        onOpenCommandMenu={() => navigate("/?search=open")}
        onNavigateToPothole={() => {}}
        potholes={sidebarPotholes}
        onToggle={() => setShowSidebar(false)}
        isVisible={showSidebar}
        commandDialogOpen={false}
        user={user}
      />
      <CommandMenu
        potholes={sidebarPotholes}
        focusOnPothole={(pothole) => navigate(`/?pothole=${pothole.id}`)}
        focusOnLocation={(location) => navigate(`/?location=${location.id}`)}
        externalOpen={false}
        onExternalOpenChange={() => {}}
      />

      {/* Main Content */}
      <div className="flex-1 h-full relative">
        {/* Top Bar */}
        <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between">
          <div className="flex items-center gap-2">
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

            {/* Breadcrumbs */}
            <nav className="flex items-center space-x-1 text-sm text-muted-foreground">
              <Link
                to="/report"
                className="flex items-center hover:text-foreground transition-colors text-muted-foreground"
              >
                Reports
              </Link>
              <Slash
                className="w-4 h-3 text-muted-foreground -rotate-12"
                strokeWidth={3}
              />
              <span className="text-foreground">
                Report #{report?.id.slice(-8) || "Unknown"}
              </span>
            </nav>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleMarkCompleted}
            disabled={isCompleting}
          >
            {isCompleting ? "Marking..." : "Mark as Complete"}
          </Button>
        </div>

        {/* Content */}
        <div className="w-full max-h-screen h-full rounded-sm overflow-hidden border transition-all duration-300 ease-[cubic-bezier(0.215,0.61,0.355,1)] mt-1 ml-1 box-border bg-white">
          {/* <div className="max-w-6xl mx-auto"> */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className=" p-6">
              {/* <p className="mt-2">
                Fill out the Maryland Department of Transportation State Highway
                Administration (SHA) request form below.
                {county && (
                  <span className="block mt-1 font-medium">
                    Detected County: {county}
                  </span>
                )}
              </p> */}
            </div>

            {/* <div className="p-6"> */}
            {/* <div className="border border-gray-300 rounded-lg overflow-hidden"> */}
            <div className="flex flex-row gap-4">
              <iframe
                id="mdot-iframe"
                src="https://mdotsha.my.salesforce-sites.com/customercare"
                className="w-full h-[800px] border-0"
                title="MDOT SHA Customer Service Request Form"
                sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-presentation"
              />
              {/* </div> */}
              {/* </div> */}
              <div className="border-l pl-4 pr-4 h-fit flex-col items-center gap-2 mt-20">
                {" "}
                <h3 className=" font-medium text-sm mb-2">Information</h3>
                {/* Map Preview */}
                <InfoField label="Topic" value="POTHOLES / HOLES / SINKHOLES" />
                <InfoField label="Sub-Topic" value="Potholes" />
                <InfoField
                  label="Latitude"
                  value={lat ? parseFloat(lat).toFixed(6) : undefined}
                />
                <InfoField
                  label="Longitude"
                  value={lng ? parseFloat(lng).toFixed(6) : undefined}
                />
                <InfoField label="County" value={county} />
              </div>
            </div>
          </div>
        </div>
        {/* </div> */}
      </div>
    </div>
  );
}
