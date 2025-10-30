import React, { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useLocation } from "react-router";
import { Toaster, toast } from "sonner";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandGroup,
  CommandItem,
} from "~/components/ui/command";
import { createClient } from "~/lib/supabase/client";
import {
  Navigation,
  MapPin,
  ArrowLeft,
  AlertTriangle,
  SearchIcon,
  Search,
  Star,
  Compass,
  LogOut,
  Map as MapIcon,
  FileText,
  Trophy,
} from "lucide-react";
import DoubleChevronLeft from "~/components/logos/sidebar";
import { XIcon } from "lucide-react";
import type { Pothole } from "~/types/index";
import type { User } from "@supabase/supabase-js";
import "./maps.css";
import { Button } from "~/components/ui/button";
import Logo from "~/components/logos/logo";
import { CommandShortcut } from "~/components/ui/command";
import Sidebar from "~/components/sidebar/Sidebar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "~/components/ui/dialog";
import { Frame, FramePanel } from "~/components/ui/frame";
import { Menu, MenuTrigger, MenuPopup, MenuItem } from "~/components/ui/menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
const MapKitMap = ({
  initialPotholes,
  user,
  onFocusPothole,
  onFocusLocation,
  onOpenCommandMenu,
  commandDialogOpen,
  priorityModalOpen,
  onOpenPriorityModal,
}: {
  initialPotholes: Pothole[];
  user: User;
  onFocusPothole: (fn: (pothole: Pothole) => void) => void;
  onFocusLocation: (
    fn: (location: (typeof marylandLocations)[0]) => void
  ) => void;
  onOpenCommandMenu: () => void;
  commandDialogOpen: boolean;
  priorityModalOpen: boolean;
  onOpenPriorityModal: () => void;
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "b" && (e.metaKey || e.ctrlKey)) {
        if (
          (e.target instanceof HTMLElement && e.target.isContentEditable) ||
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement ||
          e.target instanceof HTMLSelectElement
        ) {
          return;
        }
        e.preventDefault();
        onOpenPriorityModal();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onOpenPriorityModal]);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<mapkit.Map | null>(null);
  const lookAroundInstanceRef = useRef<any>(null);
  const [potholes, setPotholes] = useState<Pothole[]>(initialPotholes);
  const [loading, setLoading] = useState<boolean>(false);
  const [showLookAround, setShowLookAround] = useState<boolean>(false);
  const [currentLookAroundPothole, setCurrentLookAroundPothole] =
    useState<Pothole | null>(null);
  const [showSidebar, setShowSidebar] = useState<boolean>(true);

  const potholeToAnnotationRef = useRef<Map<string, mapkit.MarkerAnnotation>>(
    new Map()
  );
  const supabase = createClient();

  const focusOnPothole = (pothole: Pothole) => {
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

  const showLookAroundForPothole = async (pothole: Pothole) => {
    if (!window.mapkit || !window.mapkit.LookAroundPreview) {
      console.error("Look Around not available");
      return;
    }

    try {
      if (lookAroundInstanceRef.current) {
        lookAroundInstanceRef.current.destroy();
        lookAroundInstanceRef.current = null;
      }

      const coordinate = new window.mapkit.Coordinate(
        pothole.latitude,
        pothole.longitude
      );

      const lookAround = new window.mapkit.LookAroundPreview(
        document.getElementById("container"),
        coordinate
      );

      lookAroundInstanceRef.current = lookAround;

      setCurrentLookAroundPothole(pothole);
      setShowLookAround(true);
    } catch (error) {
      console.error("Error creating Look Around view:", error);
    }
  };

  const closeLookAround = () => {
    if (lookAroundInstanceRef.current) {
      lookAroundInstanceRef.current.destroy();
      lookAroundInstanceRef.current = null;
    }
    setShowLookAround(false);
    setCurrentLookAroundPothole(null);
  };

  useEffect(() => {
    onFocusPothole(focusOnPothole);
  }, [onFocusPothole, focusOnPothole]);

  const focusOnLocation = (location: (typeof marylandLocations)[0]) => {
    if (mapInstanceRef.current) {
      const span = new window.mapkit.CoordinateSpan(0.01, 0.01);
      const region = new window.mapkit.CoordinateRegion(
        new window.mapkit.Coordinate(location.latitude, location.longitude),
        span
      );
      mapInstanceRef.current.setRegionAnimated(region);
    }
  };

  useEffect(() => {
    onFocusLocation(focusOnLocation);
  }, [onFocusLocation]);

  useEffect(() => {
    console.log("Map initialization useEffect triggered:", {
      loading,
      potholesLength: potholes.length,
    });
    if (loading || potholes.length === 0) {
      console.log("Map initialization skipped:", {
        loading,
        potholesLength: potholes.length,
      });
      return;
    }
    console.log("Map initialization proceeding...");

    const setupMapKitJs = async (): Promise<void> => {
      if (!window.mapkit || window.mapkit.loadedLibraries.length === 0) {
        await new Promise<void>((resolve) => {
          window.initMapKit = resolve;
        });
        delete window.initMapKit;
      }
    };

    const createElementFromHTML = (html: string): ChildNode | null => {
      const template = document.createElement("template");
      template.innerHTML = html.trim();
      return template.content.firstChild;
    };

    const initializeMap = async () => {
      console.log("initializeMap: Starting map initialization");
      console.log("initializeMap: potholes available:", potholes.length);

      await setupMapKitJs();

      const offset = new DOMPoint(-150, 10);
      const annotationsToPothole = new Map<mapkit.MarkerAnnotation, Pothole>();

      const potholeAnnotationCallout: mapkit.AnnotationCalloutDelegate = {
        calloutElementForAnnotation: (
          annotation: mapkit.MarkerAnnotation
        ): HTMLElement | null => {
          const pothole = annotationsToPothole.get(annotation);
          if (!pothole) return null;

          const div = createElementFromHTML(`
            <div class="annotation-container">
            <div class="annotation-border"></div>
              <div class="header-section">
                <div class="header-content">
                  <div class="location-info">
                    <div class="city-name">${pothole.name}</div>
                    <div class="state-name">Reported: ${new Date(pothole.created_at).toLocaleDateString()}</div>
                  </div>
                  <div class="score-controls">
                    <div class="score-badge">
                      <div class="score-text">${pothole.upvote_count || 0}</div>
                    </div>
                    <div class="score-controls-container">
                      <div class="controls-group">
                        <div class="control-button ${user ? "control-button-active" : ""}" id="upvote-btn-${pothole.id}">
                          <div class="control-icon control-icon-up">
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path fill-rule="evenodd" clip-rule="evenodd" d="M14.0608 5.49987L13.5304 6.0302L8.70722 10.8534C8.3167 11.244 7.68353 11.244 7.29301 10.8534L2.46978 6.0302L1.93945 5.49987L3.00011 4.43921L3.53044 4.96954L8.00011 9.43921L12.4698 4.96954L13.0001 4.43921L14.0608 5.49987Z" fill="#666666"/>
                          </svg>

                          </div>
                        </div>
                        <div class="divider"></div>
                        <div class="control-button ${user ? "control-button-active" : ""}" id="downvote-btn-${pothole.id}">
                          <div class="control-icon">
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path fill-rule="evenodd" clip-rule="evenodd" d="M14.0608 5.49987L13.5304 6.0302L8.70722 10.8534C8.3167 11.244 7.68353 11.244 7.29301 10.8534L2.46978 6.0302L1.93945 5.49987L3.00011 4.43921L3.53044 4.96954L8.00011 9.43921L12.4698 4.96954L13.0001 4.43921L14.0608 5.49987Z" fill="#666666"/>
                          </svg>

                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <img class="location-image" src="https://placehold.co/362x187?text=Pothole" />
              </div>
              <div class="actions-section">
                <div class="buttons-container">
                  <div class="email-button" data-id="${pothole.id}" data-lat="${pothole.latitude}" data-lng="${pothole.longitude}">
                    <button class="email-button-text">File Report</button>
                  </div>

                  <button class="secondary-button" data-id="${pothole.id}" >
                    <div class="secondary-button-shadow"></div>
                    <div class="secondary-button-text">View on StreetView</div>
                  </button>
                </div>
              </div>
            </div>
          `) as HTMLElement;

          const upvoteBtn = div.querySelector(
            `#upvote-btn-${pothole.id}`
          ) as HTMLDivElement;
          if (upvoteBtn && user) {
            upvoteBtn.addEventListener("click", async (event: Event) => {
              event.preventDefault();
              event.stopPropagation();

              try {
                // Increment upvote count
                const { error } = await supabase
                  .from("potholes")
                  .update({
                    upvote_count: (pothole.upvote_count || 0) + 1,
                  })
                  .eq("id", pothole.id);

                if (error) throw error;

                toast.success("Upvoted pothole!");
                // Refresh the page to show updated count
                window.location.reload();
              } catch (error) {
                console.error("Error upvoting pothole:", error);
                toast.error("Failed to upvote pothole. Please try again.");
              }
            });
          }

          const downvoteBtn = div.querySelector(
            `#downvote-btn-${pothole.id}`
          ) as HTMLDivElement;
          if (downvoteBtn && user) {
            downvoteBtn.addEventListener("click", async (event: Event) => {
              event.preventDefault();
              event.stopPropagation();

              try {
                // Decrement upvote count
                const { error } = await supabase
                  .from("potholes")
                  .update({
                    upvote_count: Math.max(0, (pothole.upvote_count || 0) - 1),
                  })
                  .eq("id", pothole.id);

                if (error) throw error;

                toast.success("Downvoted pothole!");
                // Refresh the page to show updated count
                window.location.reload();
              } catch (error) {
                console.error("Error downvoting pothole:", error);
                toast.error("Failed to downvote pothole. Please try again.");
              }
            });
          }

          if (div && div instanceof HTMLElement) {
            const emailBtn = div.querySelector(
              `[data-id="${pothole.id}"].email-button`
            ) as HTMLDivElement;
            if (emailBtn) {
              emailBtn.addEventListener("click", async (event: Event) => {
                event.preventDefault();
                event.stopPropagation();
                // Navigate to report page with lat/lng parameters
                window.location.href = `/report?lat=${pothole.latitude}&lng=${pothole.longitude}`;
              });
            }

            const streetViewBtn = div.querySelector(
              `[data-id="${pothole.id}"].secondary-button`
            ) as HTMLButtonElement;
            if (streetViewBtn) {
              streetViewBtn.addEventListener("click", async (event: Event) => {
                event.preventDefault();
                event.stopPropagation();
                showLookAroundForPothole(pothole);
              });
            }
          }

          return div;
        },

        calloutAnchorOffsetForAnnotation: (annotation, element) => offset,

        calloutAppearanceAnimationForAnnotation: (annotation) =>
          ".4s cubic-bezier(0.4, 0, 0, 1.5) 0s 1 normal scale-and-fadein",
      };

      const annotations: mapkit.MarkerAnnotation[] = potholes.map((pothole) => {
        const coordinate = new window.mapkit.Coordinate(
          pothole.latitude,
          pothole.longitude
        );

        const annotation = new window.mapkit.MarkerAnnotation(coordinate, {
          callout: potholeAnnotationCallout,
          color: "#ff6b6b",
        });

        annotationsToPothole.set(annotation, pothole);
        potholeToAnnotationRef.current.set(pothole.id, annotation);
        return annotation;
      });

      if (mapContainerRef.current && !mapInstanceRef.current) {
        console.log("initializeMap: Creating map instance");
        console.log("initializeMap: annotations to show:", annotations.length);
        mapInstanceRef.current = new window.mapkit.Map(mapContainerRef.current);
        mapInstanceRef.current.showItems(annotations);
        console.log("initializeMap: Map created and annotations added");
      } else {
        console.log(
          "initializeMap: Map container not ready or map already exists"
        );
      }
    };

    initializeMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy();
        mapInstanceRef.current = null;
      }
      if (lookAroundInstanceRef.current) {
        lookAroundInstanceRef.current.destroy();
        lookAroundInstanceRef.current = null;
      }
      if (window.searchDebounceTimer) {
        clearTimeout(window.searchDebounceTimer);
      }
    };
  }, [potholes, loading, user]);

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        Loading potholes...
      </div>
    );
  }

  return (
    <div className="w-full h-screen relative box-border flex flex-row overflow-hidden bg-[#f5f5f5]">
      <Sidebar
        onOpenCommandMenu={onOpenCommandMenu}
        onNavigateToPothole={focusOnPothole}
        potholes={potholes}
        onToggle={() => setShowSidebar(false)}
        isVisible={showSidebar}
        commandDialogOpen={commandDialogOpen}
        user={user}
      />
      {/* )} */}

      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
        {!showSidebar && (
          <>
            <Button
              onClick={() => setShowSidebar(true)}
              size="icon"
              variant="outline"
              className="hover:!bg-accent"
              title="Open Sidebar"
            >
              <Compass className="size-4" />
            </Button>
            <Button
              onClick={onOpenPriorityModal}
              size="icon"
              variant="outline"
              className="hover:!bg-accent"
              title="Open Priority Modal"
            >
              <Star className="size-4" />
            </Button>

            <Button
              onClick={onOpenCommandMenu}
              size="icon"
              variant="outline"
              className="hover:!bg-accent"
              title="Open Command Menu"
            >
              <SearchIcon className="size-4" />
            </Button>
          </>
        )}
      </div>

      <div
        id="container"
        className="w-96 h-64 bg-gray-100 border absolute bottom-4 right-4 rounded-xl z-10 data-[is-visible=true]:!opacity-100 data-[is-visible=false]:opacity-0 data-[is-visible=true]:!scale-100 data-[is-visible=false]:scale-75 transition-all duration-400 opacity-0 ease-[cubic-bezier(0.4,_0,_0,_1.5)] scale-75 overflow-hidden origin-bottom-right data-[is-visible=false]:pointer-events-none data-[is-visible=true]:pointer-events-auto"
        data-is-visible={showLookAround}
      >
        <button
          onClick={closeLookAround}
          className="absolute top-2 right-2 text-sm rounded-full p-2 z-20 bg-[#444446] hover:text-white text-[#ababac]"
        >
          <XIcon className="size-4" strokeWidth={3} />
        </button>
      </div>
      {/* Map Container */}
      <div
        ref={mapContainerRef}
        className="w-full max-h-screen h-full rounded-sm overflow-hidden border transition-all duration-300 ease-[cubic-bezier(0.215,0.61,0.355,1)] mt-1 ml-1 box-border"
      />
    </div>
  );
};

