"use client";

import { useState, useEffect, useCallback } from "react";
import { NavPane } from "@/components/NavPane";
import { ProblemList } from "@/components/ProblemList";
import { ProblemDetail } from "@/components/ProblemDetail";
import { ActionPane } from "@/components/ActionPane";
import { AddProblemModal } from "@/components/AddProblemModal";
import { Problem, Status, Category, Comment } from "@/lib/data";

export default function Home() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<Status | null>(null);
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<"list" | "detail">("list");

  const fetchProblems = useCallback(async () => {
    try {
      const res = await fetch("/api/problems");
      if (!res.ok) throw new Error("fetch failed");
      const data: Problem[] = await res.json();
      setProblems(data);
      if (data.length > 0 && !selectedId) {
        setSelectedId(data[0].id);
      }
    } catch (err) {
      console.error("問題の取得に失敗しました", err);
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    fetchProblems();
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const handleUrgentFilter = () => {
    setUrgentOnly(true);
    setSelectedCategory(null);
    setSelectedStatus(null);
  };

  const handleClearUrgent = () => setUrgentOnly(false);

  const selectedProblem = problems.find((p) => p.id === selectedId) ?? null;

  const handleSelectProblem = (id: string) => {
    setSelectedId(id);
    setMobileTab("detail");
  };

  const handleAddProblem = async (data: Omit<Problem, "id" | "comments" | "createdAt">) => {
    try {
      const res = await fetch("/api/problems", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("POST failed");
      const newProblem: Problem = await res.json();
      setProblems((prev) => [newProblem, ...prev]);
      setSelectedId(newProblem.id);
    } catch (err) {
      console.error("問題の登録に失敗しました", err);
    }
  };

  const handleAddComment = async (problemId: string, text: string) => {
    try {
      const res = await fetch(`/api/problems/${problemId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error("POST comment failed");
      const newComment: Comment = await res.json();
      setProblems((prev) =>
        prev.map((p) =>
          p.id === problemId
            ? { ...p, comments: [...p.comments, newComment] }
            : p
        )
      );
    } catch (err) {
      console.error("コメントの追加に失敗しました", err);
    }
  };

  const handleStatusChange = async (id: string, status: Status) => {
    setProblems((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
    try {
      const res = await fetch(`/api/problems/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("PATCH failed");
    } catch (err) {
      console.error("ステータスの更新に失敗しました", err);
      fetchProblems();
    }
  };

  const handleAssigneeChange = async (id: string, assignee: string | null) => {
    setProblems((prev) => prev.map((p) => (p.id === id ? { ...p, assignee } : p)));
    try {
      const res = await fetch(`/api/problems/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignee }),
      });
      if (!res.ok) throw new Error("PATCH failed");
    } catch (err) {
      console.error("担当者の更新に失敗しました", err);
      fetchProblems();
    }
  };

  const handleDeadlineChange = async (id: string, deadline: string | null) => {
    setProblems((prev) => prev.map((p) => (p.id === id ? { ...p, deadline } : p)));
    try {
      const res = await fetch(`/api/problems/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deadline }),
      });
      if (!res.ok) throw new Error("PATCH failed");
    } catch (err) {
      console.error("期限の更新に失敗しました", err);
      fetchProblems();
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-100">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
          <span className="text-sm">読み込み中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-slate-100">
      {/* ===== DESKTOP LAYOUT (md+) ===== */}
      <div className="hidden md:flex h-full">
        {/* Pane 1: Nav */}
        <div className="w-52 shrink-0 h-full overflow-hidden">
          <NavPane
            problems={problems}
            selectedCategory={selectedCategory}
            selectedStatus={selectedStatus}
            onCategoryChange={(c) => { setSelectedCategory(c); setUrgentOnly(false); }}
            onStatusChange={(s) => { setSelectedStatus(s); setUrgentOnly(false); }}
          />
        </div>

        {/* Pane 2: Problem List */}
        <div className="w-72 shrink-0 h-full overflow-hidden">
          <ProblemList
            problems={problems}
            selectedId={selectedId}
            selectedCategory={selectedCategory}
            selectedStatus={selectedStatus}
            urgentOnly={urgentOnly}
            onSelect={handleSelectProblem}
            onAdd={() => setAddModalOpen(true)}
            onUrgentFilter={handleUrgentFilter}
            onClearUrgent={handleClearUrgent}
          />
        </div>

        {/* Pane 3: Detail */}
        <div className="flex-1 min-w-0 h-full overflow-hidden">
          <ProblemDetail
            problem={selectedProblem}
            onAddComment={handleAddComment}
          />
        </div>

        {/* Pane 4: Action */}
        <div className="w-64 shrink-0 h-full overflow-hidden">
          <ActionPane
            problem={selectedProblem}
            onStatusChange={handleStatusChange}
            onAssigneeChange={handleAssigneeChange}
            onDeadlineChange={handleDeadlineChange}
          />
        </div>
      </div>

      {/* ===== MOBILE LAYOUT (< md) ===== */}
      <div className="flex md:hidden flex-col h-full">
        {/* Mobile tab bar */}
        <div className="flex border-b border-slate-200 bg-white shrink-0">
          <button
            onClick={() => setMobileTab("list")}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              mobileTab === "list"
                ? "text-slate-800 border-b-2 border-slate-700"
                : "text-slate-500"
            }`}
          >
            問題一覧
          </button>
          <button
            onClick={() => setMobileTab("detail")}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              mobileTab === "detail"
                ? "text-slate-800 border-b-2 border-slate-700"
                : "text-slate-500"
            }`}
          >
            詳細・対応
          </button>
        </div>

        {/* Mobile: List view */}
        {mobileTab === "list" && (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Category filter chips */}
            <div className="px-3 py-2 bg-white border-b border-slate-200 overflow-x-auto">
              <div className="flex gap-1.5 min-w-max">
                <button
                  onClick={() => { setSelectedCategory(null); setSelectedStatus(null); }}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    !selectedCategory && !selectedStatus
                      ? "bg-slate-700 text-white border-slate-700"
                      : "bg-white text-slate-600 border-slate-200"
                  }`}
                >
                  すべて
                </button>
                {(["未対応", "対応中", "確認待ち", "完了"] as Status[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => { setSelectedStatus(selectedStatus === s ? null : s); setSelectedCategory(null); }}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      selectedStatus === s
                        ? "bg-slate-700 text-white border-slate-700"
                        : "bg-white text-slate-600 border-slate-200"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <ProblemList
                problems={problems}
                selectedId={selectedId}
                selectedCategory={selectedCategory}
                selectedStatus={selectedStatus}
                urgentOnly={urgentOnly}
                onSelect={handleSelectProblem}
                onAdd={() => setAddModalOpen(true)}
                onUrgentFilter={handleUrgentFilter}
                onClearUrgent={handleClearUrgent}
              />
            </div>
          </div>
        )}

        {/* Mobile: Detail + Action stacked */}
        {mobileTab === "detail" && (
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-hidden">
              <ProblemDetail
                problem={selectedProblem}
                onAddComment={handleAddComment}
              />
            </div>
            {selectedProblem && (
              <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-slate-400 mb-1">ステータス</p>
                    <select
                      className="w-full text-sm border border-slate-200 rounded-md px-2 py-1.5 bg-white"
                      value={selectedProblem.status}
                      onChange={(e) => handleStatusChange(selectedProblem.id, e.target.value as Status)}
                    >
                      {(["未対応", "対応中", "確認待ち", "完了"] as Status[]).map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1">担当者</p>
                    <select
                      className="w-full text-sm border border-slate-200 rounded-md px-2 py-1.5 bg-white"
                      value={selectedProblem.assignee ?? "none"}
                      onChange={(e) => handleAssigneeChange(selectedProblem.id, e.target.value === "none" ? null : e.target.value)}
                    >
                      <option value="none">未割り当て</option>
                      {["田中さん", "佐藤さん", "鈴木さん", "伊藤さん", "高橋院長", "山本副院長"].map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <AddProblemModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onAdd={handleAddProblem}
      />
    </div>
  );
}
