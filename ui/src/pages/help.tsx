import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function Step({ title, body }: Readonly<{ title: string; body: React.ReactNode }>) {
  return (
    <div className="rounded-md border bg-background p-4">
      <div className="mb-1 font-medium">{title}</div>
      <div className="text-sm text-muted-foreground">{body}</div>
    </div>
  );
}

export default function HelpPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Help</CardTitle>
        <CardDescription>How to use Boswell for evidence-first close reading.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Step
          title="1) Set your scope"
          body={
            <>
              Choose a period and whether to use <strong>Soft scope</strong>. Your tools will operate over works in the
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
              Think like an editor: remove weak or irrelevant excerpts. Your final argument is only as strong as your
              tray.
            </>
          }
        />
        <Step
          title="4) Interrogate with Chat"
          body={
            <>
              Use <strong>Chat</strong> to ask targeted questions. If the assistant says “insufficient evidence,” add
              counter-evidence or propose evidence and curate it into your tray.
            </>
          }
        />
        <Step
          title="5) Produce a synthesis"
          body={
            <>
              Use <strong>Synthesize</strong> to draft an evidence-grounded response. Check that the citations match
              the excerpts and that the claims do not overreach.
            </>
          }
        />
        <Step
          title="Troubleshooting"
          body={
            <>
              If semantic search or synthesis fails, check <strong>App status</strong>. Neo4j and Qdrant are optional
              but recommended; Ollama must be reachable for synthesis.
            </>
          }
        />
      </CardContent>
    </Card>
  );
}

