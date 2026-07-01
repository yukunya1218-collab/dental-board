"use client";

import { Problem, Status, STATUSES, STAFF_MEMBERS } from "@/lib/data";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Calendar,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertTriangle,
  CircleDot,
} from "lucide-react";

const STATUS_ICONS: Record<Status, React.ReactNode> = {
  "未対応": <CircleDot className="w-4 h-4 text-red-500" />,
  "対応中": <ArrowRight className="w-4 h-4 text-yellow-500" />,
  "確認待ち": <AlertTriangle className="w-4 h-4 text-green-600" />,
  "完了": <CheckCircle2 className="w-4 h-4 text-slate-400" />,
};

const STATUS_BG: Record<Status, string> = {
  "未対応": "bg-red-100 text-red-700",
  "対応中": "bg-yellow-100 text-yellow-700",
  "確認待ち": "bg-green-100 text-green-700",
  "完了": "bg-slate-100 text-slate-500",
};

interface ActionPaneProps {
  problem: Problem | null;
  onStatusChange: (id: string, status: Status) => void;
  onAssigneeChange: (id: string, assignee: string | null) => void;
  onDeadlineChange: (id: string, deadline: string | null) => void;
}

function formatDeadline(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(iso);
  target.setHours(0, 0, 0, 0);
  const diff = Math.ceil((target.getTime() - now.getTime()) / 86400000);
  const label = `${d.getMonth() + 1}/${d.getDate()}`;
  if (diff < 0) return { label, sub: `${Math.abs(diff)}日超過`, overdue: true, today: false };
  if (diff === 0) return { label, sub: "今日が期限！", overdue: false, today: true };
  return { label, sub: `あと${diff}日`, overdue: false, today: false };
}

export function ActionPane({ problem, onStatusChange, onAssigneeChange, onDeadlineChange }: ActionPaneProps) {
  if (!problem) {
    return (
      <div className="flex flex-col h-full items-center justify-center bg-white border-l border-slate-200 text-slate-400 p-6">
        <p className="text-sm text-center">左の一覧から<br />問題を選んでください</p>
      </div>
    );
  }

  const deadline = formatDeadline(problem.deadline);

  return (
    <div className="flex flex-col h-full bg-white border-l border-slate-200">
      <div className="px-4 py-3 border-b border-slate-200">
        <h3 className="text-sm font-semibold text-slate-900">対応管理</h3>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">

        {/* Status */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <CircleDot className="w-3.5 h-3.5 text-slate-400" />
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">ステータス</p>
          </div>
          <Select
            value={problem.status}
            onValueChange={(v) => onStatusChange(problem.id, v as Status)}
          >
            <SelectTrigger className="w-full h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  <div className="flex items-center gap-2">
                    {STATUS_ICONS[s]}
                    {s}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status flow indicator */}
          <div className="mt-2 flex items-center justify-between text-xs">
            {STATUSES.map((s, i) => (
              <div key={s} className="flex items-center">
                <span className={cn("px-1.5 py-0.5 rounded text-xs font-medium", problem.status === s ? STATUS_BG[s] : "text-slate-300")}>
                  {s}
                </span>
                {i < STATUSES.length - 1 && (
                  <ArrowRight className="w-3 h-3 text-slate-200 mx-0.5" />
                )}
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Assignee */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">担当者</p>
          </div>
          <Select
            value={problem.assignee ?? "none"}
            onValueChange={(v) => onAssigneeChange(problem.id, v === "none" ? null : v)}
          >
            <SelectTrigger className="w-full h-9 text-sm">
              <SelectValue placeholder="未割り当て" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">
                <span className="text-slate-400">未割り当て</span>
              </SelectItem>
              {STAFF_MEMBERS.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Deadline */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">期限</p>
          </div>
          <input
            type="date"
            className={cn(
              "w-full h-9 px-3 text-sm border rounded-md focus:outline-none focus:ring-2",
              deadline?.today
                ? "border-red-300 bg-red-50 text-red-700 focus:ring-red-200"
                : deadline?.overdue
                ? "border-amber-300 bg-amber-50 text-amber-700 focus:ring-amber-200"
                : "border-slate-200 bg-white focus:ring-slate-300"
            )}
            value={problem.deadline ?? ""}
            onChange={(e) => onDeadlineChange(problem.id, e.target.value || null)}
          />
          {deadline && (
            <div className={cn(
              "mt-1.5 flex items-center gap-1 text-xs font-medium",
              deadline.today ? "text-red-600" : deadline.overdue ? "text-amber-700" : "text-slate-500"
            )}>
              <Clock className="w-3 h-3" />
              <span>{deadline.sub}</span>
            </div>
          )}
        </div>

        <Separator />

        {/* Summary */}
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">情報</p>
          <div className="space-y-2 text-xs text-slate-600">
            <div className="flex justify-between">
              <span className="text-slate-400">報告者</span>
              <span>{problem.reportedBy}（{problem.reportedByRole}）</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">優先度</span>
              <Badge className={cn("text-xs py-0", problem.priority === "緊急" ? "bg-amber-600 text-white" : "bg-slate-100 text-slate-500")}>
                {problem.priority}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">カテゴリ</span>
              <span>{problem.category}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
