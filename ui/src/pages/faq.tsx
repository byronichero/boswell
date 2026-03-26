import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function Qa({ q, a }: Readonly<{ q: string; a: React.ReactNode }>) {
  return (
    <div className="rounded-md border bg-background p-4">
      <div className="mb-1 font-medium">{q}</div>
      <div className="text-sm text-muted-foreground">{a}</div>
    </div>
  );
}

export default function FaqPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>FAQ</CardTitle>
        <CardDescription>Common questions about Boswell’s evidence-grounded workflow.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Qa
          q="What is the Evidence tray?"
          a={
            <>
              The Evidence tray is your curated set of excerpts. Boswell’s synthesis and chat are designed to answer using
              only those excerpts, citing them as <span className="font-mono">[T1]</span>, <span className="font-mono">[T2]</span>, …
            </>
          }
        />
        <Qa
          q="Why does Boswell sometimes refuse to answer?"
          a="Because academic work must be supported by evidence. If the tray doesn’t contain support for a claim, the correct response is: “insufficient evidence.”"
        />
        <Qa
          q="What does “Propose evidence” mean?"
          a="It runs semantic retrieval to suggest candidate passages. You choose which passages to accept by adding them to the tray."
        />
        <Qa
          q="What is “Soft scope”?"
          a="Soft scope expands the selected period to neighboring periods to avoid overly strict filtering. Hard scope (future) would restrict strictly to one period."
        />
        <Qa
          q="Do I need to trust the model?"
          a={
            <>
              You should trust the <em>citations</em>, not the prose. Treat the model as a drafting assistant whose claims must be traceable back to the excerpts.
            </>
          }
        />
      </CardContent>
    </Card>
  );
}

