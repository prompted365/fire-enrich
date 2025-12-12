"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Users, TableProperties, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Session {
  id: string;
  created_at: string;
  row_count: number;
  field_count: number;
  email_column: string;
  fields: string[];
}

interface SessionBrowserProps {
  sessions: Session[];
  onSessionSelect: (session: Session) => void;
}

export function SessionBrowser({ sessions, onSessionSelect }: SessionBrowserProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {sessions.map((session) => (
        <Card
          key={session.id}
          className="p-4 hover:shadow-lg transition-all duration-200 cursor-pointer hover:border-orange-300 dark:hover:border-orange-700"
          onClick={() => onSessionSelect(session)}
        >
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-sm truncate mb-1">
                  Session {session.id.slice(0, 8)}
                </h3>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {formatDistanceToNow(new Date(session.created_at), { addSuffix: true })}
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>

            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4 text-orange-500" />
                <span className="font-medium">{session.row_count}</span>
                <span className="text-muted-foreground">rows</span>
              </div>
              <div className="flex items-center gap-1">
                <TableProperties className="h-4 w-4 text-orange-500" />
                <span className="font-medium">{session.field_count}</span>
                <span className="text-muted-foreground">fields</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-1">
              <Badge variant="secondary" className="text-xs">
                {session.email_column}
              </Badge>
              {session.fields && session.fields.slice(0, 2).map((field) => (
                <Badge key={field} variant="outline" className="text-xs">
                  {field}
                </Badge>
              ))}
              {session.fields && session.fields.length > 2 && (
                <Badge variant="outline" className="text-xs">
                  +{session.fields.length - 2}
                </Badge>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
