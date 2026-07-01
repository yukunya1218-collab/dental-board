"use client";

import { useState } from "react";
import { NavPane } from "@/components/NavPane";
import { ProblemList } from "@/components/ProblemList";
import { ProblemDetail } from "@/components/ProblemDetail";
import { ActionPane } from "@/components/ActionPane";
import { AddProblemModal } from "@/components/AddProblemModal";
import {
  Problem,
  Status,
  Category,
  Comment,
  INITIAL_PROBLEMS,
} from "@/lib/data";

export default function Home() {
  const [problems, setProblems] = useState<Problem[]>(INITIAL_PROBLEMS);
  const [selectedId, setSelectedId] = useState<string | null>("1");
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<Status | null>(null);
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  // mobile tab: "list" | "detail"
  const [mobileTab, setMobileTab] = useState<"list" | "detail">("list");

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

  const handleAddProblem = (data: Omit<Problem, "id" | "comments" | "createdAt">) => {
    const newProblem: Problem = {
      ...data,
      id: String(Date.now()),
      images: data.images ?? [],
      comments: [],
      createdAt: new Date().toISOString(),
    };
    setProblems((prev) => [newProblem, ...prev]);
    setSelectedId(newProblem.id);
  };

  const handleAddComment = (problemId: string, text: string) => {
    const newComment: Comment = {
      id: String(Date.now()),
      author: "あなた",
      role: "スタッフ",
      text,
      createdAt: new Date().toISOString(),
    };
    setProblems((prev) =>
      prev.map((p) =>
        p.id === problemId
          ? { ...p, comments: [...p.comments, newComment] }
          : p
      )
    );
  };

  const handleStatusChange = (id: string, status: Status) => {
    setProblems((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status } : p))
    );
  };

  const handleAssigneeChange = (id: string, assignee: string | null) => {
    setProblems((prev) =>
      prev.map((p) => (p.id === id ? { ...p, assignee } : p))
    );
  };

  const handleDeadlineChange = (id: string, deadline: string | null) => {
    setProblems((prev) =>
      prev.map((p) => (p.id === id ? { ...p, deadline } : p))
    );
  };

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
