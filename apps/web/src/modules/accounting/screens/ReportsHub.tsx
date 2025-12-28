import React, { type FC } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart3, TrendingUp, Scale, PieChart } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ReportCard {
  id: string;
  title: string;
  description: string;
  icon: typeof BarChart3;
  path: string;
}

const reports: ReportCard[] = [
  {
    id: "trial-balance",
    title: "Trial Balance",
    description: "Summary of all account balances to verify debits equal credits",
    icon: Scale,
    path: "/accounting/reports/trial-balance",
  },
  {
    id: "general-ledger",
    title: "General Ledger",
    description: "Detailed transaction history for individual accounts",
    icon: BarChart3,
    path: "/accounting/reports/general-ledger",
  },
  {
    id: "profit-loss",
    title: "Profit & Loss",
    description: "Income statement showing revenue, expenses, and net income",
    icon: TrendingUp,
    path: "/accounting/reports/profit-loss",
  },
  {
    id: "balance-sheet",
    title: "Balance Sheet",
    description: "Snapshot of assets, liabilities, and equity at a specific date",
    icon: PieChart,
    path: "/accounting/reports/balance-sheet",
  },
];

/**
 * Reports hub showing all available financial reports
 */
export const ReportsHub: FC = () => {
  const navigate = useNavigate();

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Financial Reports</h1>
        <p className="text-muted-foreground">
          Access comprehensive reports to analyze your financial data
        </p>
      </div>

      {/* Report Cards Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {reports.map((report) => {
          const Icon = report.icon;
          return (
            <Card
              key={report.id}
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate(report.path)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      <Icon className="h-5 w-5 text-primary" />
                      {report.title}
                    </CardTitle>
                    <CardDescription>{report.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full" onClick={() => navigate(report.path)}>
                  View Report
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Info Section */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-lg">About Financial Reports</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            All reports are generated in real-time from your posted journal entries. Draft entries
            are not included in reports.
          </p>
          <p>
            You can export reports to PDF or Excel formats, and use date range filters to analyze
            specific periods.
          </p>
          <p className="text-primary font-medium">
            💡 AI-powered insights are available on each report to help you understand trends and
            anomalies.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
