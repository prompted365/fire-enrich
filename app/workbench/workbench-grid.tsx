"use client";

import { useState, useEffect, useCallback } from "react";
import confetti from "canvas-confetti";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download, Play, Pause, RefreshCw, Save, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { EnrichmentOrchestrator, EnrichmentRule } from "./enrichment-orchestrator";

interface WorkbenchGridProps {
  sessionId: string;
}

interface CellValue {
  value: string | number | boolean | string[] | null;
  confidence?: number;
  sources?: string[];
}

interface Row {
  [key: string]: CellValue | string;
}

export function WorkbenchGrid({ sessionId }: WorkbenchGridProps) {
  const [data, setData] = useState<Row[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [enrichmentFields, setEnrichmentFields] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [isEnriching, setIsEnriching] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [enrichmentProgress, setEnrichmentProgress] = useState<{
    total: number;
    completed: number;
    currentRow?: number;
  }>({ total: 0, completed: 0 });

  useEffect(() => {
    loadSessionData();
  }, [sessionId]);

  const loadSessionData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/results/${sessionId}`);
      if (response.ok) {
        const result = await response.json();
        
        // Parse the session data
        const rows = result.results || [];
        const allColumns = new Set<string>();
        const enrichFields = new Set<string>();
        
        rows.forEach((row: any) => {
          Object.keys(row).forEach(key => {
            allColumns.add(key);
            if (key.startsWith('enrichment_')) {
              enrichFields.add(key.replace('enrichment_', ''));
            }
          });
        });

        setColumns(Array.from(allColumns));
        setEnrichmentFields(Array.from(enrichFields));
        setData(rows);
      } else {
        toast.error("Failed to load session data");
      }
    } catch (error) {
      console.error('Error loading session:', error);
      toast.error("Error loading session");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCellClick = (rowIndex: number, column: string) => {
    const cellData = data[rowIndex][column];
    const value = typeof cellData === 'object' && cellData !== null && 'value' in cellData
      ? String(cellData.value ?? '')
      : String(cellData ?? '');
    
    setEditingCell({ row: rowIndex, col: column });
    setEditValue(value);
  };

  const handleCellChange = (value: string) => {
    setEditValue(value);
  };

  const handleCellBlur = () => {
    if (editingCell) {
      const newData = [...data];
      const currentValue = newData[editingCell.row][editingCell.col];
      
      if (typeof currentValue === 'object' && currentValue !== null && 'value' in currentValue) {
        newData[editingCell.row][editingCell.col] = {
          ...currentValue,
          value: editValue
        };
      } else {
        newData[editingCell.row][editingCell.col] = editValue;
      }
      
      setData(newData);
      setEditingCell(null);
      setHasChanges(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCellBlur();
    } else if (e.key === 'Escape') {
      setEditingCell(null);
      setEditValue("");
    }
  };

  const handleAddRow = () => {
    const newRow: Row = {};
    columns.forEach(col => {
      newRow[col] = "";
    });
    setData([...data, newRow]);
    setHasChanges(true);
    toast.success("Row added");
  };

  const handleDeleteRow = (rowIndex: number) => {
    const newData = data.filter((_, idx) => idx !== rowIndex);
    setData(newData);
    setHasChanges(true);
    toast.success("Row deleted");
  };

  const handleSave = async () => {
    if (!sessionId) {
      toast.error("No session ID found");
      return;
    }

    try {
      const response = await fetch(`/api/sessions/${sessionId}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data, columns })
      });

      if (!response.ok) {
        throw new Error('Failed to save session');
      }

      const result = await response.json();
      console.log('Session saved:', result);
      toast.success("Changes saved successfully");
      setHasChanges(false);
      
      // Little celebration for saving!
      confetti({
        particleCount: 50,
        spread: 50,
        origin: { y: 0.7 },
        colors: ['#f97316', '#fb923c']
      });
    } catch (error) {
      console.error('Error saving session:', error);
      toast.error("Failed to save changes");
    }
  };

  const handleEnrichment = async (rules: EnrichmentRule[], selectedRows?: number[]) => {
    setIsEnriching(true);
    const rowsToEnrich = selectedRows || data.map((_, idx) => idx);
    setEnrichmentProgress({ total: rowsToEnrich.length, completed: 0 });

    try {
      // Extract enrichment fields from the session
      const fieldsToEnrich = enrichmentFields.map(field => ({
        name: field,
        displayName: field,
        description: `AI-generated ${field}`,
        type: 'string' as const,
        required: false
      }));

      // Get email column (assuming first column or look for 'email')
      const emailColumn = columns.find(c => c.toLowerCase().includes('email')) || columns[0];

      for (let i = 0; i < rowsToEnrich.length; i++) {
        const rowIndex = rowsToEnrich[i];
        const row = data[rowIndex];
        
        setEnrichmentProgress({ total: rowsToEnrich.length, completed: i, currentRow: rowIndex });

        // Create enrichment request
        const response = await fetch('/api/enrich', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            rows: [row],
            fields: fieldsToEnrich,
            emailColumn,
            sessionId,
          }),
        });

        if (!response.ok) {
          throw new Error(`Enrichment failed for row ${rowIndex}`);
        }

        // Parse SSE stream
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const eventData = JSON.parse(line.slice(6));
                  
                  if (eventData.type === 'row_complete') {
                    // Update the row with enriched data
                    const newData = [...data];
                    Object.entries(eventData.data.enrichments).forEach(([field, enrichment]: [string, any]) => {
                      newData[rowIndex][`enrichment_${field}`] = {
                        value: enrichment.value,
                        confidence: enrichment.confidence,
                        sources: enrichment.sources,
                      };
                    });
                    setData(newData);
                    setHasChanges(true);
                  }
                } catch (e) {
                  console.error('Error parsing SSE:', e);
                }
              }
            }
          }
        }
      }

      setEnrichmentProgress({ total: rowsToEnrich.length, completed: rowsToEnrich.length });
      toast.success(`Enriched ${rowsToEnrich.length} rows successfully`);
      
      // Celebrate with confetti!
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#f97316', '#fb923c', '#fdba74']
      });
    } catch (error) {
      console.error('Enrichment error:', error);
      toast.error("Enrichment failed");
    } finally {
      setIsEnriching(false);
    }
  };

  const handleExport = (format: 'csv' | 'json') => {
    if (format === 'csv') {
      const csv = [
        columns.join(','),
        ...data.map(row => 
          columns.map(col => {
            const cell = row[col];
            const value = typeof cell === 'object' && cell !== null && 'value' in cell
              ? cell.value
              : cell;
            return `"${String(value ?? '').replace(/"/g, '""')}"`;
          }).join(',')
        )
      ].join('\n');
      
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `session-${sessionId}.csv`;
      a.click();
      toast.success("Exported as CSV");
    } else {
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `session-${sessionId}.json`;
      a.click();
      toast.success("Exported as JSON");
    }
  };

  const getCellValue = (cell: CellValue | string): string => {
    if (typeof cell === 'object' && cell !== null && 'value' in cell) {
      const val = cell.value;
      if (Array.isArray(val)) return val.join(', ');
      return String(val ?? '');
    }
    return String(cell ?? '');
  };

  const getCellConfidence = (cell: CellValue | string): number | undefined => {
    if (typeof cell === 'object' && cell !== null && 'confidence' in cell) {
      return cell.confidence;
    }
    return undefined;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{data.length} rows</Badge>
            <Badge variant="secondary">{columns.length} columns</Badge>
            {enrichmentFields.length > 0 && (
              <Badge variant="default">{enrichmentFields.length} enriched fields</Badge>
            )}
            {isEnriching && (
              <Badge variant="outline" className="gap-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                Enriching {enrichmentProgress.completed}/{enrichmentProgress.total}
                {enrichmentProgress.currentRow !== undefined && ` (row ${enrichmentProgress.currentRow + 1})`}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {hasChanges && (
              <Button onClick={handleSave} size="sm" variant="outline" className="gap-2">
                <Save className="h-4 w-4" />
                Save Changes
              </Button>
            )}
            <EnrichmentOrchestrator
              sessionId={sessionId}
              columns={columns}
              enrichmentFields={enrichmentFields}
              onEnrich={handleEnrichment}
            />
            <Button onClick={handleAddRow} size="sm" variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Row
            </Button>
            <Button onClick={loadSessionData} size="sm" variant="outline" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleExport('csv')}>
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('json')}>
                  Export as JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </Card>

      {/* Spreadsheet Grid */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-zinc-50 dark:bg-zinc-900 sticky top-0 z-10">
              <tr>
                <th className="border border-zinc-200 dark:border-zinc-800 p-2 text-left text-xs font-semibold w-12">
                  #
                </th>
                {columns.map((col) => (
                  <th
                    key={col}
                    className={cn(
                      "border border-zinc-200 dark:border-zinc-800 p-2 text-left text-xs font-semibold min-w-[150px]",
                      enrichmentFields.includes(col.replace('enrichment_', '')) && "bg-orange-50 dark:bg-orange-950/20"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {col}
                      {enrichmentFields.includes(col.replace('enrichment_', '')) && (
                        <Badge variant="secondary" className="text-xs">AI</Badge>
                      )}
                    </div>
                  </th>
                ))}
                <th className="border border-zinc-200 dark:border-zinc-800 p-2 text-left text-xs font-semibold w-12">
                  
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                  <td className="border border-zinc-200 dark:border-zinc-800 p-2 text-xs text-muted-foreground text-center">
                    {rowIndex + 1}
                  </td>
                  {columns.map((col) => {
                    const cell = row[col];
                    const isEditing = editingCell?.row === rowIndex && editingCell?.col === col;
                    const confidence = getCellConfidence(cell);
                    
                    return (
                      <td
                        key={col}
                        className={cn(
                          "border border-zinc-200 dark:border-zinc-800 p-0 text-sm relative group",
                          enrichmentFields.includes(col.replace('enrichment_', '')) && "bg-orange-50/30 dark:bg-orange-950/10"
                        )}
                        onClick={() => !isEditing && handleCellClick(rowIndex, col)}
                      >
                        {isEditing ? (
                          <Input
                            value={editValue}
                            onChange={(e) => handleCellChange(e.target.value)}
                            onBlur={handleCellBlur}
                            onKeyDown={handleKeyDown}
                            autoFocus
                            className="border-0 rounded-none h-auto focus-visible:ring-2 focus-visible:ring-orange-500"
                          />
                        ) : (
                          <div className="p-2 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 min-h-[36px] flex items-center justify-between">
                            <span className={cn(
                              "truncate flex-1",
                              !getCellValue(cell) && "text-muted-foreground italic"
                            )}>
                              {getCellValue(cell) || 'empty'}
                            </span>
                            {confidence !== undefined && (
                              <Badge 
                                variant={confidence > 0.7 ? "default" : "secondary"} 
                                className="text-xs ml-2"
                              >
                                {Math.round(confidence * 100)}%
                              </Badge>
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}
                  <td className="border border-zinc-200 dark:border-zinc-800 p-2 text-center">
                    <Button
                      onClick={() => handleDeleteRow(rowIndex)}
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
