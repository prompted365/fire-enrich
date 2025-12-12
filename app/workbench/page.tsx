"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Table2, Plus, Search, Calendar, FileSpreadsheet, Loader2 } from "lucide-react";
import Link from "next/link";
import { WorkbenchGrid } from "./workbench-grid";
import { SessionBrowser } from "./session-browser";

interface Session {
  id: string;
  created_at: string;
  row_count: number;
  field_count: number;
  email_column: string;
  fields: string[];
}

export default function WorkbenchPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"browse" | "current">("browse");

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/sessions');
      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions || []);
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSessionSelect = (session: Session) => {
    setSelectedSession(session);
    setActiveTab("current");
  };

  const handleNewSession = () => {
    setSelectedSession(null);
    setActiveTab("current");
  };

  const filteredSessions = sessions.filter(session => 
    session.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    session.email_column.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-orange-50/30 to-zinc-50 dark:from-zinc-950 dark:via-orange-950/10 dark:to-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white/80 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/80 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <Table2 className="h-6 w-6 text-orange-500" />
                <h1 className="text-2xl font-bold">Workbench</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "browse" | "current")}>
          <div className="flex items-center justify-between mb-6">
            <TabsList className="grid w-[400px] grid-cols-2">
              <TabsTrigger value="browse" className="gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                Browse Sessions
              </TabsTrigger>
              <TabsTrigger value="current" className="gap-2">
                <Table2 className="h-4 w-4" />
                {selectedSession ? 'Current Session' : 'New Session'}
              </TabsTrigger>
            </TabsList>

            {activeTab === "browse" && (
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search sessions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-64"
                  />
                </div>
                <Button onClick={loadSessions} variant="outline" size="sm">
                  Refresh
                </Button>
              </div>
            )}
          </div>

          <TabsContent value="browse" className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
              </div>
            ) : filteredSessions.length === 0 ? (
              <Card className="p-12 text-center">
                <FileSpreadsheet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No sessions found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery ? "Try a different search term" : "Create your first enrichment session"}
                </p>
                <Button onClick={handleNewSession} className="gap-2">
                  <Plus className="h-4 w-4" />
                  New Session
                </Button>
              </Card>
            ) : (
              <SessionBrowser
                sessions={filteredSessions}
                onSessionSelect={handleSessionSelect}
              />
            )}
          </TabsContent>

          <TabsContent value="current">
            {selectedSession ? (
              <WorkbenchGrid sessionId={selectedSession.id} />
            ) : (
              <Card className="p-12 text-center">
                <Table2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Create New Session</h3>
                <p className="text-muted-foreground mb-4">
                  Start a new enrichment session or select an existing one from the browser
                </p>
                <div className="flex gap-2 justify-center">
                  <Link href="/fire-enrich">
                    <Button className="gap-2">
                      <Plus className="h-4 w-4" />
                      Upload CSV
                    </Button>
                  </Link>
                  <Button onClick={() => setActiveTab("browse")} variant="outline">
                    Browse Sessions
                  </Button>
                </div>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
