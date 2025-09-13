import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileVideo, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FineTuneUploadProps {
  onUploadComplete?: (result: any) => void;
}

interface ProcessingResult {
  success: boolean;
  message: string;
  data?: {
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
  error?: string;
  details?: string;
}

const FineTuneUpload = ({ onUploadComplete }: FineTuneUploadProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [fps, setFps] = useState("1");
  const [maxFrames, setMaxFrames] = useState("");
  const [format, setFormat] = useState("jpg");
  const [size, setSize] = useState("-1:1080");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      if (!selectedFile.type.startsWith('video/')) {
        toast({
          title: "Invalid file type",
          description: "Please select a video file.",
          variant: "destructive",
        });
        return;
      }
      
      // Validate file size (1GB limit)
      const maxSize = 1024 * 1024 * 1024;
      if (selectedFile.size > maxSize) {
        toast({
          title: "File too large",
          description: "Video file must be smaller than 1GB.",
          variant: "destructive",
        });
        return;
      }

      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a video file first.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('video', file);
      formData.append('fps', fps);
      if (maxFrames) formData.append('maxFrames', maxFrames);
      formData.append('format', format);
      formData.append('size', size);

      console.log('Uploading video for fine-tuning:', {
        fileName: file.name,
        size: file.size > 1024 * 1024 * 1024 
          ? `${(file.size / 1024 / 1024 / 1024).toFixed(2)} GB`
          : `${(file.size / 1024 / 1024).toFixed(2)} MB`,
        fps,
        maxFrames,
        format
      });

      const response = await fetch('/api/fine-tune/upload-video', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`Expected JSON response, got: ${contentType}. Response: ${text.slice(0, 200)}`);
      }

      const result: ProcessingResult = await response.json();

      if (result.success && result.data) {
        toast({
          title: "Processing complete!",
          description: `Successfully extracted ${result.data.extraction.frameCount} frames`,
        });
        
        onUploadComplete?.(result);
        
        // Reset form
        setFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        throw new Error(result.error || result.details || 'Processing failed');
      }

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Processing failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileVideo className="h-5 w-5" />
          Fine-Tune Video Upload
        </CardTitle>
        <CardDescription>
          Upload a video (up to 1GB) to extract indexed frames for fine-tuning. Frames will be saved in a "frames-for-fine-tuning" folder.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* File Upload */}
        <div className="space-y-2">
          <Label htmlFor="video-upload">Video File</Label>
          <div className="flex items-center gap-4">
            <Input
              id="video-upload"
              type="file"
              accept="video/*"
              onChange={handleFileSelect}
              ref={fileInputRef}
              className="flex-1"
            />
            {file && (
              <div className="text-sm text-muted-foreground">
                {file.size > 1024 * 1024 * 1024 
                  ? `${(file.size / 1024 / 1024 / 1024).toFixed(2)} GB`
                  : `${(file.size / 1024 / 1024).toFixed(2)} MB`
                }
              </div>
            )}
          </div>
          {file && (
            <p className="text-sm text-muted-foreground">
              Selected: {file.name}
            </p>
          )}
        </div>

        {/* Settings */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="fps">Frames per Second</Label>
            <Input
              id="fps"
              type="number"
              min="0.1"
              max="30"
              step="0.1"
              value={fps}
              onChange={(e) => setFps(e.target.value)}
              placeholder="1"
            />
            <p className="text-xs text-muted-foreground">Extract rate (default: 1 fps)</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="max-frames">Max Frames (Optional)</Label>
            <Input
              id="max-frames"
              type="number"
              min="1"
              value={maxFrames}
              onChange={(e) => setMaxFrames(e.target.value)}
              placeholder="No limit"
            />
            <p className="text-xs text-muted-foreground">Leave empty for all frames</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="format">Format</Label>
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="jpg">JPG</SelectItem>
                <SelectItem value="png">PNG</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Output format</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="size">Quality</Label>
            <Select value={size} onValueChange={setSize}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="-1:720">720p (HD)</SelectItem>
                <SelectItem value="-1:1080">1080p (Full HD)</SelectItem>
                <SelectItem value="-1:1440">1440p (2K)</SelectItem>
                <SelectItem value="-1:2160">2160p (4K)</SelectItem>
                <SelectItem value="-1:-1">Original</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Preserves aspect ratio</p>
          </div>
        </div>

        {/* Upload Button */}
        <Button
          onClick={handleUpload}
          disabled={!file || isUploading}
          className="w-full"
          size="lg"
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing Video...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Extract Frames
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default FineTuneUpload;