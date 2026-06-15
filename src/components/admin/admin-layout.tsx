"use client";

import { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  LayoutDashboard,
  BarChart3,
  FileText,
  StickyNote,
  Mail,
  Image as ImageIcon,
  Settings,
  User,
  LogOut,
  Menu,
  ChevronLeft,
  PenSquare,
  Inbox,
  History,
  Layers,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAdminStore } from "@/stores/admin-store";
import { clearAdminToken } from "@/lib/admin-utils";
import { Dashboard } from "./dashboard";
import { BlogManager } from "./blog-manager";
import { BlogEditor } from "./blog-editor";
import { NoteManager } from "./note-manager";
import { NoteEditor } from "./note-editor";
import { NewsletterManager } from "./newsletter-manager";
import { MediaLibrary } from "./media-library";
import { SettingsPage } from "./settings-page";
import { AccountPage } from "./account-page";
import { AnalyticsPage } from "./analytics-page";
import { ContactManager } from "./contact-manager";
import { ActivityLog } from "./activity-log";
import { SeriesManager } from "./series-manager";
import { CommentManager } from "./comment-manager";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function InboxContent() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) return;
    fetch("/api/admin/contact?limit=1", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setUnreadCount(data.unreadCount || 0))
      .catch(() => {});
  }, []);

  return <ContactManager unreadCount={unreadCount} setUnreadCount={setUnreadCount} />;
}

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "blogs", label: "Blog Posts", icon: FileText },
  { id: "notes", label: "Notes", icon: StickyNote },
  { id: "series", label: "Collections", icon: Layers },
  { id: "newsletter", label: "Newsletter", icon: Mail },
  { id: "media", label: "Media", icon: ImageIcon },
  { id: "inbox", label: "Inbox", icon: Inbox },
  { id: "comments", label: "Comments", icon: MessageSquare },
  { id: "activity", label: "Activity", icon: History },
  { id: "settings", label: "Settings", icon: Settings },
  { id: "account", label: "Account", icon: User },
];

