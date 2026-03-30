import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { BookOpen, GraduationCap, HelpCircle, Library, Sparkles } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface HelpItem {
  title: string;
  description: string;
  href?: string;
}

const helpSections: Array<{
  title: string;
  icon: typeof BookOpen;
  description: string;
  items: HelpItem[];
}> = [
  {
    title: "Getting started",
    icon: GraduationCap,
    description: "Corpus, period scope, and where to load demo data",
    items: [
      {
        title: "Tutorial: five moves + starter corpus",
        description:
          "Step-by-step close reading workflow (scope → Concordance/Semantic → Evidence tray → Evidence chat → Synthesize). Includes copy-paste commands for init_data and optional Gutenberg downloads.",
        href: "/tutorial",
      },
      {
        title: "Starter corpus command (quick link)",
        description:
          "Same seeding steps as the Tutorial: run docker compose exec backend python /app/scripts/init_data.py after the stack is up.",
        href: "/tutorial#starter-corpus",
      },
      {
        title: "Browse the Corpus",
        description:
          "See works and periods that drive scoped search. Period labels are literary-historical frames for your analysis, not a complete chronology of English literature.",
        href: "/corpus",
      },
      {
        title: "Period scope",
        description:
          "On most pages, the header lets you pick a period and Soft scope. Tools retrieve passages from works in that scope; soft scope can include neighboring periods when enabled.",
      },
    ],
  },
  {
    title: "Evidence-first workflow",
    icon: BookOpen,
    description: "How to use Boswell for close reading",
    items: [
      {
        title: "Find passages",
        description:
          "Use Concordance for KWIC keyword lines and Semantic for meaning-based retrieval. Add strong lines to the Evidence tray.",
        href: "/concordance",
      },
      {
        title: "Curate the Evidence tray",
        description:
          "Treat the tray like a working set of quotations: drop weak matches so your argument stays tied to the text.",
      },
      {
        title: "Evidence chat",
        description:
          "Ask targeted questions with the tray in context. If the assistant says evidence is insufficient, add or refine excerpts before generalizing.",
        href: "/chat",
      },
      {
        title: "Synthesize",
        description:
          "Draft an answer grounded in the tray. Verify every citation against the excerpts you allowed in.",
        href: "/synthesize",
      },
    ],
  },
  {
    title: "Graph & status",
    icon: Sparkles,
    description: "Optional tools and health checks",
    items: [
      {
        title: "Graph Lab",
        description:
          "Explore the period–work graph in Memgraph Lab (same graph the backend uses for scoping). Open from the Graph Lab page; embedded via the app origin.",
        href: "/graph-lab",
      },
      {
        title: "App status",
        description:
          "If semantic search or synthesis fails, check Ollama, Qdrant, and Memgraph. Memgraph and Qdrant are recommended; Ollama must be reachable for synthesis.",
        href: "/status",
      },
    ],
  },
];

function Step({ title, body }: Readonly<{ title: string; body: ReactNode }>) {
  return (
    <div className="rounded-md border bg-background p-4">
      <div className="mb-1 font-medium">{title}</div>
      <div className="text-sm text-muted-foreground">{body}</div>
    </div>
  );
}

export default function HelpPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-4xl font-bold tracking-tight">Help</h1>
        <p className="text-base text-muted-foreground">
          Evidence-first close reading with the Boswell stack. For runnable commands and the full tutorial, start with{" "}
          <Link to="/tutorial" className="font-medium text-primary underline underline-offset-4 hover:no-underline">
            Getting started
          </Link>
          .
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {helpSections.map((section) => (
          <Card key={section.title}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-serif">
                <section.icon className="h-5 w-5 text-primary" />
                {section.title}
              </CardTitle>
              <CardDescription>{section.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                {section.items.map((item) => (
                  <li key={item.title} className="flex items-start gap-3">
                    <span className="mt-1 shrink-0 text-primary">•</span>
                    <div className="min-w-0">
                      {item.href ? (
                        <Link
                          to={item.href}
                          className="font-medium text-foreground hover:text-primary hover:underline"
                        >
                          {item.title}
                        </Link>
                      ) : (
                        <span className="font-medium text-foreground">{item.title}</span>
                      )}
                      <p className="mt-0.5 text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-serif">
            <Library className="h-5 w-5 text-primary" />
            At a glance
          </CardTitle>
          <CardDescription>Numbered workflow (same as the Tutorial, in brief).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Step
            title="1) Set your scope"
            body={
              <>
                Choose a period and whether to use <strong>Soft scope</strong>. Your tools operate over works in the
                current scope.
              </>
            }
          />
          <Step
            title="2) Find passages"
            body={
              <>
                Use <strong>Concordance</strong> for KWIC searches and <strong>Semantic</strong> to retrieve relevant
                passages by meaning. Add strong passages to your Evidence tray.
              </>
            }
          />
          <Step
            title="3) Curate the Evidence tray"
            body={
              <>
                Think like an editor: remove weak or irrelevant excerpts. Your argument is only as strong as the tray.
              </>
            }
          />
          <Step
            title="4) Interrogate with Chat"
            body={
              <>
                Use <strong>Evidence chat</strong> for targeted questions. If the assistant says “insufficient
                evidence,” add counter-evidence or refine the tray.
              </>
            }
          />
          <Step
            title="5) Produce a synthesis"
            body={
              <>
                Use <strong>Synthesize</strong> to draft an evidence-grounded response. Check citations against the
                excerpts.
              </>
            }
          />
        </CardContent>
      </Card>

      <Card id="troubleshooting">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-serif">
            <HelpCircle className="h-5 w-5 text-primary" />
            Troubleshooting
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>
            If semantic search or synthesis fails, check <Link to="/status" className="text-primary underline">App status</Link>.
            Memgraph and Qdrant are optional but recommended; Ollama must be reachable for synthesis and chat models.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
