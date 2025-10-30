import { createClient as createServerClient } from "~/lib/supabase/server";
import { createClient as createBrowserClient } from "~/lib/supabase/client";
import {
  type LoaderFunctionArgs,
  redirect,
  useLoaderData,
  useNavigate,
} from "react-router";
import { useState, useEffect } from "react";
import { Trophy, TrendingUp, Calendar, MapPin, ArrowUp } from "lucide-react";
import { Button } from "~/components/ui/button";
import Sidebar from "~/components/sidebar/Sidebar";
import { CommandMenu } from "~/maps/maps";
import type { Pothole } from "~/types/global";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "~/components/ui/dialog";
import { Frame, FramePanel } from "~/components/ui/frame";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

interface LeaderboardPothole extends Pothole {
  upvote_count: number;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { supabase } = createServerClient(request);

  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    return redirect("/login");
  }

  // Get top potholes with upvote counts
  const { data: topPotholes, error: potholesError } = await supabase
    .from("potholes")
    .select("*")
    .order("upvote_count", { ascending: false })
    .order("created_at", { ascending: false });

  if (potholesError) {
    console.error("Error fetching leaderboard:", potholesError);
  }

  const potholesWithCounts = topPotholes || [];

  return {
    user: data.user,
    topPotholes: potholesWithCounts,
  };
};

export default function Leaderboard() {
  const { user, topPotholes } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [showSidebar, setShowSidebar] = useState<boolean>(true);
  const [commandDialogOpen, setCommandDialogOpen] = useState<boolean>(false);
  const [sidebarPotholes, setSidebarPotholes] = useState<Pothole[]>([]);
  const supabase = createBrowserClient();

  const handleOpenCommandMenu = () => {
    setCommandDialogOpen(true);
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

  //   const getRankIcon = (rank: number) => {
  //     if (rank === 1) return "🥇";
  //     if (rank === 2) return "🥈";
  //     if (rank === 3) return "🥉";
  //     return `#${rank}`;
  //   };

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
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-2xl font-bold">Community Leaderboard</h1>
                <p className="text-gray-600 text-sm">
                  Top potholes by community upvotes
                </p>
              </div>
            </div>
            <Button onClick={() => navigate("/")} variant="outline">
              <MapPin className="w-4 h-4 mr-2" />
              View on Map
            </Button>
          </div>

          {topPotholes.length === 0 ? (
            <div className="text-center py-12">
              <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No potholes yet
              </h3>
              <p className="text-gray-500 mb-4 text-pretty text-center">
                Be the first to report a pothole and help improve your
                community!
              </p>
            </div>
          ) : (
            <Frame className="w-full mt-4">
              <FramePanel>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Rank</TableHead>
                      <TableHead>Pothole</TableHead>
                      <TableHead>Date Reported</TableHead>
                      <TableHead className="w-20 text-center">
                        Upvotes
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topPotholes.map((pothole, index) => {
                      const rank = index + 1;
                      return (
                        <TableRow
                          key={pothole.id}
                          className={`cursor-pointer hover:bg-gray-50 transition-colors ${
                            rank <= 3
                              ? "bg-gradient-to-r from-yellow-50/50 to-orange-50/50"
                              : ""
                          }`}
                        >
                          <TableCell className="font-medium text-center">
                            <div className="flex items-center justify-center gap-1">
                              <span className={`text-sm font-bold `}>
                                #{rank}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <span>{pothole.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-500">
                            {new Date(pothole.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-center">
                            <div
                              className={`size-8 mx-auto rounded-full shadow-[0px_0px_2.700000047683716px_1px_rgba(0,0,0,0.10)] outline-2 outline-offset-[-2px] outline-white inline-flex justify-center items-center gap-2.5 overflow-hidden bg-gradient-to-b from-[#70b4ff] to-[#0a7eff]`}
                            >
                              <div className="justify-start text-white text-sm font-medium">
                                {pothole.upvote_count}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </FramePanel>
            </Frame>
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
              <Trophy className="size-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
