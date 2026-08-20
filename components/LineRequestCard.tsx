"use client";

import { AlertTriangle, Check, Clock, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { jstDateKey } from "@/lib/line/time";
import { REQUEST_STATUSES, type LineRequestView, type RequestStatus } from "@/lib/line/types";

const STATUS_STYLES: Record<RequestStatus, string> = {
  "依頼済": "bg-red-100 text-red-700 border-red-200",
  "受領": "bg-yellow-100 text-yellow-700 border-yellow-200",
  "完了": "bg-slate-100 text-slate-500 border-slate-200",
};

const STATUS_HINTS: Record<RequestStatus, string> = {
  "依頼済": "まだ反応がありません",
  "受領": "返事はあったが完了報告なし",
  "完了": "完了",
};

interface LineRequestCardProps {
  request: LineRequestView;
  busy: boolean;
  onStatusChange: (id: string, status: RequestStatus) => void;
  onDismiss: (id: string, dismissed: boolean) => void;
  onDeadlineChange: (id: string, deadline: string | null) => void;
}

export function LineRequestCard({
  request,
  busy,
  onStatusChange,
  onDismiss,
  onDeadlineChange,
}: LineRequestCardProps) {
  const deadlineValue = request.deadline ? jstDateKey(new Date(request.deadline)) : "";
  const inactive = request.dismissed || request.status === "完了";

  return (
    <div
      className={cn(
        "rounded-xl border bg-white p-4 transition-colors",
        request.stalled && !inactive
          ? "border-amber-300 border-l-4 border-l-amber-500 shadow-sm"
          : "border-slate-200",
        inactive && "opacity-60"
      )}
    >
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <span
          className={cn(
            "text-sm px-2.5 py-0.5 rounded-full border font-semibold",
            STATUS_STYLES[request.status]
          )}
        >
          {request.status}
        </span>
        {request.stalled && !inactive && (
          <span className="flex items-center gap-1 text-sm px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 font-semibold">
            <AlertTriangle className="w-3.5 h-3.5" />
            {request.overdue ? "期限切れ" : `${request.stalledDays}日動きなし`}
          </span>
        )}
        {request.dismissed && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
            依頼じゃない
          </span>
        )}
        {request.enteredManually && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
            手動入力
          </span>
        )}
      </div>

      <p className="text-base text-slate-900 leading-relaxed whitespace-pre-wrap break-words">
        {request.body}
      </p>

      <div className="mt-2 flex items-center gap-3 flex-wrap text-xs text-slate-500">
        <span>{request.requester}</span>
        <span>{jstDateKey(new Date(request.createdAt))} 依頼</span>
        <span>{STATUS_HINTS[request.status]}</span>
      </div>

      {request.aiReason && (
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
          <Sparkles className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-600 leading-relaxed">
            {request.aiReason}
            {request.confidence !== null && (
              <span className="text-slate-400">（確度 {Math.round(request.confidence * 100)}%）</span>
            )}
          </p>
        </div>
      )}

      <div className="mt-3 flex items-center gap-2 flex-wrap">
        <label className="flex items-center gap-1.5 text-xs text-slate-500">
          <Clock className="w-3.5 h-3.5" />
          期限
          <input
            type="date"
            value={deadlineValue}
            disabled={busy}
            onChange={(e) => onDeadlineChange(request.id, e.target.value || null)}
            className="text-sm border border-slate-200 rounded-md px-2 py-1.5 bg-white text-slate-800"
          />
        </label>
        <select
          value={request.status}
          disabled={busy}
          onChange={(e) => onStatusChange(request.id, e.target.value as RequestStatus)}
          className="text-sm border border-slate-200 rounded-md px-2 py-1.5 bg-white text-slate-800"
        >
          {REQUEST_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-3 flex items-center gap-2 flex-wrap">
        {request.status !== "完了" && (
          <Button
            size="lg"
            disabled={busy}
            onClick={() => onStatusChange(request.id, "完了")}
            className="bg-slate-700 hover:bg-slate-800 text-white"
          >
            <Check className="w-4 h-4 mr-1" />
            完了にする
          </Button>
        )}
        <Button
          size="lg"
          variant="outline"
          disabled={busy}
          onClick={() => onDismiss(request.id, !request.dismissed)}
        >
          <X className="w-4 h-4 mr-1" />
          {request.dismissed ? "依頼に戻す" : "これは依頼じゃない"}
        </Button>
      </div>
    </div>
  );
}