const marylandLocations = [
  {
    id: "1",
    name: "Baltimore Inner Harbor",
    latitude: 39.2864,
    longitude: -76.6053,
  },
  {
    id: "2",
    name: "Annapolis State House",
    latitude: 38.9784,
    longitude: -76.4922,
  },
  { id: "3", name: "Ocean City Beach", latitude: 38.3365, longitude: -75.0849 },
  {
    id: "4",
    name: "B&O Railroad Museum",
    latitude: 39.3072,
    longitude: -76.6387,
  },
  {
    id: "5",
    name: "National Aquarium",
    latitude: 39.2851,
    longitude: -76.6083,
  },
  {
    id: "6",
    name: "Chesapeake Bay Bridge",
    latitude: 39.018,
    longitude: -76.3994,
  },
  { id: "7", name: "Fort McHenry", latitude: 39.2635, longitude: -76.5798 },
  {
    id: "8",
    name: "Maryland State House",
    latitude: 38.9787,
    longitude: -76.4936,
  },
];

export const CommandMenu = ({
  potholes,
  focusOnPothole,
  focusOnLocation,
  externalOpen,
  onExternalOpenChange,
  onOpenPriorityModal,
}: {
  potholes: Pothole[];
  focusOnPothole: (pothole: Pothole) => void;
  focusOnLocation: (location: (typeof marylandLocations)[0]) => void;
  externalOpen?: boolean;
  onExternalOpenChange?: (open: boolean) => void;
  onOpenPriorityModal?: () => void;
}) => {
  const location = useLocation();
  const [internalOpen, setInternalOpen] = useState<boolean>(false);
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = onExternalOpenChange || setInternalOpen;
  const [isNavigationMode, setIsNavigationMode] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  // Hide navigate action and potholes on reports and leaderboard pages
  const isOnReportsPage = location.pathname === "/report";
  const isOnLeaderboardPage = location.pathname === "/leaderboard";
  const shouldHidePotholes = isOnReportsPage || isOnLeaderboardPage;

  const searchRef = useRef<any>(null);

  useEffect(() => {
    if (window.mapkit && window.mapkit.Search) {
      searchRef.current = new window.mapkit.Search({
        includeAddresses: true,
        includePointsOfInterest: true,
        includeQueries: true,
      });
    }
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        if (
          (e.target instanceof HTMLElement && e.target.isContentEditable) ||
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement ||
          e.target instanceof HTMLSelectElement
        ) {
          return;
        }
        e.preventDefault();
        setOpen((open) => !open);
        if (!open) {
          setIsNavigationMode(false);
          setSearchQuery("");
          setSearchResults([]);
          setActiveIndex(-1);
        }
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open]);

  useEffect(() => {
    if (!searchQuery.trim() || !searchRef.current) {
      setSearchResults([]);
      setActiveIndex(-1);
      return;
    }

    const timer = setTimeout(() => {
      searchRef.current.autocomplete(searchQuery, (error: any, data: any) => {
        if (error) {
          console.error("Search error:", error);
          return;
        }
        setSearchResults(data.results || []);
        setActiveIndex(-1);
      });
    }, 150);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleNavigateTo = () => {
    setIsNavigationMode(true);
    setSearchQuery("");
    setSearchResults([]);
    setActiveIndex(-1);
  };

  const displayedPotholes = potholes.slice(0, 50);

  // console.log('CommandMenu: displayedPotholes:', displayedPotholes.length);
  // console.log('CommandMenu: total potholes:', potholes.length);

  const handleSelectPothole = (pothole: Pothole) => {
    // console.log('CommandMenu: selected pothole:', pothole.name);
    focusOnPothole(pothole);
    setOpen(false);
    setIsNavigationMode(false);
  };

  const handleSelectLocation = (location: (typeof marylandLocations)[0]) => {
    // console.log('CommandMenu: selected location:', location.name);
    focusOnLocation(location);
    setOpen(false);
    setIsNavigationMode(false);
  };

  const handleSelectSearchResult = (result: any) => {
    // console.log('CommandMenu: selected search result:', result);

    if (result.coordinate) {
      focusOnMapCoordinate(result.coordinate, result);
    } else {
      const queryText =
        (result.displayLines && result.displayLines.join(" ")) || "";
      if (queryText && searchRef.current) {
        searchRef.current.search(queryText, (error: any, data: any) => {
          if (error) return;
          const place = data.places && data.places[0];
          if (place && place.coordinate) {
            focusOnMapCoordinate(place.coordinate, place);
          }
        });
      }
    }

    setOpen(false);
    setIsNavigationMode(false);
  };

  const focusOnMapCoordinate = (coordinate: any, meta: any) => {
    const syntheticLocation = {
      id: "search-result",
      name:
        meta.name ||
        (meta.displayLines && meta.displayLines[0]) ||
        "Search Result",
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
    };
    focusOnLocation(syntheticLocation as any);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open || !isNavigationMode || searchResults.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) => Math.min(searchResults.length - 1, prev + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === "Enter" && activeIndex >= 0) {
        e.preventDefault();
        handleSelectSearchResult(searchResults[activeIndex]);
      } else if (e.key === "Escape") {
        setSearchQuery("");
        setSearchResults([]);
        setActiveIndex(-1);
        setIsNavigationMode(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, isNavigationMode, searchResults, activeIndex]);

  // console.log('CommandMenu: rendering dialog, open:', open);

  const renderCommandContent = () => {
    if (isNavigationMode) {
      if (searchQuery.trim() && searchResults.length > 0) {
        return (
          <>
            <CommandGroup
              heading="Navigation"
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium"
            >
              <CommandItem
                onSelect={() => setIsNavigationMode(false)}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Potholes
                </div>
              </CommandItem>
            </CommandGroup>
            <CommandGroup
              heading="Search Results"
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium"
            >
              {searchResults.map((result, index) => (
                <CommandItem
                  key={index}
                  value={
                    result.displayLines
                      ? result.displayLines.join(" ")
                      : "Result"
                  }
                  onSelect={() => handleSelectSearchResult(result)}
                  className={`flex flex-col items-start gap-1 px-2 py-3 ${index === activeIndex ? "bg-accent" : ""}`}
                >
                  <span className="font-medium">
                    {result.displayLines && result.displayLines[0]}
                  </span>
                  {result.displayLines && result.displayLines[1] && (
                    <span className="text-xs text-muted-foreground">
                      {result.displayLines[1]}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        );
      } else {
        return (
          <>
            <CommandGroup
              heading="Navigation"
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium"
            >
              <CommandItem onSelect={() => setIsNavigationMode(false)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Potholes
              </CommandItem>
            </CommandGroup>
            <CommandGroup
              heading="Maryland Landmarks"
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium"
            >
              {marylandLocations.map((location) => (
                <CommandItem
                  key={location.id}
                  value={location.name}
                  onSelect={() => handleSelectLocation(location)}
                  className="flex items-center gap-3 px-2 py-3"
                >
                  <MapPin className="w-4 h-4 text-blue-500" />
                  <span className="font-medium">{location.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        );
      }
    } else {
      return (
        <>
          <CommandGroup
            heading="Quick Actions"
            className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium"
          >
            {!isOnReportsPage && (
              <CommandItem onSelect={handleNavigateTo}>
                <Navigation className="w-4 h-4 mr-2" />
                Navigate to
              </CommandItem>
            )}
            <CommandItem onSelect={() => (window.location.href = "/")}>
              <MapIcon className="w-4 h-4 mr-2" />
              Go to Maps
            </CommandItem>
            <CommandItem onSelect={() => (window.location.href = "/report")}>
              <FileText className="w-4 h-4 mr-2" />
              Go to Reports
            </CommandItem>
            <CommandItem
              onSelect={() => (window.location.href = "/leaderboard")}
            >
              <Trophy className="w-4 h-4 mr-2" />
              Go to Leaderboard
            </CommandItem>
          </CommandGroup>

          {!shouldHidePotholes && (
            <CommandGroup
              heading="Potholes"
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium"
            >
              {displayedPotholes.map((pothole) => (
                <CommandItem
                  key={pothole.id}
                  value={`${pothole.name} ${new Date(pothole.created_at).toLocaleDateString()}`}
                  onSelect={() => handleSelectPothole(pothole)}
                  className="flex items-center gap-3 px-2 py-3"
                >
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  <div className="flex flex-col flex-1">
                    <div className="flex items-center">
                      <span className="font-medium">{pothole.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Reported:{" "}
                      {new Date(pothole.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </>
      );
    }
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      footerText={isNavigationMode ? "Go to Location" : "Go to Pothole"}
    >
      <CommandInput
        placeholder={
          isNavigationMode
            ? "Search addresses, cities, landmarks…"
            : "Search potholes…"
        }
        value={searchQuery}
        onValueChange={setSearchQuery}
      />
      <CommandList className="max-h-[300px] overflow-y-auto">
        {renderCommandContent()}
      </CommandList>
    </CommandDialog>
  );
};

const PriorityModal = ({
  isOpen,
  onClose,
  potholes,
  onNavigateToPothole,
}: {
  isOpen: boolean;
  onClose: () => void;
  potholes: Pothole[];
  onNavigateToPothole: (pothole: Pothole) => void;
}) => {
  const topPotholes = [...potholes]
    .sort((a, b) => (b.upvote_count || 0) - (a.upvote_count || 0))
    .slice(0, 10);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Top Priority Potholes
          </DialogTitle>
          <DialogDescription>
            The most upvoted potholes by the community. Click on any pothole to
            navigate to its location.
          </DialogDescription>
        </DialogHeader>

        <Frame className="w-full mt-4">
          <FramePanel>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Rank</TableHead>
                  <TableHead>Pothole</TableHead>
                  <TableHead>Date Reported</TableHead>
                  <TableHead className="w-20 text-center">Upvotes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topPotholes.map((pothole, index) => (
                  <TableRow
                    key={pothole.id}
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => {
                      onNavigateToPothole(pothole);
                      onClose();
                    }}
                  >
                    <TableCell className="font-medium text-center">
                      #{index + 1}
                    </TableCell>
                    <TableCell className="font-medium">
                      {pothole.name}
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {new Date(pothole.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="size-6 mx-auto bg-gradient-to-b from-[#70b4ff] to-[#0a7eff] rounded-full shadow-[0px_0px_2.700000047683716px_1px_rgba(0,0,0,0.10)] outline-2 outline-offset-[-2px] outline-white inline-flex justify-center items-center gap-2.5 overflow-hidden">
                        <div className="justify-start text-white text-sm font-medium">
                          {pothole.upvote_count || 0}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </FramePanel>
        </Frame>

        {topPotholes.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No potholes found yet. Be the first to report one!
          </div>
        )}
        <DialogFooter>
          <Button onClick={onClose} className="opacity-0 pointer-events-none">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const App = ({
  initialPotholes,
  user,
}: {
  initialPotholes: Pothole[];
  user: User;
}) => {
  const focusOnPotholeRef = useRef<((pothole: Pothole) => void) | null>(null);
  const focusOnLocationRef = useRef<
    ((location: (typeof marylandLocations)[0]) => void) | null
  >(null);
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const shouldOpenSearch = searchParams.get("search") === "open";

  const [commandDialogOpen, setCommandDialogOpen] =
    useState<boolean>(shouldOpenSearch);

  // Handle opening command dialog when navigating with search parameter
  useEffect(() => {
    if (shouldOpenSearch && !commandDialogOpen) {
      setCommandDialogOpen(true);
      // Clean up the URL by removing the search parameter
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete("search");
      const newSearch = newSearchParams.toString();
      const newUrl = `${location.pathname}${newSearch ? `?${newSearch}` : ""}`;
      window.history.replaceState(null, "", newUrl);
    }
  }, [shouldOpenSearch, commandDialogOpen, searchParams, location.pathname]);

  const handleFocusOnPothole = (pothole: Pothole) => {
    if (focusOnPotholeRef.current) {
      focusOnPotholeRef.current(pothole);
    }
  };

  const handleFocusOnLocation = (location: (typeof marylandLocations)[0]) => {
    if (focusOnLocationRef.current) {
      focusOnLocationRef.current(location);
    }
  };

  return (
    <>
      <MapKitMap
        initialPotholes={initialPotholes}
        user={user}
        onFocusPothole={(fn) => {
          focusOnPotholeRef.current = fn;
        }}
        onFocusLocation={(fn) => {
          focusOnLocationRef.current = fn;
        }}
        onOpenCommandMenu={() => setCommandDialogOpen(true)}
        commandDialogOpen={commandDialogOpen}
      />
      <CommandMenu
        potholes={initialPotholes}
        focusOnPothole={handleFocusOnPothole}
        focusOnLocation={handleFocusOnLocation}
        externalOpen={commandDialogOpen}
        onExternalOpenChange={setCommandDialogOpen}
      />
      <Toaster />
    </>
  );
};

export default App;
