import React, { type FC, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { useJournalEntries } from "../queries";
import { EntryStatusBadge, Money } from "../components";
import type { EntryStatus } from "@corely/contracts";

/**
 * Journal Entries list with filtering and search
 */
export const JournalEntriesList: FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<EntryStatus | "all">("all");

  const { data, isLoading } = useJournalEntries({
    limit: 50,
    search: search || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });

  const entries = data?.entries || [];

  // Calculate total for each entry (sum of debits or credits, they're equal)
  const getEntryTotal = (entry: (typeof entries)[0]) => {
    const totalDebits = entry.lines
      .filter((l) => l.direction === "Debit")
      .reduce((sum, l) => sum + l.amountCents, 0);
    return totalDebits;
  };

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Journal Entries</h1>
          <p className="text-muted-foreground">View and manage all accounting transactions</p>
        </div>
        <Button onClick={() => navigate("/accounting/journal-entries/new")}>
          <Plus className="h-4 w-4 mr-2" />
          New Entry
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by memo or entry number..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as EntryStatus | "all")}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Draft">Draft</SelectItem>
                <SelectItem value="Posted">Posted</SelectItem>
                <SelectItem value="Reversed">Reversed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Entries Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Entries</CardTitle>
              <CardDescription>
                {data?.total || 0} entr{data?.total === 1 ? "y" : "ies"} found
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading entries...</div>
          ) : entries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No journal entries found</p>
              <Button
                variant="link"
                className="mt-2"
                onClick={() => navigate("/accounting/journal-entries/new")}
              >
                Create your first entry
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Entry #</TableHead>
                  <TableHead className="w-[120px]">Date</TableHead>
                  <TableHead>Memo</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead className="w-[140px] text-right">Amount</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow
                    key={entry.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/accounting/journal-entries/${entry.id}`)}
                  >
                    <TableCell className="font-mono text-sm">
                      {entry.entryNumber || (
                        <span className="text-muted-foreground italic">Draft</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(entry.postingDate), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-md">
                        <div className="font-medium line-clamp-1">{entry.memo}</div>
                        <div className="text-xs text-muted-foreground">
                          {entry.lines.length} line{entry.lines.length !== 1 ? "s" : ""}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <EntryStatusBadge status={entry.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Money
                        amountCents={getEntryTotal(entry)}
                        currency={entry.lines[0]?.currency || "EUR"}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/accounting/journal-entries/${entry.id}`);
                        }}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* TODO: Add cursor-based pagination controls if needed */}
        </CardContent>
      </Card>
    </div>
  );
};
