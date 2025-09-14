import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Eye, Clock, Zap } from 'lucide-react';

interface ScammerData {
  id: string;
  scammerInfo: string;
  aiLikelihood: number;
  analysis: string;
  reasoning: string;
  sessionId: string;
  detectedAt: string;
  source: string;
  createdAt: string;
  transcription?: string;
}

const PotentialScammers = () => {
  const [scammers, setScammers] = useState<ScammerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchScammers = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const API_BASE = (import.meta as any).env?.VITE_API_BASE || "http://localhost:3001";
      const response = await fetch(`${API_BASE}/api/scammers`);
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch scammers');
      }
      
      if (result.success) {
        setScammers(result.data || []);
      } else {
        throw new Error(result.error || 'Failed to fetch scammers');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error fetching scammers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScammers();
  }, []);

  const getThreatLevel = (likelihood: number) => {
    if (likelihood >= 0.8) return { level: 'CRITICAL', color: 'destructive', bgColor: 'bg-red-950' };
    if (likelihood >= 0.6) return { level: 'HIGH', color: 'destructive', bgColor: 'bg-red-900' };
    if (likelihood >= 0.5) return { level: 'MEDIUM', color: 'warning', bgColor: 'bg-yellow-900' };
    return { level: 'LOW', color: 'default', bgColor: 'bg-green-900' };
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="font-mono font-bold">LOADING POTENTIAL SCAMMERS...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-black font-mono tracking-tight mb-2">
                  🚨 POTENTIAL SCAMMERS
                </h1>
                <p className="text-lg font-mono text-muted-foreground">
                  AI-detected suspicious content with high likelihood scores
                </p>
              </div>
              
              <Button
                onClick={fetchScammers}
                className="font-mono font-bold border-2 border-black"
                variant="outline"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                REFRESH
              </Button>
            </div>
            
            <div className="border-4 border-black bg-yellow-400 p-4 shadow-brutal">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                  <span className="font-mono font-black text-sm">
                    SHOWING {scammers.length} FLAGGED ENTRIES WITH AI LIKELIHOOD &gt; 50%
                  </span>
              </div>
            </div>
          </div>

          {/* Error State */}
          {error && (
            <Card className="border-4 border-red-500 shadow-brutal mb-6">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="font-mono font-bold">ERROR: {error}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Scammers List */}
          {scammers.length === 0 ? (
            <Card className="border-4 border-black shadow-brutal">
              <CardContent className="p-8 text-center">
                <Eye className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="font-mono font-black text-xl mb-2">NO SCAMMERS DETECTED</h3>
                <p className="font-mono text-muted-foreground">
                  No entries found with AI likelihood &gt; 50%. Upload videos to start detecting potential scams.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {scammers.map((scammer) => {
                const threat = getThreatLevel(scammer.aiLikelihood);
                const likelihood = Math.round(scammer.aiLikelihood * 100);
                
                return (
                  <Card key={scammer.id} className="border-4 border-black shadow-brutal">
                    <CardHeader className="bg-black text-white">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <CardTitle className="font-mono font-black text-lg">
                          🎯 SCAMMER DETECTED
                        </CardTitle>
                        <div className="flex gap-2">
                          <Badge
                            variant={threat.color as any}
                            className="font-black px-3 py-1 border-2 border-white"
                          >
                            {likelihood}% | {threat.level}
                          </Badge>
                          <Badge variant="outline" className="font-bold border-white text-white">
                            {scammer.source.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* Scammer Info */}
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-mono font-black text-sm mb-2 flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4" />
                              SCAMMER INFORMATION
                            </h4>
                            <div className="bg-red-50 border-2 border-red-500 p-3 shadow-brutal">
                              <p className="font-mono font-bold text-red-800 break-all">
                                {scammer.scammerInfo}
                              </p>
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="font-mono font-black text-sm mb-2 flex items-center gap-2">
                              <Eye className="h-4 w-4" />
                              CONTENT ANALYSIS
                            </h4>
                            <div className="bg-yellow-50 border-2 border-yellow-500 p-3 shadow-brutal">
                              <p className="font-mono text-sm">
                                {scammer.analysis}
                              </p>
                            </div>
                          </div>

                          {scammer.transcription && (
                            <div>
                              <h4 className="font-mono font-black text-sm mb-2 flex items-center gap-2">
                                🎤 AUDIO TRANSCRIPTION
                              </h4>
                              <div className="bg-purple-50 border-2 border-purple-500 p-3 shadow-brutal">
                                <p className="font-mono text-sm italic">
                                  "{scammer.transcription}"
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {/* Technical Details */}
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-mono font-black text-sm mb-2 flex items-center gap-2">
                              <Zap className="h-4 w-4" />
                              AI REASONING
                            </h4>
                            <div className="bg-blue-50 border-2 border-blue-500 p-3 shadow-brutal">
                              <p className="font-mono text-sm">
                                {scammer.reasoning}
                              </p>
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="font-mono font-black text-sm mb-2 flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              DETECTION METADATA
                            </h4>
                            <div className="bg-gray-50 border-2 border-gray-500 p-3 shadow-brutal space-y-1">
                              <p className="font-mono text-xs">
                                <span className="font-bold">Session:</span> {scammer.sessionId}
                              </p>
                              <p className="font-mono text-xs">
                                <span className="font-bold">Detected:</span> {formatDate(scammer.detectedAt)}
                              </p>
                              <p className="font-mono text-xs">
                                <span className="font-bold">Stored:</span> {formatDate(scammer.createdAt)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PotentialScammers;
