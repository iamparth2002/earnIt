"use client";

import React, { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/store/useStore";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
  Wallet,
  ArrowLeft,
} from "lucide-react";
import Image from "next/image";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  Tooltip,
} from "recharts";

export default function RewardsPage() {
  // Detect mobile for chart days
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // All data from SINGLE SOURCE OF TRUTH (tasks array)
  const tasks = useStore((state) => state.tasks);
  const spendLogs = useStore((state) => state.spendLogs);
  const rewards = useStore((state) => state.rewards);

  const [showAllTransactions, setShowAllTransactions] = useState(false);

  // Flatten all history from tasks (single source of truth)
  const allHistory = useMemo(() => {
    const history: { taskId: string; taskName: string; category: string; date: Date; credits: number }[] = [];
    tasks.forEach((task) => {
      task.history.forEach((h) => {
        history.push({
          taskId: task.id,
          taskName: task.title,
          category: task.category,
          date: new Date(h.date),
          credits: h.credits,
        });
      });
    });
    return history;
  }, [tasks]);

  // Current month stats
  const currentMonthStats = useMemo(() => {
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const earned = allHistory
      .filter((h) => h.date >= monthStart)
      .reduce((sum, h) => sum + h.credits, 0);

    const spent = spendLogs
      .filter((log) => new Date(log.date) >= monthStart)
      .reduce((sum, log) => sum + log.creditsSpent, 0);

    return { earned, spent };
  }, [allHistory, spendLogs]);

  // Daily data - 15 days on mobile, 30 days on desktop
  const chartDays = isMobile ? 15 : 30;

  const dailyChartData = useMemo(() => {
    const days = [];
    const today = new Date();
    const numDays = isMobile ? 14 : 29; // 0-indexed

    for (let i = numDays; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toDateString();

      const earned = allHistory
        .filter((h) => h.date.toDateString() === dateStr)
        .reduce((sum, h) => sum + h.credits, 0);

      const spent = spendLogs
        .filter((log) => new Date(log.date).toDateString() === dateStr)
        .reduce((sum, log) => sum + log.creditsSpent, 0);

      days.push({
        name: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        earned,
        spent,
      });
    }
    return days;
  }, [allHistory, spendLogs, isMobile]);

  // Category breakdown for donut chart (current month only)
  const categoryBreakdown = useMemo(() => {
    const categories: { [key: string]: number } = {};
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    allHistory
      .filter((h) => h.date >= monthStart)
      .forEach((h) => {
        const cat = h.category || "other";
        categories[cat] = (categories[cat] || 0) + h.credits;
      });

    const sorted = Object.entries(categories)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);

    const total = sorted.reduce((sum, [, val]) => sum + val, 0);
    const pieData = sorted.map(([name, value]) => ({ name, value }));

    return { items: sorted, total, pieData, hasData: pieData.length > 0 };
  }, [allHistory]);

  // Calendar heatmap - 9 weeks (~2 months) on mobile, 13 weeks (~3 months) on desktop
  const heatmapWeeks = isMobile ? 9 : 13;

  const calendarData = useMemo(() => {
    const weeks: { date: Date; level: number; earned: number }[][] = [];
    const today = new Date();
    const numWeeks = isMobile ? 8 : 12; // 0-indexed

    for (let w = numWeeks; w >= 0; w--) {
      const week: { date: Date; level: number; earned: number }[] = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(today);
        date.setDate(today.getDate() - (w * 7 + (6 - d)));
        const dateStr = date.toDateString();

        const earned = allHistory
          .filter((h) => h.date.toDateString() === dateStr)
          .reduce((sum, h) => sum + h.credits, 0);

        let level = 0;
        if (earned > 0) level = 1;
        if (earned >= 100) level = 2;
        if (earned >= 250) level = 3;
        if (earned >= 500) level = 4;

        week.push({ date, level, earned });
      }
      weeks.push(week);
    }
    return weeks;
  }, [allHistory, isMobile]);

  const monthLabels = useMemo(() => {
    const labels: { month: string; colStart: number }[] = [];
    let lastMonth = "";

    calendarData.forEach((week, index) => {
      const firstDayOfWeek = week[0].date;
      const monthName = firstDayOfWeek.toLocaleDateString("en-US", { month: "short" });

      if (monthName !== lastMonth) {
        labels.push({ month: monthName, colStart: index });
        lastMonth = monthName;
      }
    });

    return labels;
  }, [calendarData, heatmapWeeks]);

  const levelColors = [
    "bg-gray-100",
    "bg-[#432874]/20",
    "bg-[#432874]/40",
    "bg-[#432874]/70",
    "bg-[#432874]",
  ];

  // Use real data only - no dummy data
  const displayChartData = dailyChartData;
  const displayPieData = categoryBreakdown.pieData;
  const displayTotal = categoryBreakdown.total;

  const pieColors = ['#432874', '#5a3a8a', '#7b5a9e', '#9c7ab8'];

  // All transactions for table view (derived from tasks history + spend logs)
  const allTransactions = useMemo(() => {
    const transactions: { id: string; type: 'earned' | 'spent'; name: string; amount: number; date: Date; category?: string }[] = [];

    // Add earned entries from allHistory (derived from tasks)
    allHistory.forEach((h, index) => {
      transactions.push({
        id: `earned-${h.taskId}-${index}`,
        type: 'earned',
        name: h.taskName,
        amount: h.credits,
        date: h.date,
        category: h.category,
      });
    });

    // Add spend logs (spent)
    spendLogs.forEach((log) => {
      const reward = rewards.find((r) => r.id === log.rewardId);
      transactions.push({
        id: log.id,
        type: 'spent',
        name: reward?.name || 'Reward',
        amount: log.creditsSpent,
        date: new Date(log.date),
      });
    });

    // Sort by date (newest first)
    return transactions.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [allHistory, spendLogs, rewards]);

  // Pagination and filter state for table view
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [typeFilter, setTypeFilter] = useState<'all' | 'earned' | 'spent'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | '7days' | '30days' | '90days'>('all');

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    return allTransactions.filter((t) => {
      const matchesType = typeFilter === 'all' || t.type === typeFilter;

      let matchesDate = true;
      if (dateFilter === '7days') {
        const daysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        matchesDate = t.date >= daysAgo;
      } else if (dateFilter === '30days') {
        const daysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        matchesDate = t.date >= daysAgo;
      } else if (dateFilter === '90days') {
        const daysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        matchesDate = t.date >= daysAgo;
      }

      return matchesType && matchesDate;
    });
  }, [allTransactions, typeFilter, dateFilter]);

  // Paginated transactions
  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return filteredTransactions.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredTransactions, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(filteredTransactions.length / rowsPerPage);

  // Table view for all transactions
  if (showAllTransactions) {
    return (
      <div className="h-[calc(100dvh-56px-64px)] md:h-[calc(100dvh-56px)] bg-[#f5f7fa] overflow-hidden flex flex-col">
        <div className="w-full h-full flex flex-col lg:flex-row min-h-0">
          {/* Table Card - Left Side */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white shadow-sm overflow-hidden border-r border-gray-100 flex flex-col flex-1 min-h-0 h-full"
          >
            {/* Header with Back Button and Filters */}
            <div className="p-3 sm:p-4 border-b border-gray-100 flex-shrink-0">
              {/* Top row: Back button and results count */}
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => setShowAllTransactions(false)}
                  className="flex items-center gap-1.5 text-[#432874] hover:text-[#5a3a8a] font-medium text-sm"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <span className="text-xs text-gray-400">
                  {filteredTransactions.length} results
                </span>
              </div>

              {/* Filters row */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 -mb-1">
                {/* Date Filter */}
                <select
                  value={dateFilter}
                  onChange={(e) => {
                    setDateFilter(e.target.value as 'all' | '7days' | '30days' | '90days');
                    setCurrentPage(1);
                  }}
                  className="px-2.5 py-1.5 text-xs font-medium border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#432874] bg-white flex-shrink-0"
                >
                  <option value="all">All Time</option>
                  <option value="7days">7 Days</option>
                  <option value="30days">30 Days</option>
                  <option value="90days">90 Days</option>
                </select>

                {/* Type Filter */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => { setTypeFilter('all'); setCurrentPage(1); }}
                    className={cn(
                      "px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors",
                      typeFilter === 'all'
                        ? "bg-[#432874] text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    )}
                  >
                    All
                  </button>
                  <button
                    onClick={() => { setTypeFilter('earned'); setCurrentPage(1); }}
                    className={cn(
                      "px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors",
                      typeFilter === 'earned'
                        ? "bg-[#432874] text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    )}
                  >
                    Earned
                  </button>
                  <button
                    onClick={() => { setTypeFilter('spent'); setCurrentPage(1); }}
                    className={cn(
                      "px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors",
                      typeFilter === 'spent'
                        ? "bg-[#432874] text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    )}
                  >
                    Spent
                  </button>
                </div>
              </div>
            </div>

            {/* Table - Desktop */}
            <div className="flex-1 overflow-y-auto overscroll-contain min-h-0 hidden sm:block">
              <table className="w-full">
                <thead className="bg-gray-50/80 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 md:px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-4 md:px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-4 md:px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-4 md:px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Category</th>
                    <th className="px-4 md:px-6 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedTransactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 md:px-6 py-3 md:py-4 whitespace-nowrap text-xs md:text-sm text-gray-500">
                        {transaction.date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td className="px-4 md:px-6 py-3 md:py-4 whitespace-nowrap">
                        <span className="text-xs md:text-sm font-medium text-gray-900">{transaction.name}</span>
                      </td>
                      <td className="px-4 md:px-6 py-3 md:py-4 whitespace-nowrap">
                        <span className={cn(
                          "px-2 py-0.5 md:px-2.5 md:py-1 rounded-full text-[10px] md:text-xs font-medium",
                          transaction.type === 'earned'
                            ? "bg-[#432874]/10 text-[#432874]"
                            : "bg-gray-100 text-gray-500"
                        )}>
                          {transaction.type === 'earned' ? 'Earned' : 'Spent'}
                        </span>
                      </td>
                      <td className="px-4 md:px-6 py-3 md:py-4 whitespace-nowrap text-xs md:text-sm text-gray-500 capitalize hidden md:table-cell">
                        {transaction.category || '-'}
                      </td>
                      <td className="px-4 md:px-6 py-3 md:py-4 whitespace-nowrap text-right">
                        <span className={cn(
                          "text-xs md:text-sm font-medium flex items-center justify-end gap-1",
                          transaction.type === 'earned' ? "text-[#432874]" : "text-gray-500"
                        )}>
                          {transaction.type === 'earned' ? '+' : '-'}{transaction.amount}
                          <Image src="/diamond.svg" alt="gem" width={14} height={14} />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List */}
            <div className="flex-1 overflow-y-auto overscroll-contain min-h-0 sm:hidden p-3 space-y-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {paginatedTransactions.map((transaction) => (
                <div key={transaction.id} className="bg-gray-50 rounded-xl p-3 flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{transaction.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500">
                        {transaction.date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-medium",
                        transaction.type === 'earned'
                          ? "bg-[#432874]/10 text-[#432874]"
                          : "bg-gray-200 text-gray-500"
                      )}>
                        {transaction.type === 'earned' ? 'Earned' : 'Spent'}
                      </span>
                    </div>
                  </div>
                  <div className={cn(
                    "flex items-center gap-1 text-sm font-bold ml-3",
                    transaction.type === 'earned' ? "text-[#432874]" : "text-gray-500"
                  )}>
                    {transaction.type === 'earned' ? '+' : '-'}{transaction.amount}
                    <Image src="/diamond.svg" alt="gem" width={14} height={14} />
                  </div>
                </div>
              ))}
            </div>

            {filteredTransactions.length === 0 && (
              <div className="flex-1 flex items-center justify-center p-12 text-center">
                <p className="text-gray-500">No transactions found</p>
              </div>
            )}

            {/* Pagination */}
            {filteredTransactions.length > 0 && totalPages > 1 && (
              <div className="px-3 sm:px-6 py-3 border-t border-gray-100 flex-shrink-0 bg-white">
                <div className="flex items-center justify-center gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    let pageNum;
                    const maxVisible = 7;
                    if (totalPages <= maxVisible) {
                      pageNum = i + 1;
                    } else if (currentPage <= 4) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 3) {
                      pageNum = totalPages - maxVisible + 1 + i;
                    } else {
                      pageNum = currentPage - 3 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={cn(
                          "w-8 h-8 sm:w-9 sm:h-9 text-xs sm:text-sm font-medium rounded-lg transition-all flex-shrink-0",
                          currentPage === pageNum
                            ? "bg-[#432874] text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        )}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>

          {/* Stats Cards - Right Side (hidden on mobile, shows at top on large screens) */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            className="hidden lg:flex w-72 flex-shrink-0 flex-col gap-3 p-4 bg-white"
          >
            <div className="rounded-xl p-4 bg-gray-50 border border-gray-100">
              <p className="text-xs text-gray-500 font-medium uppercase">Total Transactions</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{allTransactions.length}</p>
            </div>
            <div className="rounded-xl p-4 bg-[#432874]/10 border border-[#432874]/20">
              <p className="text-xs text-[#432874] font-medium uppercase">Total Earned</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-2xl font-bold text-[#432874]">
                  {allTransactions.filter(t => t.type === 'earned').reduce((sum, t) => sum + t.amount, 0)}
                </p>
                <Image src="/diamond.svg" alt="gem" width={18} height={18} />
              </div>
            </div>
            <div className="rounded-xl p-4 bg-gray-50 border border-gray-100">
              <p className="text-xs text-gray-500 font-medium uppercase">Total Spent</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-2xl font-bold text-gray-600">
                  {allTransactions.filter(t => t.type === 'spent').reduce((sum, t) => sum + t.amount, 0)}
                </p>
                <Image src="/diamond.svg" alt="gem" width={18} height={18} />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100dvh-56px-64px)] md:h-[calc(100dvh-56px)] bg-[#f5f7fa] overflow-hidden flex flex-col">
      <div className="flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4 md:p-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4">

          {/* Left Side - Line Chart + Heatmap */}
          <div className="lg:col-span-8 space-y-3 sm:space-y-4">

            {/* Earnings & Spending Line Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-2">
                <div>
                  <h3 className="text-[14px] sm:text-[16px] font-semibold text-gray-900">Past {chartDays} Days</h3>
                  <p className="text-[11px] sm:text-[12px] text-gray-400">Earnings vs Spending</p>
                </div>
                <div className="flex items-center gap-4 sm:gap-6">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="w-2.5 sm:w-3 h-2.5 sm:h-3 rounded-full bg-[#432874]" />
                    <span className="text-[11px] sm:text-[12px] text-gray-500">Earned</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="w-2.5 sm:w-3 h-2.5 sm:h-3 rounded-full bg-[#432874]/50" />
                    <span className="text-[11px] sm:text-[12px] text-gray-500">Spent</span>
                  </div>
                </div>
              </div>
              <div className="h-[200px] sm:h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={displayChartData} margin={{ top: 10, right: 20, left: -15, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 9 }} angle={-45} textAnchor="end" interval={3} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} width={40} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="earned"
                      stroke="#432874"
                      strokeWidth={3}
                      dot={{ fill: '#432874', strokeWidth: 0, r: 5 }}
                      activeDot={{ r: 7, fill: '#432874' }}
                      name="Earned"
                    />
                    <Line
                      type="monotone"
                      dataKey="spent"
                      stroke="#9c7ab8"
                      strokeWidth={3}
                      dot={{ fill: '#9c7ab8', strokeWidth: 0, r: 5 }}
                      activeDot={{ r: 7, fill: '#9c7ab8' }}
                      name="Spent"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Activity Heatmap */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl p-3 sm:p-5 shadow-sm"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[13px] sm:text-[14px] font-semibold text-gray-900">Earnings Heatmap</h3>
                <span className="text-[9px] sm:text-[10px] text-gray-400 uppercase tracking-wider">{isMobile ? 'Last 2 months' : 'Last 3 months'}</span>
              </div>

              <div className="flex flex-col overflow-x-auto pb-2">
                {/* Month labels */}
                <div className="flex gap-1 mb-1.5 ml-9">
                  <div className="flex-1 relative h-4">
                    {monthLabels.map((label, i) => (
                      <span
                        key={i}
                        className="absolute text-[10px] text-gray-400 font-medium"
                        style={{ left: `${(label.colStart / heatmapWeeks) * 100}%` }}
                      >
                        {label.month}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  {/* Day labels */}
                  <div className={cn("flex flex-col justify-between py-[1px] text-[9px] text-gray-400 w-7", isMobile && "h-[196px]")}>
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                      <span key={day} className={cn("leading-none flex items-center", isMobile ? "h-6" : "h-3")}>{day}</span>
                    ))}
                  </div>

                  {/* Heatmap grid */}
                  <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${heatmapWeeks}, 1fr)`, gap: isMobile ? '4px' : '3px' }}>
                    {calendarData.map((week, wi) => (
                      <div key={wi} className="flex flex-col" style={{ gap: isMobile ? '4px' : '3px' }}>
                        {week.map((day, di) => {
                          // Position tooltip based on cell location
                          const isLeftEdge = wi < (isMobile ? 2 : 3);
                          const isRightEdge = wi > (isMobile ? 6 : 9);
                          const isTopEdge = di < 2;
                          const isBottomEdge = di > 4;

                          // Determine horizontal position
                          const horizontalClass = isLeftEdge
                            ? "left-0"
                            : isRightEdge
                              ? "right-0"
                              : "left-1/2 -translate-x-1/2";

                          // Determine vertical position
                          const verticalClass = isBottomEdge
                            ? "bottom-full mb-2"
                            : "top-full mt-2";

                          return (
                            <div
                              key={di}
                              className="relative group"
                            >
                              <div
                                className={cn(
                                  "aspect-square rounded flex items-center justify-center cursor-pointer",
                                  isMobile ? "min-w-[24px] min-h-[24px]" : "",
                                  levelColors[day.level]
                                )}
                              >
                                {day.earned > 0 && (
                                  <span className={cn(
                                    "font-bold",
                                    isMobile ? "text-[9px]" : "text-[8px]",
                                    day.level >= 3 ? "text-white" : "text-gray-900"
                                  )}>
                                    {day.earned}
                                  </span>
                                )}
                              </div>
                              <div className={cn(
                                "absolute px-2.5 py-1.5 bg-white rounded-lg shadow-lg border border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap",
                                horizontalClass,
                                verticalClass
                              )}>
                                <p className="text-[10px] font-medium text-gray-700">
                                  {day.date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                                </p>
                                <p className="text-[10px] font-semibold text-[#432874]">
                                  {day.earned} credits
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Legend */}
                <div className="flex items-center justify-end gap-1.5 mt-3 text-[9px] text-gray-400">
                  <span>Less</span>
                  {levelColors.map((color, i) => (
                    <div key={i} className={cn("w-3 h-3 rounded", color)} />
                  ))}
                  <span>More</span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right Side - Stats Cards */}
          <div className="lg:col-span-4 flex flex-col gap-3 sm:gap-4">

            {/* This Month Summary */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="bg-white rounded-2xl p-3 sm:p-4 shadow-sm"
              >
                <div className="flex items-center gap-1.5 sm:gap-2 mb-2">
                  <TrendingUp className="w-4 sm:w-5 h-4 sm:h-5 text-[#432874]" />
                  <span className="text-[10px] sm:text-[11px] text-gray-500 font-medium uppercase">Earned</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="text-[20px] sm:text-[24px] font-bold text-gray-900">{currentMonthStats.earned}</span>
                  <Image src="/diamond.svg" alt="gem" width={16} height={16} className="sm:w-[18px] sm:h-[18px]" />
                </div>
                <p className="text-[9px] sm:text-[10px] text-gray-400 mt-1">This month</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-2xl p-3 sm:p-4 shadow-sm"
              >
                <div className="flex items-center gap-1.5 sm:gap-2 mb-2">
                  <Wallet className="w-4 sm:w-5 h-4 sm:h-5 text-[#432874]" />
                  <span className="text-[10px] sm:text-[11px] text-gray-500 font-medium uppercase">Spent</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="text-[20px] sm:text-[24px] font-bold text-gray-900">{currentMonthStats.spent}</span>
                  <Image src="/diamond.svg" alt="gem" width={16} height={16} className="sm:w-[18px] sm:h-[18px]" />
                </div>
                <p className="text-[9px] sm:text-[10px] text-gray-400 mt-1">This month</p>
              </motion.div>
            </div>

            {/* Categories Donut Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl p-3 sm:p-5 shadow-sm"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[13px] sm:text-[14px] font-semibold text-gray-900">Categories</h3>
                <span className="text-[9px] sm:text-[10px] text-gray-400 uppercase tracking-wider">This month</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="relative w-full h-[180px] sm:h-[280px]">
                  {categoryBreakdown.hasData ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={displayPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={isMobile ? 45 : 60}
                          outerRadius={isMobile ? 70 : 90}
                          paddingAngle={3}
                          dataKey="value"
                          startAngle={90}
                          endAngle={-270}
                          label={isMobile ? false : ({ name, cx, cy, midAngle, outerRadius, index }) => {
                            const RADIAN = Math.PI / 180;
                            const radius = outerRadius + 30;
                            const x = cx + radius * Math.cos(-midAngle * RADIAN);
                            const y = cy + radius * Math.sin(-midAngle * RADIAN);
                            return (
                              <text
                                x={x}
                                y={y}
                                fill={pieColors[index % pieColors.length]}
                                textAnchor={x > cx ? 'start' : 'end'}
                                dominantBaseline="central"
                                className="text-[12px] font-semibold capitalize"
                              >
                                {name}
                              </text>
                            );
                          }}
                          labelLine={isMobile ? false : ({ cx, cy, midAngle, outerRadius, index }) => {
                            const RADIAN = Math.PI / 180;
                            const startRadius = outerRadius + 5;
                            const endRadius = outerRadius + 25;
                            const startX = cx + startRadius * Math.cos(-midAngle * RADIAN);
                            const startY = cy + startRadius * Math.sin(-midAngle * RADIAN);
                            const endX = cx + endRadius * Math.cos(-midAngle * RADIAN);
                            const endY = cy + endRadius * Math.sin(-midAngle * RADIAN);
                            return (
                              <line
                                x1={startX}
                                y1={startY}
                                x2={endX}
                                y2={endY}
                                stroke={pieColors[index % pieColors.length]}
                                strokeWidth={2}
                              />
                            );
                          }}
                        >
                          {displayPieData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} stroke="none" />
                          ))}
                        </Pie>
                        {isMobile && (
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                  <div className="bg-white px-3 py-2 rounded-lg shadow-lg border border-gray-100">
                                    <p className="text-sm font-semibold text-gray-800 capitalize">{data.name}</p>
                                    <p className="text-xs text-[#432874] font-medium">{data.value} credits</p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                        )}
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    /* Empty state - gray donut */
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[{ name: 'empty', value: 1 }]}
                          cx="50%"
                          cy="50%"
                          innerRadius={isMobile ? 45 : 60}
                          outerRadius={isMobile ? 70 : 90}
                          dataKey="value"
                          startAngle={90}
                          endAngle={-270}
                        >
                          <Cell fill="#e5e7eb" stroke="none" />
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    {categoryBreakdown.hasData ? (
                      <>
                        <span className="text-[24px] sm:text-[30px] font-bold text-gray-900">{displayTotal}</span>
                        <span className="text-[9px] sm:text-[10px] text-gray-400 uppercase tracking-wide">Total Earned</span>
                      </>
                    ) : (
                      <>
                        <span className="text-[14px] sm:text-[16px] font-semibold text-gray-400">No data</span>
                        <span className="text-[9px] sm:text-[10px] text-gray-300 uppercase tracking-wide">This month</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Recent Transactions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="bg-white rounded-2xl p-3 sm:p-5 shadow-sm flex-1"
            >
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="text-[13px] sm:text-[14px] font-semibold text-gray-900">Recent Transactions</h3>
                {allTransactions.length > 0 && (
                  <button
                    onClick={() => setShowAllTransactions(true)}
                    className="text-[11px] text-[#432874] hover:text-[#5a3a8a] font-medium"
                  >
                    View all
                  </button>
                )}
              </div>
              <div className="divide-y divide-gray-100">
                {allTransactions.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-gray-500 text-sm">No transactions yet</p>
                    <p className="text-gray-400 text-xs mt-1">Complete habits and tasks to see activity here</p>
                  </div>
                ) : (
                  allTransactions.slice(0, 8).map((item) => (
                    <div key={item.id} className="flex items-center justify-between py-2.5 first:pt-2 last:pb-0">
                      <p className="text-[12px] font-medium text-gray-700">{item.name}</p>
                      <div className={cn(
                        "flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold",
                        item.type === 'earned'
                          ? "bg-[#432874]/10 text-[#432874]"
                          : "bg-gray-100 text-gray-500"
                      )}>
                        <span>{item.type === 'earned' ? '+' : '-'}{item.amount}</span>
                        <Image src="/diamond.svg" alt="gem" width={10} height={10} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>

          </div>
        </div>
      </div>
    </div>
  );
}
