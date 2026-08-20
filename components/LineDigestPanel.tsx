"use client";

import { useState } from "react";
import { CheckCircle2, ChevronDown, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatJstDateTime } from "@/lib/line/time";
import type { DigestLogView } from "@/lib/line/types";

interface LineDigestPanelProps {
  logs: DigestLogView[];
  preview: string;
}

export function LineDigestPanel({ logs, preview }: LineDigestPanelProps) {
  const [openPreview, setOpenPreview] = useState(false);

  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <div className="px-4 py-3 border-b border-slate-200">
        <h2 className="text-sm font-semibold text-slate-900">毎日21:30の投稿</h2>
        <p className="text-xs text-slate-500">Botがちゃんと送れているかを確認できます</p>
      </div>

      <div className="px-4 py-3 border-b border-slate-200">
        <button
          onClick={() => setOpenPreview((v) => !v)}
          className="flex items-center gap-1.5 text-sm font-medium text-slate-700"
        >
          <ChevronDown className={cn("w-4 h-4 transition-transform", openPreview && "rotate-180")} />
          いま送られる本文を見る
        </button>
        {openPreview && (
          <pre className="mt-2 whitespace-pre-wrap break-words rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-slate-700 leading-relaxed">
            {preview}
          </pre>
        )}
      </div>

      <div className="divide-y divide-slate-100">
        {logs.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-slate-400">まだ投稿の記録がありません</p>
        )}
        {logs.map((log) => (
          <div key={log.id} className="px-4 py-2.5 flex items-center gap-2">
            {log.succeeded ? (
              <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span className="text-sm text-slate-700 shrink-0">{formatJstDateTime(new Date(log.ranAt))}</span>
            <span className="text-xs text-slate-500 shrink-0">{log.itemCount}件</span>
            <span className="text-xs text-slate-400 shrink-0">
              HTTP {log.lineStatusCode ?? "—"}
            </span>
            {log.errorDetail && (
              <span className="text-xs text-red-600 truncate" title={log.errorDetail}>
                {log.errorDetail}
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
