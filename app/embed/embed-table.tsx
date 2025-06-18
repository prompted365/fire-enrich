'use client';

import { useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { RowEnrichmentResult } from '@/lib/types';

interface EmbedTableProps {
  sessionId: string;
}

export default function EmbedTable({ sessionId }: EmbedTableProps) {
  const [rows, setRows] = useState<RowEnrichmentResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const res = await fetch(`/api/results/${sessionId}`);
        if (res.ok) {
          const data = await res.json();
          setRows(data.results || []);
        }
      } catch (err) {
        console.error('Failed to load results', err);
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, [sessionId]);

  if (loading) {
    return <div className="p-4 text-sm text-muted-foreground">Loading...</div>;
  }

  if (!rows.length) {
    return <div className="p-4 text-sm text-muted-foreground">No results</div>;
  }

  const columns = [
    ...Object.keys(rows[0].originalData),
    ...Object.keys(rows[0].enrichments),
  ];

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map(col => (
            <TableHead key={col}>{col}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, i) => (
          <TableRow key={i}>
            {columns.map(col => {
              const val = row.originalData[col] ?? row.enrichments[col]?.value ?? '';
              return <TableCell key={col}>{String(val)}</TableCell>;
            })}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