function SidebarContent() {
  const { admin, currentSection, setCurrentSection, sidebarCollapsed } = useAdminStore();
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingCommentsCount, setPendingCommentsCount] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) return;
    fetch("/api/admin/contact?limit=1", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setUnreadCount(data.unreadCount || 0))
      .catch(() => {});

    fetch("/api/admin/comments?type=blog&status=pending&limit=1", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setPendingCommentsCount(data.pendingCount || 0))
      .catch(() => {});
  }, [currentSection]);

  function handleLogout() {
    clearAdminToken();
    useAdminStore.getState().clearAdmin();
    // Clear the httpOnly cookie via server endpoint
    fetch("/api/admin/logout", { method: "POST" }).catch(() => {});
    toast.info("Logged out");
    window.location.reload();
  }

  return (
    <div className="flex flex-col h-full">
      {/* Animated gradient line at top */}
      <div className="h-[2px] bg-gradient-to-r from-primary via-primary/60 to-primary/20 shrink-0" />

      {/* Logo */}
      <div className="p-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0 shadow-sm">
          <PenSquare className="w-4 h-4 text-primary-foreground" />
        </div>
        {!sidebarCollapsed && (
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            className="flex items-center gap-2 overflow-hidden"
          >
            <span className="font-semibold text-sm truncate whitespace-nowrap">
              Admin Panel
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-primary/60 flex-shrink-0" />
          </motion.div>
        )}
      </div>

      <Separator />

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentSection === item.id;
          const isBlogSub = currentSection === "blog-editor" && item.id === "blogs";
          const isNoteSub = currentSection === "note-editor" && item.id === "notes";
          const isHighlighted = isActive || isBlogSub || isNoteSub;

          return (
            <TooltipProvider key={item.id} delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size={sidebarCollapsed ? "icon" : "default"}
                    className={cn(
                      "w-full justify-start gap-3 transition-all duration-200 relative",
                      sidebarCollapsed ? "h-9 w-9" : "h-9",
                      isHighlighted
                        ? "bg-accent/80 text-accent-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    )}
                    onClick={() => setCurrentSection(item.id)}
                  >
                    {/* Active left border indicator */}
                    {isHighlighted && (
                      <motion.span
                        layoutId="sidebar-active"
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 rounded-r-full bg-primary"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                      />
                    )}
                    <Icon className={cn("w-4 h-4 flex-shrink-0 transition-colors duration-200", isHighlighted && "text-primary")} />
                    {!sidebarCollapsed && (
                      <span className="flex-1 text-left">{item.label}</span>
                    )}
                    {item.id === "inbox" && unreadCount > 0 && (
                      <span className="flex items-center justify-center size-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex-shrink-0">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                    {item.id === "comments" && pendingCommentsCount > 0 && (
                      <span className="flex items-center justify-center size-5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex-shrink-0">
                        {pendingCommentsCount > 9 ? "9+" : pendingCommentsCount}
                      </span>
                    )}
                  </Button>
                </TooltipTrigger>
                {sidebarCollapsed && (
                  <TooltipContent side="right">{item.label}</TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </nav>

      <Separator />

      {/* User & Logout */}
      <div className="p-2 space-y-1">
        {admin && (
          <div className={cn("flex items-center gap-3 px-3 py-2.5 rounded-lg", sidebarCollapsed ? "justify-center" : "")}>
            <div className="relative">
              <Avatar className="h-8 w-8 flex-shrink-0 ring-2 ring-background">
                <AvatarImage src={admin.avatar || undefined} />
                <AvatarFallback className="text-xs bg-gradient-to-br from-primary/20 to-primary/5">
                  {admin.displayName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="absolute -inset-0.5 rounded-full bg-gradient-to-tr from-primary/50 via-primary/20 to-primary/5 -z-10 animate-pulse" />
              {/* Online status pulsing dot */}
              <span
                className="online-pulse absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-500 ring-2 ring-card"
                aria-label="Online"
              />
            </div>
            {!sidebarCollapsed && (
              <div className="truncate min-w-0">
                <p className="text-sm font-medium truncate">{admin.displayName}</p>
                <p className="text-xs text-muted-foreground truncate">{admin.email}</p>
              </div>
            )}
          </div>
        )}
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size={sidebarCollapsed ? "icon" : "default"}
                className={cn(
                  "w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200",
                  sidebarCollapsed ? "h-9 w-9" : "h-9"
                )}
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4 flex-shrink-0" />
                {!sidebarCollapsed && <span>Logout</span>}
              </Button>
            </TooltipTrigger>
            {sidebarCollapsed && (
              <TooltipContent side="right">Logout</TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}

export function AdminLayout() {
  const { currentSection, sidebarCollapsed, toggleSidebar, sidebarOpen, setSidebarOpen } =
    useAdminStore();

  function getBreadcrumb() {
    switch (currentSection) {
      case "dashboard":
        return [{ label: "Dashboard" }];
      case "analytics":
        return [{ label: "Analytics" }];
      case "blogs":
        return [{ label: "Blog Posts" }];
      case "blog-editor":
        return [
          { label: "Blog Posts", section: "blogs" },
          { label: "Blog Editor" },
        ];
      case "notes":
        return [{ label: "Notes" }];
      case "note-editor":
        return [
          { label: "Notes", section: "notes" },
          { label: "Editor" },
        ];
      case "series":
        return [{ label: "Collections" }];
      case "newsletter":
        return [{ label: "Newsletter" }];
      case "media":
        return [{ label: "Media Library" }];
      case "inbox":
        return [{ label: "Inbox" }];
      case "comments":
        return [{ label: "Comments" }];
      case "activity":
        return [{ label: "Activity" }];
      case "settings":
        return [{ label: "Settings" }];
      case "account":
        return [{ label: "Account" }];
      default:
        return [{ label: "Dashboard" }];
    }
  }

  function renderContent() {
    switch (currentSection) {
      case "dashboard":
        return <Dashboard />;
      case "analytics":
        return <AnalyticsPage />;
      case "blogs":
        return <BlogManager />;
      case "blog-editor":
        return <BlogEditor />;
      case "notes":
        return <NoteManager />;
      case "note-editor":
        return <NoteEditor />;
      case "series":
        return <SeriesManager />;
      case "newsletter":
        return <NewsletterManager />;
      case "media":
        return <MediaLibrary />;
      case "inbox":
        return <InboxContent />;
      case "comments":
        return <CommentManager />;
      case "activity":
        return <ActivityLog />;
      case "settings":
        return <SettingsPage />;
      case "account":
        return <AccountPage />;
      default:
        return <Dashboard />;
    }
  }

  const breadcrumbs = getBreadcrumb();

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col border-r bg-card transition-all duration-300 ease-in-out shadow-sm",
          sidebarCollapsed ? "w-14" : "w-56"
        )}
      >
        <SidebarContent />
      </aside>

      {/* Mobile sidebar (Sheet) */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-56 p-0 transition-all duration-300 bg-card/95 backdrop-blur-xl">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="relative h-14 flex items-center gap-4 px-4 sm:px-6 shrink-0">
          {/* Subtle gradient line at bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

          {/* Mobile hamburger */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-8 w-8 hover:bg-accent/50 transition-colors duration-200"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-4 h-4" />
          </Button>

          {/* Desktop collapse toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden lg:flex h-8 w-8 hover:bg-accent/50 transition-colors duration-200"
            onClick={toggleSidebar}
          >
            <ChevronLeft
              className={cn(
                "w-4 h-4 transition-transform duration-300 ease-in-out",
                sidebarCollapsed ? "rotate-180" : ""
              )}
            />
          </Button>

          {/* Breadcrumbs */}
          <Breadcrumb className="hidden sm:flex">
            <BreadcrumbList className="gap-1.5">
              {breadcrumbs.map((crumb, i) => (
                <span key={i} className="flex items-center">
                  {i > 0 && <BreadcrumbSeparator className="text-muted-foreground/60" />}
                  <BreadcrumbItem>
                    {i === breadcrumbs.length - 1 ? (
                      <BreadcrumbPage className="text-sm font-medium">{crumb.label}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink
                        className="cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
                        onClick={() =>
                          crumb.section && setCurrentSection(crumb.section)
                        }
                      >
                        {crumb.label}
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </span>
              ))}
            </BreadcrumbList>
          </Breadcrumb>

          <span className="sm:hidden text-sm font-medium truncate flex-1">
            {breadcrumbs[breadcrumbs.length - 1]?.label}
          </span>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSection}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="h-full"
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
