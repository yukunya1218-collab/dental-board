"use client";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CATEGORIES, STATUSES, Category, Status, Problem } from "@/lib/data";
import { cn } from "@/lib/utils";
import {
  Wrench,
  Users,
  MessageCircle,
  GitBranch,
  Package,
  LayoutGrid,
  AlertCircle,
} from "lucide-react";

const CATEGORY_ICONS: Record<Category, React.ReactNode> = {
  "機器・設備": <Wrench className="w-4 h-4" />,
  "患者対応": <Users className="w-4 h-4" />,
  "スタッフ間": <MessageCircle className="w-4 h-4" />,
  "業務フロー": <GitBranch className="w-4 h-4" />,
  "在庫・発注": <Package className="w-4 h-4" />,
};

const STATUS_COLORS: Record<Status, string> = {
  "未対応": "bg-red-100 text-red-700",
  "対応中": "bg-yellow-100 text-yellow-700",
  "確認待ち": "bg-green-100 text-green-700",
  "完了": "bg-slate-100 text-slate-500",
};

interface NavPaneProps {
  problems: Problem[];
  selectedCategory: Category | null;
  selectedStatus: Status | null;
  onCategoryChange: (c: Category | null) => void;
  onStatusChange: (s: Status | null) => void;
}

const STATUS_DOT: Record<Status, string> = {
  "未対応": "bg-red-500",
  "対応中": "bg-yellow-400",
  "確認待ち": "bg-green-500",
  "完了": "bg-slate-300",
};

export function NavPane({
  problems,
  selectedCategory,
  selectedStatus,
  onCategoryChange,
  onStatusChange,
}: NavPaneProps) {
  const countByStatus = (status: Status) =>
    problems.filter((p) => p.status === status).length;

  const statusCountsForCategory = (cat: Category) =>
    (["未対応", "対応中", "確認待ち"] as Status[])
      .map((s) => ({ status: s, count: problems.filter((p) => p.category === cat && p.status === s).length }))
      .filter((x) => x.count > 0);

  const urgentCount = problems.filter(
    (p) => p.priority === "緊急" && p.status !== "完了"
  ).length;

  return (
    <div className="flex flex-col h-full bg-white border-r border-slate-200">
      {/* Header */}
      <div className="px-4 py-4 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 leading-tight">院内問題ボード</h1>
            <p className="text-xs text-slate-500">さくら歯科クリニック</p>
          </div>
        </div>
        {urgentCount > 0 && (
          <div className="mt-3 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="text-xs text-amber-800 font-medium">
              緊急案件 {urgentCount}件
            </span>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="px-3 py-3 space-y-4">
          {/* All filter */}
          <button
            onClick={() => { onCategoryChange(null); onStatusChange(null); }}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left",
              !selectedCategory && !selectedStatus
                ? "bg-slate-100 text-slate-800 font-medium"
                : "text-slate-600 hover:bg-slate-50"
            )}
          >
            <LayoutGrid className="w-4 h-4" />
            すべて
            <Badge variant="secondary" className="ml-auto text-xs">
              {problems.filter((p) => p.status !== "完了").length}
            </Badge>
          </button>

          {/* Categories */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 mb-1">
              カテゴリ
            </p>
            <div className="space-y-0.5">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => { onCategoryChange(selectedCategory === cat ? null : cat); onStatusChange(null); }}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left",
                    selectedCategory === cat
                      ? "bg-slate-100 text-slate-800 font-medium"
                      : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  {CATEGORY_ICONS[cat]}
                  <span className="truncate">{cat}</span>
                  <div className="ml-auto flex items-center gap-1 shrink-0">
                    {statusCountsForCategory(cat).map(({ status, count }) => (
                      <span key={status} className="flex items-center gap-0.5 text-xs text-slate-500">
                        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", STATUS_DOT[status])} />
                        {count}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Statuses */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 mb-1">
              ステータス
            </p>
            <div className="space-y-0.5">
              {STATUSES.map((status) => (
                <button
                  key={status}
                  onClick={() => { onStatusChange(selectedStatus === status ? null : status); onCategoryChange(null); }}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left",
                    selectedStatus === status
                      ? "bg-slate-100 text-slate-800 font-medium"
                      : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <span className={cn("w-2 h-2 rounded-full shrink-0", {
                    "bg-red-500": status === "未対応",
                    "bg-yellow-400": status === "対応中",
                    "bg-green-500": status === "確認待ち",
                    "bg-slate-300": status === "完了",
                  })} />
                  {status}
                  <Badge variant="secondary" className="ml-auto text-xs shrink-0">
                    {countByStatus(status)}
                  </Badge>
                </button>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
