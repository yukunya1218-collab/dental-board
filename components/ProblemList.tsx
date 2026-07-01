"use client";

import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Problem, Category, Status } from "@/lib/data";
import { cn } from "@/lib/utils";
import { MessageCircle, Clock, Plus, AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const STATUS_STYLES: Record<Status, string> = {
  "未対応": "bg-red-100 text-red-700 border-red-200",
  "対応中": "bg-yellow-100 text-yellow-700 border-yellow-200",
  "確認待ち": "bg-green-100 text-green-700 border-green-200",
  "完了": "bg-slate-100 text-slate-500 border-slate-200",
};

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffH = Math.floor(diffMs / 3600000);
  const diffD = Math.floor(diffMs / 86400000);
  if (diffH < 1) return "たった今";
  if (diffH < 24) return `${diffH}時間前`;
  if (diffD < 7) return `${diffD}日前`;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

interface ProblemListProps {
  problems: Problem[];
  selectedId: string | null;
  selectedCategory: Category | null;
  selectedStatus: Status | null;
  urgentOnly: boolean;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onUrgentFilter: () => void;
  onClearUrgent: () => void;
}

export function ProblemList({
  problems,
  selectedId,
  selectedCategory,
  selectedStatus,
  urgentOnly,
  onSelect,
  onAdd,
  onUrgentFilter,
  onClearUrgent,
}: ProblemListProps) {
  const totalUrgent = problems.filter(
    (p) => p.priority === "緊急" && p.status !== "完了"
  ).length;

  const filtered = problems.filter((p) => {
    if (urgentOnly) return p.priority === "緊急" && p.status !== "完了";
    if (selectedCategory && p.category !== selectedCategory) return false;
    if (selectedStatus && p.status !== selectedStatus) return false;
    return true;
  });

  const urgent = filtered.filter((p) => p.priority === "緊急" && p.status !== "完了");
  const normal = filtered.filter((p) => p.priority === "通常" || p.status === "完了");

  const renderCard = (problem: Problem) => (
    <button
      key={problem.id}
      onClick={() => onSelect(problem.id)}
      className={cn(
        "w-full text-left p-3 rounded-lg border transition-all",
        selectedId === problem.id
          ? "bg-slate-100 border-slate-400 shadow-sm"
          : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm"
      )}
    >
      <div className="flex items-start gap-2 mb-2">
        {problem.priority === "緊急" && (
          <span className="shrink-0 mt-0.5 w-2 h-2 rounded-full bg-amber-500" />
        )}
        <span className="text-sm font-medium text-slate-900 leading-snug flex-1">
          {problem.title}
        </span>
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", STATUS_STYLES[problem.status])}>
          {problem.status}
        </span>
        <span className="text-xs text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-200">
          {problem.category}
        </span>
      </div>
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-slate-400">{problem.reportedBy}</span>
        <div className="flex items-center gap-2">
          {problem.comments.length > 0 && (
            <span className="flex items-center gap-0.5 text-xs text-slate-400">
              <MessageCircle className="w-3 h-3" />
              {problem.comments.length}
            </span>
          )}
          {problem.deadline && problem.status !== "完了" && (
            <span className="flex items-center gap-0.5 text-xs text-slate-400">
              <Clock className="w-3 h-3" />
              {new Date(problem.deadline).getMonth() + 1}/{new Date(problem.deadline).getDate()}
            </span>
          )}
          <span className="text-xs text-slate-400">{formatDate(problem.createdAt)}</span>
        </div>
      </div>
    </button>
  );

  return (
    <div className="flex flex-col h-full bg-slate-50 border-r border-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">問題一覧</h2>
          <p className="text-xs text-slate-500">{filtered.length}件</p>
        </div>
        <Button size="sm" onClick={onAdd} className="bg-slate-700 hover:bg-slate-800 text-white h-8">
          <Plus className="w-4 h-4 mr-1" />
          問題を報告する
        </Button>
      </div>

      {/* Urgent banner */}
      {totalUrgent > 0 && (
        <button
          onClick={urgentOnly ? onClearUrgent : onUrgentFilter}
          className={cn(
            "w-full flex items-center gap-2 px-4 py-2.5 text-left transition-colors border-b",
            urgentOnly
              ? "bg-amber-100 border-amber-300"
              : "bg-amber-50 border-amber-200 hover:bg-amber-100"
          )}
        >
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span className="text-xs font-medium text-amber-800 flex-1">
            {urgentOnly
              ? `緊急案件のみ表示中（${totalUrgent}件）`
              : `今日中に対応が必要な緊急案件が${totalUrgent}件あります`}
          </span>
          {urgentOnly ? (
            <X className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          ) : (
            <span className="text-xs text-amber-600 shrink-0">絞り込む →</span>
          )}
        </button>
      )}

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {/* Urgent */}
          {urgent.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                緊急 {urgent.length}件
              </p>
              <div className="space-y-2">
                {urgent.map(renderCard)}
              </div>
            </div>
          )}

          {/* Normal */}
          {normal.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                通常
              </p>
              <div className="space-y-2">
                {normal.map(renderCard)}
              </div>
            </div>
          )}

          {filtered.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <p className="text-sm">該当する問題はありません</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
