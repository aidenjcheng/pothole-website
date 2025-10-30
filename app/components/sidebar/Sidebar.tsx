import React, { useState } from "react";
import { useLocation, Link } from "react-router";
import { Search, MapPin, LogOut, FileText, Map, Trophy } from "lucide-react";
import { Button } from "~/components/ui/button";
import Logo from "~/components/logos/logo";
import { CommandShortcut } from "~/components/ui/command";
import { Menu, MenuTrigger, MenuPopup, MenuItem } from "~/components/ui/menu";
import DoubleChevronLeft from "~/components/logos/sidebar";
import type { Pothole } from "~/types/index";
import type { User } from "@supabase/supabase-js";

const Sidebar = ({
  onOpenCommandMenu,
  onNavigateToPothole,
  potholes,
  onToggle,
  isVisible,
  commandDialogOpen,
  user,
  showRecentPotholes = true,
}: {
  onOpenCommandMenu: () => void;
  onNavigateToPothole: (pothole: Pothole) => void;
  potholes: Pothole[];
  onToggle: () => void;
  isVisible: boolean;
  commandDialogOpen: boolean;
  user: User;
  showRecentPotholes?: boolean;
}) => {
  const location = useLocation();
  const [activeNav, setActiveNav] = useState<"search">("search");

  // Hide navigate action on reports page
  const isOnReportsPage = location.pathname === "/report";

  const handleNavClick = (nav: "search") => {
    setActiveNav(nav);
    if (nav === "search") {
      onOpenCommandMenu();
    }
  };

  const navigationItems = [
    {
      key: "search",
      icon: Search,
      label: "Search",
      shortcut: <CommandShortcut className="h-min mr-0.5">⌘+K</CommandShortcut>,
      onClick: () => handleNavClick("search"),
      isActive: commandDialogOpen,
      useLink: false,
    },
    {
      key: "maps",
      icon: Map,
      label: "Maps",
      to: "/",
      isActive: location.pathname === "/",
      useLink: true,
    },
    {
      key: "leaderboard",
      icon: Trophy,
      label: "Leaderboard",
      to: "/leaderboard",
      isActive: location.pathname === "/leaderboard",
      useLink: true,
    },
    {
      key: "reports",
      icon: FileText,
      label: "Reports",
      to: "/report",
      isActive: isOnReportsPage,
      useLink: true,
    },
  ];

  const recentPotholes = potholes.slice(0, 5); // Show first 5 potholes

  return (
    <div
      className="w-56 h-full relative data-[is-visible=false]:w-0 transition-all duration-300 ease-[cubic-bezier(0.215,0.61,0.355,1)] z-50 bg-[#f5f5f5]"
      data-is-visible={isVisible}
    >
      <div className="w-56"></div>
      <div
        className=" w-56 h-full absolute top-0 left-0   inline-flex flex-col justify-start items-start gap-px overflow-hidden z-20 translate-x-0 data-[is-visible=true]:translate-x-0 data-[is-visible=false]:translate-x-[calc(-1*(100%+16px))] transition-all duration-300 ease-[cubic-bezier(0.215,0.61,0.355,1)] "
        data-is-visible={isVisible}
      >
        <div className="self-stretch flex-1 px-1.5 py-1.5   flex flex-col justify-between items-start gap-px w-full relative">
          <div className="flex flex-col justify-start gap-1 w-full">
            <div className="w-full px-1.5 pt-1 pb-2 inline-flex justify-between items-center">
              <div className="inline-flex justify-start items-center gap-[5px]">
                <Logo className="size-5 opacity-80" />
                <div className="justify-start text-black text-sm font-semibold">
                  ezpothole
                </div>
              </div>
              <Button
                onClick={onToggle}
                size="icon"
                variant="ghost"
                className=" hover:bg-stone-100"
                title="Close Sidebar"
              >
                <DoubleChevronLeft className="size-4" />
              </Button>
            </div>
            <div className="w-full flex flex-col gap-1">
              {navigationItems.map((item) => {
                const IconComponent = item.icon;
                const commonProps = {
                  key: item.key,
                  className: `w-full h-fit px-1.5 py-1 rounded-md inline-flex justify-start items-center gap-2 overflow-hidden cursor-pointer hover:bg-[#efefef] transition-colors ${
                    item.isActive ? "bg-[#e8e8e8]" : "#f5f5f5"
                  }`,
                };

                const content = (
                  <>
                    <IconComponent className="w-4 h-4" />
                    <span className="justify-start text-Gray text-xs font-medium">
                      {item.label}
                    </span>
                    {item.shortcut}
                  </>
                );

                return item.useLink ? (
                  <Link {...commonProps} to={item.to!}>
                    {content}
                  </Link>
                ) : (
                  <div {...commonProps} onClick={item.onClick}>
                    {content}
                  </div>
                );
              })}
            </div>
            {showRecentPotholes && (
              <>
                <div className="self-stretch px-1.5 pt-3.5 pb-2 inline-flex justify-start items-center gap-2.5">
                  <div className="justify-start text-black text-xs font-medium">
                    Recent potholes
                  </div>
                </div>
                <div className="w-full flex flex-col gap-1">
                  {recentPotholes.map((pothole, index) => (
                    <div
                      key={pothole.id}
                      className="w-full h-fit px-1.5 py-1 opacity-80 rounded-md inline-flex justify-start items-center gap-2 overflow-hidden cursor-pointer hover:bg-stone-50 transition-colors"
                      onClick={() => onNavigateToPothole(pothole)}
                    >
                      <MapPin className="w-4 h-4 flex-shrink-0" />
                      <div className="justify-start text-Gray text-xs font-medium truncate">
                        {pothole.name}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
          {/* <div className="self-stretch absolute w-full bottom-0"> */}
          <Menu>
            <MenuTrigger className="w-full h-fit px-1.5 py-1 opacity-80 rounded-md inline-flex justify-start items-center gap-2 overflow-hidden cursor-pointer hover:bg-[#efefef] transition-colors">
              <img
                src={
                  user.user_metadata?.avatar_url || user.user_metadata?.picture
                }
                alt={
                  user.user_metadata?.full_name ||
                  user.user_metadata?.name ||
                  "User"
                }
                className="size-4 rounded-full"
              />
              <div className="flex-1 text-left">
                <div className="justify-start text-black text-xs font-medium truncate">
                  {user.user_metadata?.full_name ||
                    user.user_metadata?.name ||
                    "User"}
                </div>
              </div>
            </MenuTrigger>
            <MenuPopup align="start" className="w-48">
              <MenuItem
                variant="destructive"
                onClick={() => (window.location.href = "/logout")}
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </MenuItem>
            </MenuPopup>
          </Menu>
        </div>
        {/* </div> */}
        {/* User Menu */}
      </div>
    </div>
  );
};

export default Sidebar;
