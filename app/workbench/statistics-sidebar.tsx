'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  BarChart3,
  TrendingUp,
  Hash,
  Calendar,
  Mail,
  Link as LinkIcon,
  Type,
  Loader2,
  X,
} from 'lucide-react';

interface DescriptiveStats {
  count: number;
  mean?: number;
  median?: number;
  mode?: number;
  stdDev?: number;
  min?: number;
  max?: number;
  q1?: number;
  q3?: number;
  type: 'numeric' | 'date' | 'email' | 'url' | 'text';
}

interface StatisticsSidebarProps {
  data: Record<string, any>[];
  column: string | null;
  onClose: () => void;
}

const TypeIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'numeric':
      return <Hash className="h-4 w-4" />;
    case 'date':
      return <Calendar className="h-4 w-4" />;
    case 'email':
      return <Mail className="h-4 w-4" />;
    case 'url':
      return <LinkIcon className="h-4 w-4" />;
    default:
      return <Type className="h-4 w-4" />;
  }
};

export function StatisticsSidebar({ data, column, onClose }: StatisticsSidebarProps) {
  const [stats, setStats] = useState<DescriptiveStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!column) {
      setStats(null);
      return;
    }

    const fetchStats = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/statistics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data, column }),
        });

        if (response.ok) {
          const result = await response.json();
          setStats(result.statistics);
        }
      } catch (err) {
        console.error('Failed to fetch statistics:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [column, data]);

  if (!column) return null;

  return (
    <div className="w-80 border-l bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-orange-500" />
          <h3 className="font-semibold">Statistics</h3>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="h-[calc(100vh-120px)]">
        <div className="p-4 space-y-4">
          {/* Column Name */}
          <div>
            <div className="text-sm text-muted-foreground mb-1">Column</div>
            <div className="font-mono text-sm bg-muted px-3 py-2 rounded-md break-all">
              {column}
            </div>
          </div>

          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
          )}

          {!isLoading && stats && (
            <>
              {/* Type Badge */}
              <div>
                <div className="text-sm text-muted-foreground mb-2">Data Type</div>
                <Badge className="gap-2 bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400">
                  <TypeIcon type={stats.type} />
                  {stats.type}
                </Badge>
              </div>

              {/* Count */}
              <Card className="p-4">
                <div className="text-sm text-muted-foreground mb-1">Count</div>
                <div className="text-2xl font-bold">{stats.count}</div>
              </Card>

              {/* Numeric Stats */}
              {stats.type === 'numeric' && stats.mean !== undefined && (
                <>
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-orange-500" />
                      Descriptive Statistics
                    </h4>

                    <Card className="p-4 space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Mean</span>
                        <span className="text-sm font-mono font-semibold">
                          {stats.mean.toFixed(2)}
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Median</span>
                        <span className="text-sm font-mono font-semibold">
                          {stats.median?.toFixed(2) ?? 'N/A'}
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Mode</span>
                        <span className="text-sm font-mono font-semibold">
                          {stats.mode?.toFixed(2) ?? 'N/A'}
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Std Dev</span>
                        <span className="text-sm font-mono font-semibold">
                          {stats.stdDev?.toFixed(2) ?? 'N/A'}
                        </span>
                      </div>
                    </Card>

                    <Card className="p-4 space-y-3">
                      <div className="text-sm font-semibold mb-2">Range</div>

                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Min</span>
                        <span className="text-sm font-mono font-semibold">
                          {stats.min?.toFixed(2) ?? 'N/A'}
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Q1</span>
                        <span className="text-sm font-mono font-semibold">
                          {stats.q1?.toFixed(2) ?? 'N/A'}
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Q3</span>
                        <span className="text-sm font-mono font-semibold">
                          {stats.q3?.toFixed(2) ?? 'N/A'}
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Max</span>
                        <span className="text-sm font-mono font-semibold">
                          {stats.max?.toFixed(2) ?? 'N/A'}
                        </span>
                      </div>
                    </Card>

                    {/* IQR */}
                    {stats.q1 !== undefined && stats.q3 !== undefined && (
                      <Card className="p-4 bg-orange-50 dark:bg-orange-950/20">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">IQR</span>
                          <span className="text-sm font-mono font-semibold">
                            {(stats.q3 - stats.q1).toFixed(2)}
                          </span>
                        </div>
                      </Card>
                    )}
                  </div>
                </>
              )}

              {/* Non-numeric */}
              {stats.type !== 'numeric' && (
                <Card className="p-4 bg-muted">
                  <p className="text-sm text-muted-foreground">
                    Detailed statistics are only available for numeric columns.
                  </p>
                </Card>
              )}
            </>
          )}

          {!isLoading && !stats && (
            <Card className="p-4 bg-muted">
              <p className="text-sm text-muted-foreground">
                No statistics available for this column.
              </p>
            </Card>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
