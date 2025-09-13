import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Folder, Image, Settings } from "lucide-react";

interface FineTuneResultsProps {
  result: {
    success: boolean;
    message: string;
    data: {
      video: {
        originalName: string;
        processedAt: string;
      };
      extraction: {
        frameCount: number;
        framesFolder: string;
        frameFiles: Array<{ name: string; path: string }>;
        settings: {
          fps: number;
          maxFrames?: number;
          format: string;
          size: string;
        };
      };
    };
  };
}

const FineTuneResults = ({ result }: FineTuneResultsProps) => {
  const { data } = result;

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-green-600">
          <CheckCircle className="h-5 w-5" />
          Processing Complete
        </CardTitle>
        <CardDescription>
          {result.message}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Video Info */}
        <div className="space-y-2">
          <h3 className="font-medium">Video Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Original File:</span>
              <p className="font-mono">{data.video.originalName}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Processed At:</span>
              <p className="font-mono">
                {new Date(data.video.processedAt).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Extraction Results */}
        <div className="space-y-2">
          <h3 className="font-medium flex items-center gap-2">
            <Image className="h-4 w-4" />
            Frame Extraction Results
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {data.extraction.frameCount} frames
                </Badge>
                <span className="text-sm text-muted-foreground">extracted</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Folder className="h-4 w-4 text-muted-foreground" />
                <span className="font-mono text-xs">frames-for-fine-tuning/</span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Settings</span>
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>FPS: {data.extraction.settings.fps}</p>
                <p>Format: {data.extraction.settings.format.toUpperCase()}</p>
                <p>Size: {data.extraction.settings.size}</p>
                {data.extraction.settings.maxFrames && (
                  <p>Max Frames: {data.extraction.settings.maxFrames}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Frame Files List */}
        <div className="space-y-2">
          <h3 className="font-medium">Generated Frames</h3>
          <div className="max-h-40 overflow-y-auto border rounded-lg p-3">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-xs font-mono">
              {data.extraction.frameFiles.slice(0, 20).map((frame, index) => (
                <div
                  key={index}
                  className="bg-muted px-2 py-1 rounded text-center"
                >
                  {frame.name}
                </div>
              ))}
              {data.extraction.frameFiles.length > 20 && (
                <div className="bg-muted px-2 py-1 rounded text-center text-muted-foreground">
                  +{data.extraction.frameFiles.length - 20} more...
                </div>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            All frames are saved with indexed names (0.{data.extraction.settings.format}, 1.{data.extraction.settings.format}, etc.)
          </p>
        </div>

        {/* Folder Path */}
        <div className="bg-muted p-3 rounded-lg">
          <p className="text-xs text-muted-foreground mb-1">Frames saved to:</p>
          <p className="font-mono text-sm break-all">
            {data.extraction.framesFolder}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default FineTuneResults;