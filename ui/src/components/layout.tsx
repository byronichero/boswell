import { useEffect, useState } from "react";
import {
  Activity,
  BarChart3,
  GraduationCap,
  HelpCircle,
  Home,
  Inbox,
  Library,
  ListTree,
  Menu,
  MessageSquare,
  MessagesSquare,
  Network,
  Search,
  Sparkles,
} from "lucide-react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";

import { ChatBubble } from "@/components/chat-bubble";
import { ThemeToggle } from "@/components/theme-toggle";
import { TtsVoiceSelect } from "@/components/tts-voice-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCorpusScope } from "@/contexts/corpus-scope";
import { useTray } from "@/contexts/tray";
import { cn } from "@/lib/utils";

const SIDEBAR_COLLAPSED_KEY = "boswell-sidebar-collapsed";

function NavItem({
  to,
  label,
  icon,
  collapsed,
}: Readonly<{
  to: string;
  label: string;
  icon: React.ReactNode;
  collapsed: boolean;
}>) {
  return (
    <NavLink
      to={to}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        cn(
          "group flex items-center gap-3 rounded-md py-2 text-sm transition-colors",
          collapsed ? "justify-center px-2" : "px-3",
          isActive
            ? "bg-primary text-primary-foreground"
            : "text-[hsl(var(--sidebar-foreground))] hover:bg-muted",
        )
      }
    >
      <span className="flex h-6 w-6 shrink-0 items-center justify-center">{icon}</span>
      {!collapsed && <span className="truncate">{label}</span>}
    </NavLink>
  );
}

