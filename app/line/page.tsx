"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, MessageSquare, RefreshCw } from "lucide-react";
import { LineDigestPanel } from "@/components/LineDigestPanel";
import { LineImportPanel } from "@/components/LineImportPanel";
import { LineRequestCard } from "@/components/LineRequestCard";
import { Button } from "@/components/ui/button";
import type { DigestLogView, LineRequestView, RequestStatus } from "@/lib/line/types";

interface BoardData {
  requests: LineRequestView[];
  digestLogs: DigestLogView[];
  digestPreview: string;
}

export default function LineBoardPage() {
  const [data, setData] = useState<BoardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showClosed, setShowClosed] = useState(false);

  const fetchBoard = useCallback(async () => {
    try {
      const res = await fetch("/api/line/requests");
      if (!res.ok) throw new Error("fetch failed");
      setData(await res.json());
    } catch (err) {
      console.error("依頼の取得に失敗しました", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBoard();  // eslint-disable-line react-hooks/set-state-in-effect
  }, [fetchBoard]);

  const patchRequest = async (id: string, body: Record<string, unknown>) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/line/requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("PATCH failed");
      await fetchBoard();
    } catch (err) {
      console.error("依頼の更新に失敗しました", err);
      await fetchBoard();
    } finally {
      setBusyId(null);
    }
  };

  const handleStatusChange = (id: string, status: RequestStatus) => patchRequest(id, { status });
  const handleDismiss = (id: string, dismissed: boolean) => patchRequest(id, { dismissed });
  const handleDeadlineChange = (id: string, deadline: string | null) => patchRequest(id, { deadline });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
          <span className="text-sm">読み込み中...</span>
        </div>
      </div>
    );
  }

  const requests = data?.requests ?? [];
  const outstanding = requests.filter((r) => !r.dismissed && r.status !== "完了");
  const closed = requests.filter((r) => r.dismissed || r.status === "完了");
  const stalledCount = outstanding.filter((r) => r.stalled).length;

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 bg-slate-700 rounded-lg flex items-center justify-center shrink-0">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-slate-900 leading-tight">経営連絡ボード</h1>
            <p className="text-xs text-slate-500">LINEの依頼を自動で拾って、毎日21:30に未完了だけ通知します</p>
          </div>
          <Button size="sm" variant="ghost" onClick={fetchBoard} aria-label="再読み込み">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-xs text-slate-500">未完了の依頼</p>
            <p className="text-2xl font-bold text-slate-900">{outstanding.length}件</p>
          </div>
          <div
            className={
              stalledCount > 0
                ? "rounded-xl border border-amber-300 bg-amber-50 px-4 py-3"
                : "rounded-xl border border-slate-200 bg-white px-4 py-3"
            }
          >
            <p className="text-xs text-slate-500 flex items-center gap-1">
              {stalledCount > 0 && <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />}
              止まっているもの
            </p>
            <p className={stalledCount > 0 ? "text-2xl font-bold text-amber-800" : "text-2xl font-bold text-slate-900"}>
              {stalledCount}件
            </p>
          </div>
        </div>

        <section className="space-y-3">
          {outstanding.length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center">
              <p className="text-sm text-slate-500">未完了の依頼はありません</p>
            </div>
          )}
          {outstanding.map((request) => (
            <LineRequestCard
              key={request.id}
              request={request}
              busy={busyId === request.id}
              onStatusChange={handleStatusChange}
              onDismiss={handleDismiss}
              onDeadlineChange={handleDeadlineChange}
            />
          ))}
        </section>

        {closed.length > 0 && (
          <section className="space-y-3">
            <button
              onClick={() => setShowClosed((v) => !v)}
              className="text-sm font-medium text-slate-600"
            >
              {showClosed ? "終わった・除外したものを隠す" : `終わった・除外したものを見る（${closed.length}件）`}
            </button>
            {showClosed &&
              closed.map((request) => (
                <LineRequestCard
                  key={request.id}
                  request={request}
                  busy={busyId === request.id}
                  onStatusChange={handleStatusChange}
                  onDismiss={handleDismiss}
                  onDeadlineChange={handleDeadlineChange}
                />
              ))}
          </section>
        )}

        <LineDigestPanel logs={data?.digestLogs ?? []} preview={data?.digestPreview ?? ""} onDigestSent={fetchBoard} />

        <LineImportPanel onImported={fetchBoard} />

        <Link
          href="/"
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 pb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          院内問題ボードに戻る
        </Link>
      </main>
    </div>
  );
}
