import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface FrameEvent {
  type: "frame";
  index: number;
  total?: number;
  image: string; // data url
}
interface StatusEvent { type: "status"; message: string }
interface AnalysisStatusEvent {
  type: "analysis_status";
  status: "starting" | "processing" | "completed" | "error";
  message?: string;
}
interface DoneEvent { type: "done" }
interface ErrorEvent { type: "error"; message: string }

type WSEvent = FrameEvent | StatusEvent | AnalysisStatusEvent | DoneEvent | ErrorEvent;

export interface LiveFramesProps {
  isUploading: boolean; // Start streaming when upload begins
  className?: string;
}

/**
 * Connects to a dedicated WS server and renders incoming frames as loading animation.
 * Default: ws://localhost:3456/ws (configurable via VITE_WS_URL)
 */
export default function LiveFrames({ isUploading, className }: LiveFramesProps) {
  const [frames, setFrames] = useState<string[]>([]);
  const [status, setStatus] = useState<string>("idle");
  const [analysisStatus, setAnalysisStatus] = useState<string>("waiting");
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!isUploading) {
      // Clear frames when not uploading
      setFrames([]);
      setStatus("idle");
      setAnalysisStatus("waiting");
      return;
    }

    const WS_URL = (import.meta as any).env?.VITE_WS_URL || `ws://localhost:3789/ws`;
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("connected");
      setAnalysisStatus("connecting");
    };

    ws.onmessage = (ev) => {
      try {
        const data: WSEvent = JSON.parse(ev.data);
        if (data.type === "status") setStatus(data.message);
        if (data.type === "analysis_status") {
          setAnalysisStatus(data.message || data.status);
        }
        if (data.type === "frame") {
          setFrames((prev) => {
            const next = [...prev];
            next[data.index] = data.image;
            return next;
          });
        }
        if (data.type === "done") {
          setStatus("Frame streaming complete");
        }
        if (data.type === "error") setStatus(`error: ${data.message}`);
      } catch {}
    };

    ws.onerror = () => setStatus("connection error");
    ws.onclose = () => {
      setStatus("disconnected");
    };

    return () => {
      ws.close();
    };
  }, [isUploading]);

  if (!isUploading) return null;

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <Badge className="font-black border-2 border-black shadow-[3px_3px_0_0_#000] bg-yellow-400 text-black">
          🎬 ANALYZING VIDEO
        </Badge>
        <div className="text-right">
          <div className="font-mono text-xs text-muted-foreground">{status}</div>
          <div className="font-mono text-xs font-bold">{analysisStatus}</div>
        </div>
      </div>

      {frames.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {frames.map((src, i) => (
            <Card
              key={i}
              className="overflow-hidden border-4 border-black shadow-[6px_6px_0_0_#000] bg-white animate-in slide-in-from-bottom-4 duration-500"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="relative aspect-video bg-slate-100">
                {src ? (
                  <img 
                    src={src} 
                    alt={`frame-${i}`} 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-mono text-xs animate-pulse">
                    loading…
                  </div>
                )}
                <div className="absolute top-1 left-1 bg-black text-white text-[10px] px-1 font-black">
                  F{i + 1}
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
          <span className="ml-3 font-mono text-sm">Preparing video frames...</span>
        </div>
      )}
    </div>
  );
}
