import { Button } from "@/components/ui/button";

interface HeroProps {
  onScrollToUpload: () => void;
}

const Hero = ({ onScrollToUpload }: HeroProps) => {
  return (
    <section className="min-h-screen flex flex-col items-center justify-center px-6 py-8 text-center">
      {/* Main Title */}
      <div className="mb-8">
        <h1 className="text-brutal-massive mb-6 tracking-tight">
          FU!SCAMMERS
        </h1>
        <div className="w-24 md:w-32 h-1 bg-accent mx-auto mb-6"></div>
        <p className="text-brutal-large max-w-xl md:max-w-2xl mx-auto mb-4">
          FIGHT BACK AGAINST FRAUD
        </p>
        <p className="text-lg md:text-xl font-mono max-w-sm md:max-w-3xl mx-auto text-muted-foreground px-4">
          Upload evidence. Expose scammers. Protect others from fraud.
        </p>
      </div>

      {/* Call to Action */}
      <div className="flex flex-col gap-6 items-center w-full max-w-sm md:max-w-none">
        <Button
          onClick={onScrollToUpload}
          size="lg"
          className="btn-brutal text-lg px-8 py-4 font-mono font-bold w-full md:w-auto touch-manipulation"
        >
          UPLOAD EVIDENCE
        </Button>
        <div className="flex items-center gap-4">
          <div className="w-6 h-6 md:w-8 md:h-8 bg-accent shadow-brutal"></div>
          <span className="font-mono text-sm">JOIN THE RESISTANCE</span>
        </div>
      </div>

      {/* Stats Grid - Mobile Optimized */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mt-12 md:mt-16 w-full max-w-sm md:max-w-2xl mx-auto">
        <div className="text-center">
          <div className="text-4xl md:text-6xl font-bold text-accent font-mono">∞</div>
          <div className="font-mono text-sm mt-2">SCAMMERS</div>
          <div className="font-mono text-xs md:text-sm text-muted-foreground">EXPOSED</div>
        </div>
        <div className="text-center">
          <div className="text-4xl md:text-6xl font-bold text-accent font-mono">24/7</div>
          <div className="font-mono text-sm mt-2">ACTIVE</div>
          <div className="font-mono text-xs md:text-sm text-muted-foreground">DEFENSE</div>
        </div>
        <div className="text-center">
          <div className="text-4xl md:text-6xl font-bold text-accent font-mono">100%</div>
          <div className="font-mono text-sm mt-2">SECURE</div>
          <div className="font-mono text-xs md:text-sm text-muted-foreground">UPLOAD</div>
        </div>
      </div>

      {/* Scroll Indicator - Hidden on Mobile */}
      <div className="hidden md:block absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-foreground rounded-full flex justify-center">
          <div className="w-1 h-3 bg-foreground rounded-full mt-2"></div>
        </div>
      </div>
    </section>
  );
};

export default Hero;