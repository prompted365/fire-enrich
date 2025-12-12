'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import { CSVRow } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Upload, FileSpreadsheet, Sparkles } from 'lucide-react';
import { FIRE_ENRICH_CONFIG, ERROR_MESSAGES } from './config';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CSVUploaderProps {
  onUpload: (rows: CSVRow[], columns: string[]) => void;
}

const SAMPLE_TEMPLATES = [
  { 
    id: 'company', 
    label: 'Company Research', 
    file: '/samples/company-research.csv',
    description: 'Company profiles and industry data',
    icon: '🏢'
  },
  { 
    id: 'funding', 
    label: 'Funding Research', 
    file: '/samples/funding-research.csv',
    description: 'Funding rounds and investors',
    icon: '💰'
  },
  { 
    id: 'people', 
    label: 'People Research', 
    file: '/samples/people-research.csv',
    description: 'Leadership and contact info',
    icon: '👥'
  },
  { 
    id: 'product', 
    label: 'Product Research', 
    file: '/samples/product-research.csv',
    description: 'Product features and positioning',
    icon: '🚀'
  },
  { 
    id: 'techstack', 
    label: 'Tech Stack Research', 
    file: '/samples/tech-stack-research.csv',
    description: 'Technology and infrastructure',
    icon: '⚙️'
  },
  { 
    id: 'metrics', 
    label: 'Metrics Research', 
    file: '/samples/metrics-research.csv',
    description: 'Company metrics and growth',
    icon: '📊'
  },
  { 
    id: 'contact', 
    label: 'Contact Enrichment', 
    file: '/samples/contact-enrichment.csv',
    description: 'Basic contact list example',
    icon: '📧'
  },
];

