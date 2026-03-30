import {
  Activity,
  BarChart3,
  HelpCircle,
  Home,
  Inbox,
  Library,
  ListTree,
  MessageSquare,
  MessagesSquare,
  Network,
  Search,
  Sparkles,
} from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router-dom";

import { ChatBubble } from "@/components/chat-bubble";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCorpusScope } from "@/contexts/corpus-scope";
import { useTray } from "@/contexts/tray";
import { cn } from "@/lib/utils";

function NavItem({
  to,
  label,
  icon,
}: Readonly<{
  to: string;
  label: string;
  icon: React.ReactNode;
}>) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "group flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
          isActive
            ? "bg-primary text-primary-foreground"
            : "text-[hsl(var(--sidebar-foreground))] hover:bg-muted",
        )
      }
    >
      <span className="flex h-6 w-6 items-center justify-center">{icon}</span>
      <span className="truncate">{label}</span>
    </NavLink>
  );
}

export default function Layout() {
  const { pathname } = useLocation();
  const isHome = pathname === "/";
  const isGraphLab = pathname === "/graph-lab";
  let contentMaxWidthClass = "max-w-6xl";
  if (isHome) {
    contentMaxWidthClass = "max-w-4xl";
  } else if (isGraphLab) {
    contentMaxWidthClass = "max-w-7xl";
  }
  const { periods, periodId, setPeriodId, softScope, setSoftScope, scopeInfo } = useCorpusScope();
  const { tray, isLoading: trayLoading, error: trayError, removeItem } = useTray();

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className="hidden w-64 flex-col border-r bg-[hsl(var(--sidebar))] md:flex">
        <div className="flex items-center gap-3 px-4 py-4">
          <img
            src="/boswell.jpg"
            alt="Boswell"
            className="h-10 w-10 rounded-md object-cover ring-1 ring-border"
          />
          <div className="min-w-0">
            <div className="truncate font-serif text-lg font-semibold">Boswell</div>
            <div className="truncate text-xs text-muted-foreground">
              Your faithful literary companion
            </div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3 pb-4">
          <NavItem to="/" label="Home" icon={<Home className="h-4 w-4" />} />
          <NavItem to="/corpus" label="Corpus" icon={<Library className="h-4 w-4" />} />
          <NavItem to="/concordance" label="Concordance" icon={<Search className="h-4 w-4" />} />
          <NavItem to="/keywords" label="Keywords" icon={<ListTree className="h-4 w-4" />} />
          <NavItem to="/semantic" label="Semantic" icon={<Sparkles className="h-4 w-4" />} />
          <NavItem to="/stylistics" label="Stylistics" icon={<BarChart3 className="h-4 w-4" />} />
          <NavItem to="/synthesize" label="Synthesize" icon={<MessageSquare className="h-4 w-4" />} />
          <NavItem to="/chat" label="Evidence chat" icon={<MessagesSquare className="h-4 w-4" />} />
          <NavItem to="/knowledge-base" label="Knowledge Base" icon={<Inbox className="h-4 w-4" />} />
          <NavItem to="/graph-lab" label="Graph Lab" icon={<Network className="h-4 w-4" />} />
          <div className="my-2 border-t border-border/60" />
          <NavItem to="/status" label="Status" icon={<Activity className="h-4 w-4" />} />
          <NavItem to="/faq" label="FAQ" icon={<HelpCircle className="h-4 w-4" />} />
          <NavItem to="/help" label="Help" icon={<HelpCircle className="h-4 w-4" />} />
        </nav>
        <div className="border-t px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">Theme</div>
            <ThemeToggle />
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex min-w-0 flex-1 flex-col">
        {(isHome || isGraphLab) && (
          <div className="flex justify-end border-b bg-background/85 px-4 py-2 md:hidden">
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

