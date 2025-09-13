import { useState } from "react";
import FineTuneUpload from "@/components/FineTuneUpload";
import FineTuneResults from "@/components/FineTuneResults";

const FineTune = () => {
  const [processingResult, setProcessingResult] = useState<any>(null);

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background">
      <div className="container mx-auto px-4 py-8 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Fine Tune</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Upload videos to extract indexed frames for fine-tuning your models. 
            Frames will be saved with sequential names (0.jpg, 1.jpg, etc.) in a dedicated folder.
          </p>
        </div>

        <FineTuneUpload onUploadComplete={setProcessingResult} />

        {processingResult && (
          <FineTuneResults result={processingResult} />
        )}
      </div>
    </main>
  );
};

export default FineTune;