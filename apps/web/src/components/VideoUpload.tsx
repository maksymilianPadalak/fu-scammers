import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const VideoUpload = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [scammerInfo, setScammerInfo] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('video/')) {
      toast({
        title: "INVALID FILE TYPE",
        description: "Please upload a video file only.",
        variant: "destructive",
      });
      return;
    }
    
    if (file.size > 100 * 1024 * 1024) { // 100MB limit
      toast({
        title: "FILE TOO LARGE",
        description: "Video must be under 100MB.",
        variant: "destructive",
      });
      return;
    }
    
    setSelectedFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile) {
      toast({
        title: "NO FILE SELECTED",
        description: "Please select a video file to upload.",
        variant: "destructive",
      });
      return;
    }

    if (!scammerInfo.trim()) {
      toast({
        title: "MISSING INFORMATION",
        description: "Please provide scammer information.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('video', selectedFile);
      formData.append('description', scammerInfo.trim());

      console.log('Uploading video:', {
        filename: selectedFile.name,
        size: selectedFile.size,
        type: selectedFile.type,
        description: scammerInfo.trim()
      });

      // Simulate progress for user feedback
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // Upload to backend
      const response = await fetch('http://localhost:3001/api/upload-video', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      if (result.success) {
        // Log metadata and analysis to console as requested
        console.log('=== VIDEO UPLOAD SUCCESS ===');
        console.log('Response:', result);
        console.log('Video Metadata:', result.data?.metadata);
        console.log('File Path:', result.data?.filePath);
        console.log('Upload Timestamp:', result.data?.uploadedAt);
        
        if (result.data?.frameAnalysis) {
          console.log('=== AI-GENERATED VIDEO DETECTION ===');
          console.log('Detection Success:', result.data.frameAnalysis.success);
          if (result.data.frameAnalysis.success) {
            console.log('GPT-4.1 Detection Result:', result.data.frameAnalysis.analysis);
          } else {
            console.log('Detection Error:', result.data.frameAnalysis.error);
          }
          console.log('==================================');
        }
        
        console.log('============================');

        toast({
          title: "EVIDENCE SUBMITTED",
          description: `Your video "${selectedFile.name}" has been uploaded successfully. Thank you for fighting scammers!`,
        });

        // Reset form
        setSelectedFile(null);
        setScammerInfo("");
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      
      let errorMessage = "Failed to upload video. Please try again.";
      
      if (error instanceof Error) {
        if (error.message.includes('fetch')) {
          errorMessage = "Cannot connect to server. Please make sure the API server is running on port 3001.";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "UPLOAD FAILED",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <section id="upload" className="min-h-screen flex items-center justify-center px-4 md:px-6 py-8 md:py-16">
      <Card className="w-full max-w-lg md:max-w-2xl p-6 md:p-8 border-2 border-foreground shadow-brutal">
        <div className="mb-6 md:mb-8 text-center">
          <h2 className="text-brutal-huge mb-4">SUBMIT EVIDENCE</h2>
          <div className="w-12 md:w-16 h-1 bg-accent mx-auto mb-4"></div>
          <p className="font-mono text-sm md:text-base text-muted-foreground px-2">
            Upload video evidence of scammer activity
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* File Upload Area - Mobile Optimized */}
          <div className="space-y-2">
            <Label className="font-mono font-bold text-sm">VIDEO FILE*</Label>
            <div
              className={`
                border-2 border-dashed p-6 md:p-8 text-center transition-colors touch-manipulation
                ${isUploading 
                  ? 'border-muted bg-muted/20 cursor-not-allowed' 
                  : isDragging 
                    ? 'border-accent bg-accent/5 cursor-pointer' 
                    : 'border-foreground hover:border-accent hover:bg-accent/5 cursor-pointer'
                }
              `}
              onDragOver={isUploading ? undefined : handleDragOver}
              onDragLeave={isUploading ? undefined : handleDragLeave}
              onDrop={isUploading ? undefined : handleDrop}
              onClick={isUploading ? undefined : () => fileInputRef.current?.click()}
            >
              <div className="space-y-3 md:space-y-4">
                {selectedFile ? (
                  <>
                    <div className="text-4xl md:text-6xl">📹</div>
                    <div>
                      <p className="font-mono font-bold text-sm md:text-base break-all">
                        {selectedFile.name}
                      </p>
                      <p className="font-mono text-xs md:text-sm text-muted-foreground">
                        {formatFileSize(selectedFile.size)}
                      </p>
                    </div>
                    {isUploading ? (
                      <div className="space-y-2">
                        <p className="font-mono text-sm text-accent">
                          🚀 UPLOADING... {uploadProgress}%
                        </p>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div 
                            className="bg-accent h-2 rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          ></div>
                        </div>
                      </div>
                    ) : (
                      <p className="font-mono text-sm text-accent">
                        ✓ FILE READY FOR UPLOAD
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <div className="text-4xl md:text-6xl">⬆️</div>
                    <div>
                      <p className="font-mono font-bold mb-2 text-sm md:text-base">
                        TAP TO SELECT VIDEO
                      </p>
                      <p className="font-mono text-sm text-muted-foreground mb-4">
                        or drag & drop
                      </p>
                      <div className="space-y-1 text-xs font-mono text-muted-foreground">
                        <p>Supported: MP4, AVI, MOV, WMV, WebM, MKV</p>
                        <p>Max size: 100MB</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileInputChange}
              className="hidden"
            />
          </div>

          {/* Scammer Info - Mobile Optimized */}
          <div className="space-y-2">
            <Label htmlFor="scammerInfo" className="font-mono font-bold text-sm">
              SCAMMER INFORMATION*
            </Label>
            <Input
              id="scammerInfo"
              value={scammerInfo}
              onChange={(e) => setScammerInfo(e.target.value)}
              placeholder="Phone, email, website, etc..."
              className="font-mono text-sm border-2 border-foreground focus:border-accent"
              required
            />
            <p className="text-xs font-mono text-muted-foreground">
              Any info that can help identify the scammer
            </p>
          </div>

          {/* Submit Button - Mobile Optimized */}
          <div className="pt-4">
            <Button
              type="submit"
              className="w-full btn-brutal text-base md:text-lg py-4 font-mono font-bold touch-manipulation"
              disabled={!selectedFile || !scammerInfo.trim() || isUploading}
            >
              {isUploading
                ? `UPLOADING... ${uploadProgress}%`
                : selectedFile && scammerInfo.trim() 
                  ? "SUBMIT EVIDENCE" 
                  : "COMPLETE REQUIRED FIELDS"
              }
            </Button>
          </div>

          {/* Disclaimer - Mobile Optimized */}
          <div className="text-xs font-mono text-muted-foreground text-center pt-4 border-t border-muted px-2">
            <p>
              By submitting, you confirm this evidence is authentic and consent to its use 
              in anti-scam efforts. Personal information will be protected.
            </p>
          </div>
        </form>
      </Card>
    </section>
  );
};

export default VideoUpload;