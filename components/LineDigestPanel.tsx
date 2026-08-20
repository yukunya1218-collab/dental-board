"use client";

import { useState } from "react";
import { CheckCircle2, ChevronDown, Send, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatJstDateTime } from "@/lib/line/time";
import type { DigestLogView } from "@/lib/line/types";

const SECRET_STORAGE_KEY = "line-board-secret";

interface LineDigestPanelProps {
  logs: DigestLogView[];
  preview: string;
  onDigestSent?: () => void;
}

export function LineDigestPanel({ logs, preview, onDigestSent }: LineDigestPanelProps) {
  const [openPreview, setOpenPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<string | null>(null);

  const handleTrySend = async () => {
    const secret = sessionStorage.getItem(SECRET_STORAGE_KEY) ?? "";
    if (!secret) {
      setSendResult("下の取り込み欄で CRON_SECRET を一度入力してください");
      return;
    }

    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch("/api/digest", {
        method: "POST",
        headers: { "x-cron-secret": secret },
      });
      const data = await res.json();
      if (res.ok) {
        setSendResult(`送信成功（${data.itemCount ?? 0}件をLINEに投稿）`);
        onDigestSent?.();
      } else {
        setSendResult(data.detail ?? data.error ?? "送信に失敗しました");
        onDigestSent?.();
      }
    } catch {
      setSendResult("通信に失敗しました");
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <div className="px-4 py-3 border-b border-slate-200 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">毎日21:30の投稿</h2>
          <p className="text-xs text-slate-500">Botがちゃんと送れているかを確認できます</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={sending}
          onClick={handleTrySend}
          className="shrink-0"
        >
          <Send className="w-3.5 h-3.5 mr-1" />
          {sending ? "送信中..." : "今すぐ試す"}
        </Button>
      </div>

      {sendResult && (
        <p className="px-4 py-2 text-xs text-slate-600 bg-slate-50 border-b border-slate-200">{sendResult}</p>
      )}

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
