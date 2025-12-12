'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import confetti from 'canvas-confetti';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  Combine, 
  Sparkles, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  ArrowRight,
  Zap,
  Heart
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Session {
  id: string;
  created_at: string;
  row_count: number;
  field_count: number;
  fields: string[];
}

interface SlateMergeProps {
  sessions: Session[];
  trigger?: React.ReactNode;
  onMergeComplete?: () => void;
}

interface MergeAnalysis {
  mergeStrategy: string;
  mergeKeys: Array<{
    slate1Field: string;
    slate2Field: string;
    confidence: number;
    reason: string;
  }>;
  fieldMappings: Array<{
    slate1Field: string;
    slate2Field: string;
    confidence: number;
    reason: string;
  }>;
  uniqueFields: {
    slate1Only: string[];
    slate2Only: string[];
  };
  recommendedName: string;
  warnings: string[];
}

export function SlateMerge({ sessions, trigger, onMergeComplete }: SlateMergeProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'select' | 'analyze' | 'review' | 'executing' | 'success'>('select');
  
  // Selection state
  const [slate1Id, setSlate1Id] = useState<string>('');
  const [slate2Id, setSlate2Id] = useState<string>('');
  
  // Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<MergeAnalysis | null>(null);
  
  // Execution state
  const [isExecuting, setIsExecuting] = useState(false);
  const [mergedSessionId, setMergedSessionId] = useState<string | null>(null);
  const [mergeName, setMergeName] = useState('');

  const slate1 = sessions.find(s => s.id === slate1Id);
  const slate2 = sessions.find(s => s.id === slate2Id);

  const fireConfetti = () => {
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);

      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        colors: ['#f97316', '#fb923c', '#fdba74']
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        colors: ['#f97316', '#fb923c', '#fdba74']
      });
    }, 250);
  };

  const handleAnalyze = async () => {
    if (!slate1 || !slate2) return;

    setIsAnalyzing(true);
    try {
      // Fetch sample data from both slates
      const [data1Response, data2Response] = await Promise.all([
        fetch(`/api/sessions/${slate1Id}`),
        fetch(`/api/sessions/${slate2Id}`)
      ]);

      const data1 = await data1Response.json();
      const data2 = await data2Response.json();

      // Get first few rows as sample
      const slate1Sample = data1.data.slice(0, 3);
      const slate2Sample = data2.data.slice(0, 3);

      // Call AI analysis endpoint
      const analysisResponse = await fetch('/api/slates/analyze-merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slate1Fields: slate1.fields,
          slate2Fields: slate2.fields,
          slate1Sample,
          slate2Sample
        })
      });

      if (!analysisResponse.ok) {
        throw new Error('Failed to analyze merge');
      }

      const result = await analysisResponse.json();
      setAnalysis(result.analysis);
      setMergeName(result.analysis.recommendedName);
      setStep('review');
      
      // Subtle confetti for analysis complete
      confetti({
        particleCount: 30,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#f97316']
      });
    } catch (error) {
      console.error('Error analyzing merge:', error);
      alert('Failed to analyze merge. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExecute = async () => {
    if (!analysis) return;

    setIsExecuting(true);
    setStep('executing');
    
    try {
      const response = await fetch('/api/slates/execute-merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slate1Id,
          slate2Id,
          mergeStrategy: analysis.mergeStrategy,
          mergeKeys: analysis.mergeKeys,
          fieldMappings: analysis.fieldMappings,
          newSlateName: mergeName
        })
      });

      if (!response.ok) {
        throw new Error('Failed to execute merge');
      }

      const result = await response.json();
      setMergedSessionId(result.sessionId);
      setStep('success');
      
      // BIG JOYFUL CONFETTI! 🎉
      fireConfetti();
      
      if (onMergeComplete) {
        onMergeComplete();
      }
    } catch (error) {
      console.error('Error executing merge:', error);
      alert('Failed to execute merge. Please try again.');
      setStep('review');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleViewMerged = () => {
    if (mergedSessionId) {
      router.push(`/workbench?session=${mergedSessionId}`);
      setOpen(false);
      resetState();
    }
  };

  const resetState = () => {
    setStep('select');
    setSlate1Id('');
    setSlate2Id('');
    setAnalysis(null);
    setMergedSessionId(null);
    setMergeName('');
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetState();
    }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <Combine className="h-4 w-4" />
            Merge Slates
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        {step === 'select' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Combine className="h-5 w-5 text-orange-500" />
                Merge Two Slates
              </DialogTitle>
              <DialogDescription>
                Select two slates to merge. Our AI will analyze the fields and suggest the best way to combine them!
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {/* Slate 1 Selection */}
              <div className="space-y-2">
                <Label>First Slate</Label>
                <Select value={slate1Id} onValueChange={setSlate1Id}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select first slate" />
                  </SelectTrigger>
                  <SelectContent>
                    {sessions.map((session) => (
                      <SelectItem key={session.id} value={session.id} disabled={session.id === slate2Id}>
                        <div className="flex items-center gap-2">
                          <span>{session.id}</span>
                          <Badge variant="secondary" className="text-xs">
                            {session.row_count} rows × {session.field_count} fields
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {slate1 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {slate1.fields.map((field) => (
                      <Badge key={field} variant="outline" className="text-xs">
                        {field}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Visual Merge Indicator */}
              {slate1Id && slate2Id && (
                <div className="flex items-center justify-center py-2">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-orange-100 dark:bg-orange-950/30 flex items-center justify-center">
                      <Zap className="h-6 w-6 text-orange-500" />
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                    <div className="h-12 w-12 rounded-full bg-orange-500 flex items-center justify-center">
                      <Heart className="h-6 w-6 text-white animate-pulse" />
                    </div>
                  </div>
                </div>
              )}

              {/* Slate 2 Selection */}
              <div className="space-y-2">
                <Label>Second Slate</Label>
                <Select value={slate2Id} onValueChange={setSlate2Id}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select second slate" />
                  </SelectTrigger>
                  <SelectContent>
                    {sessions.map((session) => (
                      <SelectItem key={session.id} value={session.id} disabled={session.id === slate1Id}>
                        <div className="flex items-center gap-2">
                          <span>{session.id}</span>
                          <Badge variant="secondary" className="text-xs">
                            {session.row_count} rows × {session.field_count} fields
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {slate2 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {slate2.fields.map((field) => (
                      <Badge key={field} variant="outline" className="text-xs">
                        {field}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => setStep('analyze')}
                disabled={!slate1Id || !slate2Id}
                className="bg-orange-500 hover:bg-orange-600 gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Analyze with AI
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'analyze' && (
          <>
            <DialogHeader>
              <DialogTitle>Analyzing Merge...</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-12 w-12 animate-spin text-orange-500 mb-4" />
              <p className="text-sm text-muted-foreground">AI is analyzing your data...</p>
            </div>
          </>
        )}

        {step === 'review' && analysis && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Merge Analysis Complete!
              </DialogTitle>
              <DialogDescription>
                Review the AI-suggested merge plan below. You can adjust the name before executing.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {/* Merge Name */}
              <div className="space-y-2">
                <Label htmlFor="merge-name">Merged Slate Name</Label>
                <Input
                  id="merge-name"
                  value={mergeName}
                  onChange={(e) => setMergeName(e.target.value)}
                />
              </div>

              {/* Merge Strategy */}
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-orange-500" />
                  <h4 className="font-semibold">Merge Strategy</h4>
                </div>
                <Badge variant="secondary" className="text-sm">
                  {analysis.mergeStrategy.replace('_', ' ')}
                </Badge>
              </Card>

              {/* Merge Keys */}
              {analysis.mergeKeys.length > 0 && (
                <Card className="p-4">
                  <h4 className="font-semibold mb-3">Merge Keys</h4>
                  <div className="space-y-2">
                    {analysis.mergeKeys.map((key, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-muted rounded">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{key.slate1Field}</Badge>
                          <ArrowRight className="h-3 w-3" />
                          <Badge variant="outline">{key.slate2Field}</Badge>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {Math.round(key.confidence * 100)}% confident
                        </Badge>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Field Mappings */}
              {analysis.fieldMappings.length > 0 && (
                <Card className="p-4">
                  <h4 className="font-semibold mb-3">Field Mappings</h4>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {analysis.fieldMappings.map((mapping, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-muted rounded text-sm">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{mapping.slate1Field}</Badge>
                          <ArrowRight className="h-3 w-3" />
                          <Badge variant="outline" className="text-xs">{mapping.slate2Field}</Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {Math.round(mapping.confidence * 100)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Unique Fields */}
              {(analysis.uniqueFields.slate1Only.length > 0 || analysis.uniqueFields.slate2Only.length > 0) && (
                <Card className="p-4">
                  <h4 className="font-semibold mb-3">Unique Fields</h4>
                  <div className="space-y-3">
                    {analysis.uniqueFields.slate1Only.length > 0 && (
                      <div>
                        <Label className="text-xs text-muted-foreground">From Slate 1</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {analysis.uniqueFields.slate1Only.map((field) => (
                            <Badge key={field} variant="secondary" className="text-xs">
                              {field}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {analysis.uniqueFields.slate2Only.length > 0 && (
                      <div>
                        <Label className="text-xs text-muted-foreground">From Slate 2</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {analysis.uniqueFields.slate2Only.map((field) => (
                            <Badge key={field} variant="secondary" className="text-xs">
                              {field}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {/* Warnings */}
              {analysis.warnings.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <ul className="list-disc list-inside space-y-1">
                      {analysis.warnings.map((warning, idx) => (
                        <li key={idx} className="text-sm">{warning}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('select')}>
                Back
              </Button>
              <Button 
                onClick={handleExecute}
                disabled={!mergeName.trim()}
                className="bg-green-600 hover:bg-green-700 gap-2"
              >
                <Zap className="h-4 w-4" />
                Execute Merge
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'executing' && (
          <>
            <DialogHeader>
              <DialogTitle>Executing Merge...</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-12 w-12 animate-spin text-orange-500 mb-4" />
              <p className="text-sm text-muted-foreground">Merging your slates...</p>
            </div>
          </>
        )}

        {step === 'success' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-pink-500" />
                Merge Complete! 🎉
              </DialogTitle>
              <DialogDescription>
                Your slates have been successfully merged into a beautiful new dataset!
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex flex-col items-center justify-center py-8">
              <div className="h-24 w-24 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center mb-4 animate-bounce">
                <Sparkles className="h-12 w-12 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2">Success!</h3>
              <p className="text-muted-foreground text-center mb-6">
                {mergeName} is ready to use
              </p>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setOpen(false);
                resetState();
              }}>
                Close
              </Button>
              <Button 
                onClick={handleViewMerged}
                className="bg-orange-500 hover:bg-orange-600 gap-2"
              >
                <ArrowRight className="h-4 w-4" />
                View Merged Slate
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}