"use client";

import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Problem, Comment, Role } from "@/lib/data";
import { cn } from "@/lib/utils";
import { Send, MessageCircle, X, ChevronLeft, ChevronRight, ImageIcon } from "lucide-react";

const ROLE_COLORS: Record<Role, string> = {
  "院長": "bg-slate-200 text-slate-700",
  "副院長": "bg-stone-100 text-stone-600",
  "スタッフ": "bg-zinc-50 text-zinc-500",
};

const ROLE_AVATAR_BG: Record<Role, string> = {
  "院長": "bg-slate-600",
  "副院長": "bg-stone-500",
  "スタッフ": "bg-slate-400",
};

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

interface ProblemDetailProps {
  problem: Problem | null;
  onAddComment: (problemId: string, text: string) => void;
}

export function ProblemDetail({ problem, onAddComment }: ProblemDetailProps) {
  const [comment, setComment] = useState("");
  const [currentRole] = useState<Role>("スタッフ");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (!problem) {
    return (
      <div className="flex flex-col h-full items-center justify-center bg-white text-slate-400">
        <MessageCircle className="w-12 h-12 mb-3 opacity-30" />
        <p className="text-sm">問題を選んでください</p>
      </div>
    );
  }

  const handleSubmit = () => {
    const trimmed = comment.trim();
    if (!trimmed) return;
    onAddComment(problem.id, trimmed);
    setComment("");
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-200">
        <div className="flex items-start gap-2 mb-2">
          {problem.priority === "緊急" && (
            <Badge className="bg-amber-600 text-white shrink-0 mt-0.5">緊急</Badge>
          )}
          <h2 className="text-base font-bold text-slate-900 leading-snug">
            {problem.title}
          </h2>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", {
            "bg-red-100 text-red-700 border-red-200": problem.status === "未対応",
            "bg-yellow-100 text-yellow-700 border-yellow-200": problem.status === "対応中",
            "bg-green-100 text-green-700 border-green-200": problem.status === "確認待ち",
            "bg-slate-100 text-slate-500 border-slate-200": problem.status === "完了",
          })}>
            {problem.status}
          </span>
          <span className="text-xs text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-200">
            {problem.category}
          </span>
          <span className="text-xs text-slate-400">
            {problem.reportedBy}（{problem.reportedByRole}）が報告
          </span>
          <span className="text-xs text-slate-400">
            {formatDateTime(problem.createdAt)}
          </span>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-5 py-4 space-y-5">
          {/* Description */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">詳細</p>
            <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 rounded-lg p-3 border border-slate-100">
              {problem.description}
            </p>
          </div>

          {/* Images */}
          {(problem.images ?? []).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                <ImageIcon className="w-3.5 h-3.5" />
                添付写真（{problem.images.length}枚）
              </p>
              <div className="flex gap-2 flex-wrap">
                {(problem.images ?? []).map((url, i) => (
                  <button
                    key={i}
                    onClick={() => setLightboxIndex(i)}
                    className="w-24 h-24 rounded-lg overflow-hidden border border-slate-200 hover:border-slate-400 transition-colors shrink-0 focus:outline-none focus:ring-2 focus:ring-slate-300"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`添付${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Comments */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              コメント（{problem.comments.length}件）
            </p>
            {problem.comments.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">まだコメントはありません</p>
            )}
            <div className="space-y-3">
              {problem.comments.map((c: Comment) => (
                <div key={c.id} className="flex gap-3">
                  <Avatar className="w-8 h-8 shrink-0">
                    <AvatarFallback className={cn("text-white text-xs", ROLE_AVATAR_BG[c.role])}>
                      {c.author.slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-slate-900">{c.author}</span>
                      <Badge variant="outline" className={cn("text-xs py-0 px-1.5 h-4", ROLE_COLORS[c.role])}>
                        {c.role}
                      </Badge>
                      <span className="text-xs text-slate-400">{formatDateTime(c.createdAt)}</span>
                    </div>
                    <p className="text-sm text-slate-700 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                      {c.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Comment input */}
      <div className="px-5 py-4 border-t border-slate-200 bg-slate-50">
        <Textarea
          placeholder="コメントを入力..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSubmit();
          }}
          className="resize-none text-sm min-h-[60px] bg-white w-full"
          rows={2}
        />
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-slate-400">Ctrl+Enter でも送信できます</p>
          <Button
            onClick={handleSubmit}
            disabled={!comment.trim()}
            size="sm"
            className="bg-slate-700 hover:bg-slate-800 text-white"
          >
            <Send className="w-3.5 h-3.5 mr-1.5" />
            送信
          </Button>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (problem.images ?? []).length > 0 && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center"
          onClick={() => setLightboxIndex(null)}
        >
          {/* Close */}
          <button
            className="absolute top-4 right-4 w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors"
            onClick={() => setLightboxIndex(null)}
          >
            <X className="w-5 h-5" />
          </button>

          {/* Prev */}
          {(problem.images ?? []).length > 1 && (
            <button
              className="absolute left-4 w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex((prev) =>
                  prev === null ? 0 : (prev - 1 + problem.images.length) % problem.images.length
                );
              }}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          {/* Image */}
          <div onClick={(e) => e.stopPropagation()} className="max-w-[90vw] max-h-[85vh]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={(problem.images ?? [])[lightboxIndex]}
              alt={`添付${lightboxIndex + 1}`}
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
            />
            <p className="text-center text-white/60 text-sm mt-2">
              {lightboxIndex + 1} / {(problem.images ?? []).length}
            </p>
          </div>

          {/* Next */}
          {(problem.images ?? []).length > 1 && (
            <button
              className="absolute right-4 w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex((prev) =>
                  prev === null ? 0 : (prev + 1) % problem.images.length
                );
              }}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
