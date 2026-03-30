import { useState } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  Check,
  ChevronRight,
  Copy,
  Database,
  GraduationCap,
  HelpCircle,
  Library,
  MessageSquare,
  Network,
  Search,
  Sparkles,
  Terminal,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const CMD_INIT_DATA = "docker compose exec backend python /app/scripts/init_data.py";
const CMD_INIT_SKIP = "docker compose exec backend python /app/scripts/init_data.py --skip-qdrant --skip-memgraph";
const CMD_GUTENBERG = "docker compose exec backend python /app/scripts/download_gutenberg.py --tier-b";

const workflowSteps = [
  {
    num: 1,
    title: "Choose period scope",
    description:
      "Use the Period control and Soft scope in the header (on most pages). Your searches and retrieval respect the works tied to those literary-historical periods.",
    action: "Corpus overview",
    href: "/corpus",
    icon: Library,
  },
  {
    num: 2,
    title: "Find passages",
    description:
      "Run keyword lines in Concordance (KWIC) or meaning-based retrieval in Semantic. You are building an argument from textual evidence, not skimming summaries.",
    action: "Concordance",
    href: "/concordance",
    icon: Search,
  },
  {
    num: 3,
    title: "Fill the Evidence tray",
    description:
      "Add excerpts that actually support your claim. The tray is your working bibliography of quotations—curate it like an editor.",
    action: "Semantic search",
    href: "/semantic",
    icon: Sparkles,
  },
  {
    num: 4,
    title: "Interrogate with Evidence chat",
    description:
      "Ask narrow questions against what you have collected. If the model pushes back on evidence, strengthen the tray before you generalize.",
    action: "Evidence chat",
    href: "/chat",
    icon: MessageSquare,
  },
  {
    num: 5,
    title: "Synthesize",
    description:
      "Draft a grounded response that cites your tray. Check every claim against the excerpts you allowed in.",
    action: "Synthesize",
    href: "/synthesize",
    icon: BookOpen,
  },
] as const;

