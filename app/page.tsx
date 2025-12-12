"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, ExternalLink, Loader2, Table2 } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { CSVUploader } from "./fire-enrich/csv-uploader";
import { UnifiedEnrichmentView } from "./fire-enrich/unified-enrichment-view";
import { EnrichmentTable } from "./fire-enrich/enrichment-table";
import { CSVRow, EnrichmentField } from "@/lib/types";
import { FIRE_ENRICH_CONFIG } from "./fire-enrich/config";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function HomePage() {
  const [step, setStep] = useState<'upload' | 'setup' | 'enrichment'>('upload');
  const [csvData, setCsvData] = useState<{
    rows: CSVRow[];
    columns: string[];
  } | null>(null);
  const [emailColumn, setEmailColumn] = useState<string>('');
  const [selectedFields, setSelectedFields] = useState<EnrichmentField[]>([]);
  const [isCheckingEnv, setIsCheckingEnv] = useState(true);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [firecrawlApiKey, setFirecrawlApiKey] = useState<string>('');
  const [openaiApiKey, setOpenaiApiKey] = useState<string>('');
  const [isValidatingApiKey, setIsValidatingApiKey] = useState(false);
  const [missingKeys, setMissingKeys] = useState<{
    firecrawl: boolean;
    openai: boolean;
  }>({ firecrawl: false, openai: false });
  const [pendingCSVData, setPendingCSVData] = useState<{
    rows: CSVRow[];
    columns: string[];
  } | null>(null);

  // Check environment status on component mount
  useEffect(() => {
    const checkEnvironment = async () => {
      try {
        const response = await fetch('/api/check-env');
        if (!response.ok) {
          throw new Error('Failed to check environment');
        }
        const data = await response.json();
        const hasFirecrawl = data.environmentStatus.FIRECRAWL_API_KEY;
        const hasOpenAI = data.environmentStatus.OPENAI_API_KEY;
        
        if (!hasFirecrawl) {
          // Check localStorage for saved API key
          const savedKey = localStorage.getItem('firecrawl_api_key');
          if (savedKey) {
            setFirecrawlApiKey(savedKey);
          }
        }
        
        if (!hasOpenAI) {
          // Check localStorage for saved API key
          const savedKey = localStorage.getItem('openai_api_key');
          if (savedKey) {
            setOpenaiApiKey(savedKey);
          }
        }
      } catch (error) {
        console.error('Error checking environment:', error);
      } finally {
        setIsCheckingEnv(false);
      }
    };

    checkEnvironment();
  }, []);

  const handleCSVUpload = async (rows: CSVRow[], columns: string[]) => {
    // Check if we have Firecrawl API key
    const response = await fetch('/api/check-env');
    const data = await response.json();
    const hasFirecrawl = data.environmentStatus.FIRECRAWL_API_KEY;
    const hasOpenAI = data.environmentStatus.OPENAI_API_KEY;
    const savedFirecrawlKey = localStorage.getItem('firecrawl_api_key');
    const savedOpenAIKey = localStorage.getItem('openai_api_key');

    if ((!hasFirecrawl && !savedFirecrawlKey) || (!hasOpenAI && !savedOpenAIKey)) {
      // Save the CSV data temporarily and show API key modal
      setPendingCSVData({ rows, columns });
      setMissingKeys({
        firecrawl: !hasFirecrawl && !savedFirecrawlKey,
        openai: !hasOpenAI && !savedOpenAIKey,
      });
      setShowApiKeyModal(true);
    } else {
      setCsvData({ rows, columns });
      setStep('setup');
    }
  };

  const handleStartEnrichment = (email: string, fields: EnrichmentField[]) => {
    setEmailColumn(email);
    setSelectedFields(fields);
    setStep('enrichment');
  };

  const handleBack = () => {
    if (step === 'setup') {
      setStep('upload');
    } else if (step === 'enrichment') {
      setStep('setup');
    }
  };

  const resetProcess = () => {
    setStep('upload');
    setCsvData(null);
    setEmailColumn('');
    setSelectedFields([]);
  };

  const openFirecrawlWebsite = () => {
    window.open('https://www.firecrawl.dev', '_blank');
  };

  const handleApiKeySubmit = async () => {
    // Check environment again to see what's missing
    const response = await fetch('/api/check-env');
    const data = await response.json();
    const hasEnvFirecrawl = data.environmentStatus.FIRECRAWL_API_KEY;
    const hasEnvOpenAI = data.environmentStatus.OPENAI_API_KEY;
    const hasSavedFirecrawl = localStorage.getItem('firecrawl_api_key');
    const hasSavedOpenAI = localStorage.getItem('openai_api_key');
    
    const needsFirecrawl = !hasEnvFirecrawl && !hasSavedFirecrawl;
    const needsOpenAI = !hasEnvOpenAI && !hasSavedOpenAI;

    if (needsFirecrawl && !firecrawlApiKey.trim()) {
      toast.error('Please enter a valid Firecrawl API key');
      return;
    }
    
    if (needsOpenAI && !openaiApiKey.trim()) {
      toast.error('Please enter a valid OpenAI API key');
      return;
    }

    setIsValidatingApiKey(true);

    try {
      // Test the Firecrawl API key if provided
      if (firecrawlApiKey) {
        const response = await fetch('/api/scrape', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Firecrawl-API-Key': firecrawlApiKey,
          },
          body: JSON.stringify({ url: 'https://example.com' }),
        });

        if (!response.ok) {
          throw new Error('Invalid Firecrawl API key');
        }
        
        // Save the API key to localStorage
        localStorage.setItem('firecrawl_api_key', firecrawlApiKey);
      }
      
      // Save OpenAI API key if provided
      if (openaiApiKey) {
        localStorage.setItem('openai_api_key', openaiApiKey);
      }

      toast.success('API keys saved successfully!');
      setShowApiKeyModal(false);

      // Process the pending CSV data
      if (pendingCSVData) {
        setCsvData(pendingCSVData);
        setStep('setup');
        setPendingCSVData(null);
      }
    } catch (error) {
      toast.error('Invalid API key. Please check and try again.');
      console.error('API key validation error:', error);
    } finally {
      setIsValidatingApiKey(false);
    }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-4 max-w-7xl mx-auto font-inter">
      <div className="flex justify-between items-center">
        <Link href="/" className="logo-reveal">
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold bg-gradient-to-r from-[#36322F] to-orange-500 bg-clip-text text-transparent dark:from-white dark:to-orange-400">
              slate
            </div>
            <div className="text-xs text-orange-600 dark:text-orange-400 font-semibold tracking-wider">
              agentMatriX
            </div>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <Link href="/workbench">
              <Table2 className="h-4 w-4" />
              Workbench
            </Link>
          </Button>
          <ThemeToggle />
        </div>
      </div>

      <div className="text-center pt-8 pb-6">
        <h1 className="text-[2.5rem] lg:text-[4.5rem] text-[#36322F] dark:text-white font-bold tracking-tight leading-[0.9] opacity-0 animate-fade-up [animation-duration:500ms] [animation-delay:200ms] [animation-fill-mode:forwards]">
          <span className="relative px-1 text-transparent bg-clip-text bg-gradient-to-r from-[#36322F] to-orange-500 dark:from-white dark:to-orange-400 inline-flex justify-center items-center">
            slate
          </span>
        </h1>
        <p className="text-xl lg:text-2xl text-orange-600 dark:text-orange-400 font-semibold tracking-wide mt-2 mb-4 opacity-0 animate-fade-up [animation-duration:500ms] [animation-delay:400ms] [animation-fill-mode:forwards]">
          agentMatriX
        </p>
        <p className="text-base text-muted-foreground mt-3 opacity-0 animate-fade-up [animation-duration:500ms] [animation-delay:600ms] [animation-fill-mode:forwards] max-w-2xl mx-auto">
          Build, merge, and enrich datasets with 7 specialized AI agents working in perfect coordination
        </p>
        
        {/* Quick Start Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto mt-8 opacity-0 animate-fade-up [animation-duration:500ms] [animation-delay:800ms] [animation-fill-mode:forwards]">
          <Link href="/fire-enrich">
            <Card className="p-6 hover:shadow-lg transition-all cursor-pointer hover:scale-105 border-2 hover:border-orange-500">
              <div className="text-3xl mb-3">📤</div>
              <h3 className="font-semibold mb-2">Upload & Enrich</h3>
              <p className="text-sm text-muted-foreground">Start with your CSV and let agentMatriX enrich it</p>
            </Card>
          </Link>
          <Link href="/workbench">
            <Card className="p-6 hover:shadow-lg transition-all cursor-pointer hover:scale-105 border-2 hover:border-orange-500">
              <div className="text-3xl mb-3">✨</div>
              <h3 className="font-semibold mb-2">Create Slate</h3>
              <p className="text-sm text-muted-foreground">Build a new dataset from scratch with custom fields</p>
            </Card>
          </Link>
          <Link href="/workbench">
            <Card className="p-6 hover:shadow-lg transition-all cursor-pointer hover:scale-105 border-2 hover:border-orange-500">
              <div className="text-3xl mb-3">💝</div>
              <h3 className="font-semibold mb-2">Merge Slates</h3>
              <p className="text-sm text-muted-foreground">AI-powered merging with intelligent field mapping</p>
            </Card>
          </Link>
        </div>
      </div>

      {/* Main Content */}
      {isCheckingEnv ? (
        <div className="text-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Initializing...</p>
        </div>
      ) : (
        <div className="bg-white/70 dark:bg-zinc-900/40 backdrop-blur-lg p-6 sm:p-8 rounded-2xl shadow-lg">
        {step === 'setup' && (
          <Button
            variant="code"
            size="sm"
            onClick={handleBack}
            className="mb-4 flex items-center gap-1.5"
          >
            <ArrowLeft size={16} />
            Back
          </Button>
        )}

        {step === 'upload' && (
          <CSVUploader onUpload={handleCSVUpload} />
        )}

        {step === 'setup' && csvData && (
          <UnifiedEnrichmentView
            rows={csvData.rows}
            columns={csvData.columns}
            onStartEnrichment={handleStartEnrichment}
          />
        )}

        {step === 'enrichment' && csvData && (
          <>
            <div className="mb-4">
              <h2 className="text-xl font-semibold mb-1">Enrichment Results</h2>
              <p className="text-sm text-muted-foreground">
                Click on any row to view detailed information
              </p>
            </div>
            <EnrichmentTable
              rows={csvData.rows}
              fields={selectedFields}
              emailColumn={emailColumn}
            />
            <div className="mt-6 text-center">
              <Button
                variant="orange"
                onClick={resetProcess}
              >
                Start New Enrichment
              </Button>
            </div>
          </>
        )}
        </div>
      )}

      <footer className="py-8 text-center text-sm text-muted-foreground dark:text-muted-foreground">
        <p className="opacity-75">Made with ❤️ by the slate team</p>
      </footer>

      {/* API Key Modal */}
      <Dialog open={showApiKeyModal} onOpenChange={setShowApiKeyModal}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-zinc-900">
          <DialogHeader>
            <DialogTitle>API Keys Required</DialogTitle>
            <DialogDescription>
              This tool requires API keys for our crawler service and OpenAI to enrich your CSV data.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            {missingKeys.firecrawl && (
              <>
                <Button
                  onClick={openFirecrawlWebsite}
                  variant="outline"
                  size="sm"
                  className="flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ExternalLink className="h-4 w-4" />
                  Get Crawler API Key
                </Button>
                <div className="flex flex-col gap-2">
                  <label htmlFor="firecrawl-key" className="text-sm font-medium">
                    Crawler API Key
                  </label>
                  <Input
                    id="firecrawl-key"
                    type="password"
                    placeholder="fc-..."
                    value={firecrawlApiKey}
                    onChange={(e) => setFirecrawlApiKey(e.target.value)}
                    disabled={isValidatingApiKey}
                  />
                </div>
              </>
            )}
            
            {missingKeys.openai && (
              <>
                <Button
                  onClick={() => window.open('https://platform.openai.com/api-keys', '_blank')}
                  variant="outline"
                  size="sm"
                  className="flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ExternalLink className="h-4 w-4" />
                  Get OpenAI API Key
                </Button>
                <div className="flex flex-col gap-2">
                  <label htmlFor="openai-key" className="text-sm font-medium">
                    OpenAI API Key
                  </label>
                  <Input
                    id="openai-key"
                    type="password"
                    placeholder="sk-..."
                    value={openaiApiKey}
                    onChange={(e) => setOpenaiApiKey(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !isValidatingApiKey) {
                        handleApiKeySubmit();
                      }
                    }}
                    disabled={isValidatingApiKey}
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowApiKeyModal(false)}
              disabled={isValidatingApiKey}
            >
              Cancel
            </Button>
            <Button
              onClick={handleApiKeySubmit}
              disabled={isValidatingApiKey || !firecrawlApiKey.trim()}
              variant="code"
            >
              {isValidatingApiKey ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Validating...
                </>
              ) : (
                'Submit'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}