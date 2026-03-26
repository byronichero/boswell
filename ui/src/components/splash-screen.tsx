import { Button } from "@/components/ui/button";

interface SplashScreenProps {
  readonly onEnter: () => void;
}

export function SplashScreen({ onEnter }: SplashScreenProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <video
        className="absolute inset-0 h-full w-full object-cover opacity-35"
        autoPlay
        muted
        loop
        playsInline
        poster="/boswell.jpg"
      >
        <source src="/videos/boswell-intro-placeholder.mp4" type="video/mp4" />
      </video>

      <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/65 to-background/90" />

      <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 text-center">
        <p className="mb-4 text-sm uppercase tracking-[0.2em] text-muted-foreground">Boswell</p>
        <h1 className="max-w-3xl font-serif text-4xl font-semibold leading-tight md:text-6xl">
          "I am lost without my Boswell."
        </h1>
        <p className="mt-5 max-w-2xl text-sm text-muted-foreground md:text-base">
          Video placeholder active. Replace <code>/videos/boswell-intro-placeholder.mp4</code> when your final
          intro cut is ready.
        </p>
        <Button className="mt-8 h-11 px-8 text-base" onClick={onEnter}>
          Chat with Boswell
        </Button>
      </div>
    </div>
  );
}
