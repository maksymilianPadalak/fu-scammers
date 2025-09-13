import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, Eye, Shield, Zap } from 'lucide-react';

export interface AIDetectionSummary {
  aiGeneratedLikelihood: number;
  artifactsDetected: string[];
  rationale: string[];
  whatIsIt: string[];
  howToBehave: string[];
}

interface AIDetectionResultsProps {
  data: AIDetectionSummary;
  className?: string;
}

export const AIDetectionResults: React.FC<AIDetectionResultsProps> = ({
  data,
  className = '',
}) => {
  const likelihood = Math.round(data.aiGeneratedLikelihood * 100);

  // Determine threat level and styling
  const getThreatLevel = (likelihood: number) => {
    if (likelihood >= 80)
      return { level: 'HIGH', color: 'destructive', bgColor: 'bg-red-950' };
    if (likelihood >= 50)
      return { level: 'MEDIUM', color: 'warning', bgColor: 'bg-yellow-950' };
    return { level: 'LOW', color: 'default', bgColor: 'bg-green-950' };
  };

  const threat = getThreatLevel(likelihood);

  return (
    <div className={`space-y-6 font-mono ${className}`}>
      {/* MAIN THREAT ASSESSMENT */}
      <Card className="border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-white">
        <CardHeader className="bg-black text-white">
          <CardTitle className="text-xl md:text-2xl font-black tracking-wider flex items-center gap-3">
            <Zap className="h-5 w-5 md:h-6 md:w-6" />
            AI DETECTION SYSTEM
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          <div className="space-y-4">
            {/* LIKELIHOOD METER */}
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                <span className="text-xs md:text-sm font-black uppercase tracking-wide">
                  AI GENERATION PROBABILITY
                </span>
                <Badge
                  variant={
                    threat.color as
                      | 'default'
                      | 'destructive'
                      | 'outline'
                      | 'secondary'
                  }
                  className="font-black text-sm md:text-lg px-3 py-1 md:px-4 md:py-2 border-2 border-black self-start sm:self-auto"
                >
                  {likelihood}% | {threat.level}
                </Badge>
              </div>
              <Progress
                value={likelihood}
                className="h-4 md:h-6 border-2 border-black"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* WHAT IS IT SECTION */}
      <Card className="border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] bg-yellow-50">
        <CardHeader className="bg-yellow-400 border-b-4 border-black">
          <CardTitle className="text-lg md:text-xl font-black flex items-center gap-2">
            <Eye className="h-4 w-4 md:h-5 md:w-5" />
            CONTENT ANALYSIS
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 md:p-4">
          <div className="space-y-2">
            {data.whatIsIt.map((item, index) => (
              <div
                key={index}
                className="bg-white border-2 border-black p-2 md:p-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
              >
                <p className="font-bold text-xs md:text-sm">{item}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ARTIFACTS DETECTED */}
      {data.artifactsDetected.length > 0 && (
        <Card className="border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] bg-red-50">
          <CardHeader className="bg-red-500 border-b-4 border-black">
            <CardTitle className="text-lg md:text-xl font-black text-white flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 md:h-5 md:w-5" />
              SUSPICIOUS ARTIFACTS [{data.artifactsDetected.length}]
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 md:p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {data.artifactsDetected.map((artifact, index) => (
                <Badge
                  key={index}
                  variant="destructive"
                  className="font-bold text-xs p-2 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                >
                  {artifact.toUpperCase()}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* SECURITY RECOMMENDATIONS */}
      <Card className="border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] bg-blue-50">
        <CardHeader className="bg-blue-600 border-b-4 border-black">
          <CardTitle className="text-lg md:text-xl font-black text-white flex items-center gap-2">
            <Shield className="h-4 w-4 md:h-5 md:w-5" />
            SECURITY PROTOCOL
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 md:p-4">
          <div className="space-y-3">
            {data.howToBehave.map((recommendation, index) => (
              <Alert
                key={index}
                className="border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
              >
                <AlertTriangle className="h-3 w-3 md:h-4 md:w-4" />
                <AlertTitle className="font-black text-xs md:text-sm">
                  RECOMMENDED ACTION #{index + 1}
                </AlertTitle>
                <AlertDescription className="font-bold text-xs mt-1">
                  {recommendation}
                </AlertDescription>
              </Alert>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* TECHNICAL RATIONALE */}
      <Card className="border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] bg-gray-100">
        <CardHeader className="bg-gray-800 border-b-4 border-black">
          <CardTitle className="text-lg md:text-xl font-black text-white">
            TECHNICAL ANALYSIS
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 md:p-4">
          <div className="space-y-2">
            {data.rationale.map((reason, index) => (
              <div
                key={index}
                className="bg-white border-l-4 border-black p-2 md:p-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              >
                <p className="text-xs md:text-sm font-bold">
                  <span className="bg-black text-white px-1 md:px-2 py-1 mr-2 text-xs">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  {reason}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* FOOTER STAMP */}
      <div className="text-center p-3 md:p-4 border-4 border-black bg-black text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <p className="font-black text-xs md:text-sm tracking-widest">
          BERLIN BRUTALISM DETECTION SYSTEM v2.0
        </p>
        <p className="text-xs font-bold opacity-80">
          ANALYSIS COMPLETED • {new Date().toISOString().split('T')[0]}
        </p>
      </div>
    </div>
  );
};

export default AIDetectionResults;
