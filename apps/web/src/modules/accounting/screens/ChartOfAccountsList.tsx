import React, { type FC, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { useAccounts } from "../queries";
import { AccountTypeBadge } from "../components";
import type { AccountType } from "@corely/contracts";

/**
 * Chart of Accounts list with filtering and search
 */
export const ChartOfAccountsList: FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<AccountType | "all">("all");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("active");

  const { data, isLoading } = useAccounts({
    limit: 100,
    search: search || undefined,
    type: typeFilter !== "all" ? typeFilter : undefined,
    isActive: activeFilter === "all" ? undefined : activeFilter === "active",
  });

  const accounts = data?.accounts || [];

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Chart of Accounts</h1>
          <p className="text-muted-foreground">Manage your ledger accounts</p>
        </div>
        <Button onClick={() => navigate("/accounting/accounts/new")}>
          <Plus className="h-4 w-4 mr-2" />
          New Account
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
                  placeholder="Search by code or name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select
              value={typeFilter}
              onValueChange={(value) => setTypeFilter(value as AccountType | "all")}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Asset">Asset</SelectItem>
                <SelectItem value="Liability">Liability</SelectItem>
                <SelectItem value="Equity">Equity</SelectItem>
                <SelectItem value="Income">Income</SelectItem>
                <SelectItem value="Expense">Expense</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={activeFilter}
              onValueChange={(value) => setActiveFilter(value as "all" | "active" | "inactive")}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="inactive">Inactive Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Accounts Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Accounts</CardTitle>
              <CardDescription>
                {data?.total || 0} account{data?.total !== 1 ? "s" : ""} found
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading accounts...</div>
          ) : accounts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No accounts found matching your criteria</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="w-[120px]">Type</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((account) => (
                  <TableRow
                    key={account.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/accounting/accounts/${account.id}`)}
                  >
                    <TableCell className="font-mono text-sm">{account.code}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{account.name}</div>
                        {account.description && (
                          <div className="text-sm text-muted-foreground line-clamp-1">
                            {account.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <AccountTypeBadge type={account.type} />
                    </TableCell>
                    <TableCell>
                      {account.isActive ? (
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/accounting/accounts/${account.id}`);
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
