import Hero from "@/components/Hero";
import VideoUploadForm from "@/components/VideoUploadForm";
import AIDetectionResults, { AIDetectionSummary } from "@/components/AIDetectionResults";
import LiveFrames from "@/components/LiveFrames";
import { useState } from "react";

const Index = () => {
  const [analysisResult, setAnalysisResult] = useState<AIDetectionSummary | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  const scrollToUpload = () => {
    const uploadSection = document.getElementById('upload');
    if (uploadSection) uploadSection.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <main className="min-h-screen bg-background">
      <Hero onScrollToUpload={scrollToUpload} />

      <div className="w-full max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-16 space-y-8">
        {/* 1) Upload form */}
        <VideoUploadForm
          onUploadStart={() => {
            setIsAnalyzing(true);
            setAnalysisResult(null); // Clear previous results
          }}
          onAnalyzed={(payload) => {
            // Defensive in case payload is null/undefined
            const parsed = payload?.parsed ?? null;
            setAnalysisResult(parsed);
            setIsAnalyzing(false); // Stop live frames
          }}
        />

        {/* 1.5) Live frames during analysis */}
        {isAnalyzing && (
          <LiveFrames isUploading={isAnalyzing} />
        )}

        {/* 2) Results always under the form */}
        {analysisResult && (
          <AIDetectionResults data={analysisResult} />
        )}
      </div>
    </main>
  );
};

export default Index;