export function CSVUploader({ onUpload }: CSVUploaderProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processCSV = useCallback((file: File) => {
    setIsProcessing(true);
    setError(null);

    Papa.parse(file, {
      complete: (results) => {
        if (results.errors.length > 0) {
          setError(`CSV parsing error: ${results.errors[0].message}`);
          setIsProcessing(false);
          return;
        }

        if (!results.data || results.data.length === 0) {
          setError('CSV file is empty');
          setIsProcessing(false);
          return;
        }

        // Get headers from first row
        const headers = Object.keys(results.data[0] as object);
        const rows = results.data as CSVRow[];

        // No longer checking column limit - use token limits per cell instead

        // Filter out empty rows
        const validRows = rows.filter(row => 
          Object.values(row).some(value => value && String(value).trim() !== '')
        );

        if (validRows.length === 0) {
          setError('No valid data rows found in CSV');
          setIsProcessing(false);
          return;
        }

        // Check row limit
        if (validRows.length > FIRE_ENRICH_CONFIG.CSV_LIMITS.MAX_ROWS) {
          setError(
            `${ERROR_MESSAGES.TOO_MANY_ROWS}\n${ERROR_MESSAGES.UPGRADE_PROMPT}`
          );
          setIsProcessing(false);
          return;
        }

        setIsProcessing(false);
        onUpload(validRows, headers);
      },
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
      transform: (value) => value.trim(),
    });
  }, [onUpload]);

  const loadSampleCSV = useCallback(async (sampleFile: string) => {
    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch(sampleFile);
      const csvText = await response.text();
      
      Papa.parse(csvText, {
        complete: (results) => {
          if (results.errors.length > 0) {
            setError(`CSV parsing error: ${results.errors[0].message}`);
            setIsProcessing(false);
            return;
          }

          const headers = Object.keys(results.data[0] as object);
          const rows = results.data as CSVRow[];
          const validRows = rows.filter(row => 
            Object.values(row).some(value => value && String(value).trim() !== '')
          );

          setIsProcessing(false);
          onUpload(validRows, headers);
        },
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(),
        transform: (value) => value.trim(),
      });
    } catch (err) {
      setError('Failed to load sample CSV');
      setIsProcessing(false);
    }
  }, [onUpload]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      processCSV(acceptedFiles[0]);
    }
  }, [processCSV]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv'],
    },
    maxFiles: 1,
  });

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold mb-1">Upload Your CSV File</h2>
        <p className="text-sm text-muted-foreground">
          Start by uploading a CSV file with contact identifiers (emails, domains, etc.)
        </p>
      </div>

      <div
        {...getRootProps()}
        className={`
          relative overflow-hidden
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-all duration-300 ease-out
          ${isDragActive 
            ? 'border-orange-500 bg-orange-50 scale-[1.02] shadow-xl dark:bg-orange-950/20 dark:border-orange-400' 
            : 'border-zinc-300 hover:border-orange-400 bg-white hover:bg-orange-50/30 hover:shadow-lg hover:scale-[1.01] dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-orange-950/10 dark:hover:border-orange-700'
          }
          ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} disabled={isProcessing} />
        
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-5 dark:opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, #f97316 1px, transparent 1px)',
            backgroundSize: '32px 32px'
          }} />
        </div>
        
        <div className="relative">
          <div className={`
            w-16 h-16 mx-auto mb-4 rounded-xl flex items-center justify-center
            transition-all duration-300
            ${isDragActive ? 'bg-orange-500 scale-110 rotate-3' : 'bg-orange-500'}
          `}>
            <FileSpreadsheet className="w-8 h-8 text-white" />
          </div>
          
          {isDragActive ? (
            <div className="animate-fade-in">
              <p className="text-xl font-semibold text-orange-600 mb-1">Drop it here!</p>
              <p className="text-sm text-muted-foreground">We&apos;ll start processing immediately</p>
            </div>
          ) : (
            <>
              <p className="text-lg font-medium text-[#36322F] mb-1 dark:text-white">
                Drag & drop your CSV file here
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                or click to browse from your computer
              </p>
              <Button 
                variant="orange"
                size="sm"
                disabled={isProcessing}
              >
                <Upload className="w-4 h-4 mr-2" />
                Select CSV File
              </Button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl animate-fade-in dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400">
          <p className="font-semibold mb-1">Error:</p>
          <p className="text-sm whitespace-pre-line">{error}</p>
        </div>
      )}

      {isProcessing && (
        <div className="mt-6 text-center animate-fade-in">
          <div className="inline-flex items-center gap-3 px-6 py-3 bg-orange-100 rounded-full">
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
            <p className="text-sm font-medium text-orange-700">Processing CSV file...</p>
          </div>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="block p-3 bg-orange-50 rounded-lg border border-orange-200 dark:bg-orange-950/20 dark:border-orange-900/30 hover:bg-orange-100 dark:hover:bg-orange-950/30 transition-colors cursor-pointer">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 bg-orange-500 rounded flex items-center justify-center">
                  <Sparkles className="w-3 h-3 text-white" />
                </div>
                <h3 className="text-sm font-medium text-[#36322F] dark:text-white">Load Sample Template</h3>
              </div>
              <p className="text-xs text-muted-foreground">Choose from {SAMPLE_TEMPLATES.length} agent templates</p>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-80">
            <DropdownMenuLabel>Sample Templates</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {SAMPLE_TEMPLATES.map((template) => (
              <DropdownMenuItem 
                key={template.id}
                onClick={() => loadSampleCSV(template.file)}
                className="cursor-pointer"
              >
                <div className="flex items-start gap-3 py-1">
                  <span className="text-2xl">{template.icon}</span>
                  <div>
                    <div className="font-medium">{template.label}</div>
                    <div className="text-xs text-muted-foreground">{template.description}</div>
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        
        <div className="p-3 bg-zinc-100 rounded-lg border border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 bg-[#36322F] rounded flex items-center justify-center dark:bg-zinc-700">
              <span className="text-white text-xs font-bold">
                {FIRE_ENRICH_CONFIG.FEATURES.IS_UNLIMITED ? '∞' : FIRE_ENRICH_CONFIG.CSV_LIMITS.MAX_ROWS}
              </span>
            </div>
            <h3 className="text-sm font-medium text-[#36322F] dark:text-white">
              {FIRE_ENRICH_CONFIG.FEATURES.IS_UNLIMITED ? 'Unlimited Mode' : 'Row Limit'}
            </h3>
          </div>
          <p className="text-xs text-muted-foreground">
            {FIRE_ENRICH_CONFIG.FEATURES.IS_UNLIMITED 
              ? `Unlimited rows • ${FIRE_ENRICH_CONFIG.PROCESSING.MAX_TOKENS_PER_CELL} tokens/cell`
              : (
                <>
                  Demo version limited to {FIRE_ENRICH_CONFIG.CSV_LIMITS.MAX_ROWS} rows
                  <br />
                  <span className="text-[10px] opacity-80">Max {FIRE_ENRICH_CONFIG.PROCESSING.MAX_TOKENS_PER_CELL} tokens per cell</span>
                </>
              )
            }
          </p>
        </div>
      </div>
    </div>
  );
}