export default function TutorialPage() {
  const [copiedInit, setCopiedInit] = useState(false);
  const [copiedSkip, setCopiedSkip] = useState(false);
  const [copiedGutenberg, setCopiedGutenberg] = useState(false);

  function copyText(text: string, which: "init" | "skip" | "gutenberg"): void {
    void navigator.clipboard.writeText(text);
    if (which === "init") {
      setCopiedInit(true);
      setTimeout(() => setCopiedInit(false), 2000);
    } else if (which === "skip") {
      setCopiedSkip(true);
      setTimeout(() => setCopiedSkip(false), 2000);
    } else {
      setCopiedGutenberg(true);
      setTimeout(() => setCopiedGutenberg(false), 2000);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-4xl font-bold tracking-tight">Getting started</h1>
        <p className="mt-1 text-base text-muted-foreground">
          A short tutorial for literary scholars: corpus, period scope, Evidence tray, and how to load the bundled
          starter text when you are testing the stack.
        </p>
      </div>

      <Card id="workflow" className="border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-serif">
            <GraduationCap className="h-5 w-5" />
            Close reading in five moves
          </CardTitle>
          <CardDescription>
            Boswell is built for evidence-first work: scope → find → tray → chat → synthesis.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {workflowSteps.map((step) => (
            <div
              key={step.num}
              className="flex flex-col gap-3 rounded-lg border bg-background p-4 sm:flex-row sm:items-center"
            >
              <div className="flex items-center gap-3 sm:w-72">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {step.num}
                </span>
                <step.icon className="h-5 w-5 shrink-0 text-primary" />
                <div>
                  <h3 className="font-medium">{step.title}</h3>
                  <p className="text-xs text-muted-foreground sm:hidden">{step.description}</p>
                </div>
              </div>
              <p className="hidden flex-1 text-sm text-muted-foreground sm:block">{step.description}</p>
              <Link to={step.href} className="shrink-0">
                <Button variant="outline" size="sm" className="w-full sm:w-auto">
                  {step.action}
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card id="starter-corpus" className="border-amber-500/30 bg-amber-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-serif">
            <Terminal className="h-5 w-5" />
            Load the starter corpus (demo seed)
          </CardTitle>
          <CardDescription>
            After <code className="rounded bg-muted px-1">docker compose up</code>, run the initializer once. It loads
            literary periods, the bundled Gutenberg sample (e.g. Shakespeare Sonnet 18), Memgraph relationships, and
            Qdrant chunks when those services are up. All of it is for testing and pedagogy—not a claim about a
            complete edition.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm">From your project root (same machine as Docker):</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <code className="flex-1 rounded-md border bg-muted px-4 py-3 font-mono text-sm">{CMD_INIT_DATA}</code>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0"
              aria-label="Copy init command"
              onClick={() => copyText(CMD_INIT_DATA, "init")}
            >
              {copiedInit ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Development only: <code className="rounded bg-muted px-1">--force</code> resets the database and vector
            collection. If Qdrant or Memgraph is down, use the variant below instead of skipping the whole script.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <code className="flex-1 rounded-md border bg-muted px-4 py-3 font-mono text-sm">{CMD_INIT_SKIP}</code>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0"
              aria-label="Copy skip-services command"
              onClick={() => copyText(CMD_INIT_SKIP, "skip")}
            >
              {copiedSkip ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <Link to="/corpus">
            <Button>Open Corpus</Button>
          </Link>
        </CardContent>
      </Card>

      <Card id="gutenberg-download" className="border-amber-500/30 bg-amber-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-serif">
            <Database className="h-5 w-5" />
            Optional: download more Gutenberg texts
          </CardTitle>
          <CardDescription>
            The manifest in <code className="rounded bg-muted px-1">docs/corpus-manifest.yaml</code> lists tiered
            texts. This command downloads tier-b IDs into <code className="rounded bg-muted px-1">docs/gutenberg/cache/</code>{" "}
            (gitignored). Run <strong>init</strong> again afterward if you ingest new files through your pipeline.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm">From your project root:</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <code className="flex-1 rounded-md border bg-muted px-4 py-3 font-mono text-sm">{CMD_GUTENBERG}</code>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0"
              aria-label="Copy Gutenberg command"
              onClick={() => copyText(CMD_GUTENBERG, "gutenberg")}
            >
              {copiedGutenberg ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif">More in the app</CardTitle>
          <CardDescription>Places to explore once the stack is running.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <Link to="/graph-lab">
              <div className="rounded-lg border p-4 transition-colors hover:bg-accent/50">
                <Network className="mb-2 h-5 w-5 text-primary" />
                <h3 className="font-medium">Graph Lab</h3>
                <p className="text-sm text-muted-foreground">
                  Inspect period–work relationships in Memgraph Lab (embedded for convenience).
                </p>
              </div>
            </Link>
            <Link to="/knowledge-base">
              <div className="rounded-lg border p-4 transition-colors hover:bg-accent/50">
                <Database className="mb-2 h-5 w-5 text-primary" />
                <h3 className="font-medium">Knowledge Base</h3>
                <p className="text-sm text-muted-foreground">Upload your own documents for ingest and retrieval.</p>
              </div>
            </Link>
            <Link to="/status">
              <div className="rounded-lg border p-4 transition-colors hover:bg-accent/50">
                <Sparkles className="mb-2 h-5 w-5 text-primary" />
                <h3 className="font-medium">App status</h3>
                <p className="text-sm text-muted-foreground">Check Ollama, Qdrant, Memgraph, and the API.</p>
              </div>
            </Link>
            <Link to="/help">
              <div className="rounded-lg border p-4 transition-colors hover:bg-accent/50">
                <HelpCircle className="mb-2 h-5 w-5 text-primary" />
                <h3 className="font-medium">Help</h3>
                <p className="text-sm text-muted-foreground">Short reference for scope, tray, and troubleshooting.</p>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