export default function Layout() {
  const { pathname } = useLocation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    if (globalThis.window === undefined) return false;
    return globalThis.window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
  });

  useEffect(() => {
    globalThis.window?.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  const isHome = pathname === "/";
  const isGraphLab = pathname === "/graph-lab";
  let contentMaxWidthClass = "max-w-6xl";
  if (isHome || isGraphLab) {
    // Home: room for chat + Quick actions; Graph Lab: wide Memgraph embed.
    contentMaxWidthClass = "max-w-7xl";
  }
  const { periods, periodId, setPeriodId, softScope, setSoftScope, scopeInfo } = useCorpusScope();
  const { tray, isLoading: trayLoading, error: trayError, removeItem } = useTray();

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar — collapsible (Richelieu-style): icon rail when minimized */}
      <aside
        className={cn(
          "hidden min-h-0 flex-col border-r bg-[hsl(var(--sidebar))] transition-all duration-200 md:flex",
          isSidebarCollapsed ? "w-20" : "w-64",
        )}
      >
        <div className="flex h-[4.5rem] shrink-0 items-center justify-between gap-2 border-b border-border/60 px-2">
          <Link
            to="/"
            className={cn(
              "flex min-w-0 items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--sidebar))]",
              isSidebarCollapsed ? "flex-1 justify-center" : "flex-1",
            )}
          >
            <img
              src="/boswell.jpg"
              alt="Boswell"
              className="h-10 w-10 shrink-0 rounded-md object-cover ring-1 ring-border"
            />
            {!isSidebarCollapsed && (
              <div className="min-w-0">
                <div className="truncate font-serif text-lg font-semibold">Boswell</div>
                <div className="truncate text-xs text-muted-foreground">Your faithful literary companion</div>
              </div>
            )}
          </Link>
          <button
            type="button"
            onClick={() => setIsSidebarCollapsed((v) => !v)}
            aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!isSidebarCollapsed}
            className="shrink-0 rounded-md p-2 text-[hsl(var(--sidebar-foreground))]/80 transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Menu className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain px-2 py-3 pb-4">
          <NavItem collapsed={isSidebarCollapsed} to="/" label="Home" icon={<Home className="h-4 w-4" />} />
          <NavItem collapsed={isSidebarCollapsed} to="/corpus" label="Corpus" icon={<Library className="h-4 w-4" />} />
          <NavItem
            collapsed={isSidebarCollapsed}
            to="/concordance"
            label="Concordance"
            icon={<Search className="h-4 w-4" />}
          />
          <NavItem collapsed={isSidebarCollapsed} to="/keywords" label="Keywords" icon={<ListTree className="h-4 w-4" />} />
          <NavItem collapsed={isSidebarCollapsed} to="/semantic" label="Semantic" icon={<Sparkles className="h-4 w-4" />} />
          <NavItem
            collapsed={isSidebarCollapsed}
            to="/stylistics"
            label="Stylistics"
            icon={<BarChart3 className="h-4 w-4" />}
          />
          <NavItem
            collapsed={isSidebarCollapsed}
            to="/synthesize"
            label="Synthesize"
            icon={<MessageSquare className="h-4 w-4" />}
          />
          <NavItem
            collapsed={isSidebarCollapsed}
            to="/chat"
            label="Evidence chat"
            icon={<MessagesSquare className="h-4 w-4" />}
          />
          <NavItem
            collapsed={isSidebarCollapsed}
            to="/knowledge-base"
            label="Knowledge Base"
            icon={<Inbox className="h-4 w-4" />}
          />
          <NavItem collapsed={isSidebarCollapsed} to="/graph-lab" label="Graph Lab" icon={<Network className="h-4 w-4" />} />
          <div className="my-2 border-t border-border/60" />
          <NavItem
            collapsed={isSidebarCollapsed}
            to="/tutorial"
            label="Getting started"
            icon={<GraduationCap className="h-4 w-4" />}
          />
          <NavItem collapsed={isSidebarCollapsed} to="/status" label="Status" icon={<Activity className="h-4 w-4" />} />
          <NavItem collapsed={isSidebarCollapsed} to="/faq" label="FAQ" icon={<HelpCircle className="h-4 w-4" />} />
          <NavItem collapsed={isSidebarCollapsed} to="/help" label="Help" icon={<HelpCircle className="h-4 w-4" />} />
        </nav>
        <div className="shrink-0 border-t px-2 py-4">
          <div
            className={cn(
              "flex flex-col gap-3",
              isSidebarCollapsed ? "items-center" : "",
            )}
          >
            <div
              className={cn(
                "flex items-center gap-2",
                isSidebarCollapsed ? "flex-col justify-center" : "justify-between",
              )}
            >
              {!isSidebarCollapsed && <div className="text-xs text-muted-foreground">Theme</div>}
              <ThemeToggle />
            </div>
            {(isHome || isGraphLab) && (
              <TtsVoiceSelect
                id="sidebar-tts-voice"
                compact={isSidebarCollapsed}
                className={cn(isSidebarCollapsed ? "w-full flex-col items-stretch gap-1" : "")}
              />
            )}
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex min-w-0 flex-1 flex-col">
        {(isHome || isGraphLab) && (
          <div className="flex flex-wrap items-center justify-end gap-2 border-b bg-background/85 px-4 py-2 md:hidden">
            <TtsVoiceSelect id="mobile-home-tts-voice" compact />
            <ThemeToggle />
          </div>
        )}
        {/* Header / scope controls (hidden on Home / Graph Lab for full-width content) */}
        {!isHome && !isGraphLab && (
        <div className="sticky top-0 z-20 border-b bg-background/85 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground" htmlFor="period">
                Period
              </label>
              <select
                id="period"
                className="h-9 max-w-xs rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={periodId ?? ""}
                onChange={(e) => setPeriodId(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">All periods</option>
                {periods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.start_year}–{p.end_year})
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={softScope}
                onChange={(e) => setSoftScope(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              <span className="text-muted-foreground">Soft scope</span>
            </label>

            <TtsVoiceSelect id="header-tts-voice" className="w-full sm:w-auto" />

            <div className="ml-auto flex items-center gap-2 md:hidden">
              <ThemeToggle />
            </div>

            {scopeInfo && (
              <div className="w-full text-xs text-muted-foreground">
                Scope: {scopeInfo.included_period_names.join(" · ")}
              </div>
            )}
          </div>
        </div>
        )}

        <div
          className={cn(
            "mx-auto flex w-full flex-1 gap-4 px-4 py-6",
            contentMaxWidthClass,
          )}
        >
          <div className="min-w-0 flex-1">
            <Outlet />
          </div>

          {/* Evidence tray rail */}
          {!isHome && !isGraphLab && (
          <aside className="hidden w-[360px] shrink-0 lg:block">
            <Card className="sticky top-[84px] bg-[hsl(var(--tray))]">
              <CardHeader>
                <CardTitle>Evidence tray</CardTitle>
                <CardDescription>
                  Items cited by synthesis include stable tray item ids.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {trayError && (
                  <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                    {trayError}
                  </div>
                )}
                {trayLoading && (
                  <div className="text-sm text-muted-foreground">Loading tray…</div>
                )}
                {!trayLoading && tray?.items.length === 0 && (
                  <div className="text-sm text-muted-foreground">
                    Add excerpts from Concordance or Semantic results.
                  </div>
                )}
                {tray?.items.map((it) => (
                  <div key={it.tray_item_id} className="rounded-md border bg-background p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{it.work_title}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {it.author}
                          {it.locator && ` · ${it.locator}`}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={async () => removeItem(it.tray_item_id)}
                        aria-label="Remove tray item"
                        title="Remove"
                      >
                        ×
                      </Button>
                    </div>
                    <div className="mt-2 line-clamp-5 whitespace-pre-wrap text-sm">
                      {it.excerpt}
                    </div>
                    <div className="mt-2 font-mono text-[10px] text-muted-foreground">
                      tray_item_id={it.tray_item_id}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </aside>
          )}
        </div>
      </main>

      <ChatBubble />
    </div>
  );
}

