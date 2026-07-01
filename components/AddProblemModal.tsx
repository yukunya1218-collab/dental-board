"use client";

import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORIES, Category, Priority, Problem, STAFF_MEMBERS, roleForStaffMember } from "@/lib/data";
import { cn } from "@/lib/utils";
import { ImagePlus, X } from "lucide-react";

const MAX_IMAGES = 3;
const REPORTER_STORAGE_KEY = "dental-board:last-reporter";

interface AddProblemModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (problem: Omit<Problem, "id" | "comments" | "createdAt">) => void;
}

export function AddProblemModal({ open, onClose, onAdd }: AddProblemModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category | "">("");
  const [priority, setPriority] = useState<Priority>("通常");
  const [images, setImages] = useState<string[]>([]);
  const [reporter, setReporter] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      const saved = typeof window !== "undefined" ? localStorage.getItem(REPORTER_STORAGE_KEY) : null;
      setReporter(saved && STAFF_MEMBERS.includes(saved) ? saved : "");
    }
  }, [open]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const remaining = MAX_IMAGES - images.length;
    const toAdd = files.slice(0, remaining);
    const urls = toAdd.map((f) => URL.createObjectURL(f));
    setImages((prev) => [...prev, ...urls]);
    e.target.value = "";
  };

  const removeImage = (index: number) => {
    setImages((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = () => {
    if (!title.trim() || !reporter) return;
    localStorage.setItem(REPORTER_STORAGE_KEY, reporter);
    onAdd({
      title: title.trim(),
      description: description.trim(),
      category: (category || "業務フロー") as Category,
      status: "未対応",
      priority,
      assignee: null,
      reportedBy: reporter,
      reportedByRole: roleForStaffMember(reporter),
      deadline: null,
      images,
    });
    setTitle("");
    setDescription("");
    setCategory("");
    setPriority("通常");
    setImages([]);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">問題を登録する</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          {/* Priority toggle - most prominent */}
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1.5">優先度</p>
            <div className="flex gap-2">
              {(["通常", "緊急"] as Priority[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className={cn(
                    "flex-1 py-2 rounded-lg text-sm font-medium border transition-colors",
                    priority === p
                      ? p === "緊急"
                        ? "bg-amber-600 text-white border-amber-600"
                        : "bg-slate-700 text-white border-slate-700"
                      : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                  )}
                >
                  {p === "緊急" ? "🚨 緊急" : "通常"}
                </button>
              ))}
            </div>
          </div>

          {/* Reporter - required */}
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1.5">
              報告者 <span className="text-amber-600">*</span>
            </p>
            <Select value={reporter} onValueChange={(v) => setReporter(v ?? "")}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="自分の名前を選択..." />
              </SelectTrigger>
              <SelectContent>
                {STAFF_MEMBERS.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-400 mt-1">ログインの代わりに、報告者を選んでください。次回から自動で選択されます。</p>
          </div>

          {/* Title - required */}
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1.5">
              タイトル <span className="text-amber-600">*</span>
            </p>
            <Input
              placeholder="例：3番チェアの吸引が弱い"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && title.trim() && reporter && handleSubmit()}
              className="text-sm"
            />
            <p className="text-xs text-slate-400 mt-1">これだけで登録できます。Enter で即登録。</p>
          </div>

          {/* Category - optional */}
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1.5">カテゴリ（省略可）</p>
            <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="選択..." />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description - optional */}
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1.5">詳細（省略可）</p>
            <Textarea
              placeholder="状況・経緯など..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="text-sm resize-none"
            />
          </div>

          {/* Image upload */}
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1.5">
              写真（省略可・最大{MAX_IMAGES}枚）
            </p>
            <div className="flex gap-2 flex-wrap">
              {images.map((url, i) => (
                <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-slate-200 shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`添付${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center transition-colors"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
              {images.length < MAX_IMAGES && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-20 h-20 rounded-lg border-2 border-dashed border-slate-300 hover:border-slate-400 flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-slate-500 transition-colors shrink-0"
                >
                  <ImagePlus className="w-5 h-5" />
                  <span className="text-xs">追加</span>
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImageSelect}
            />
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="outline" onClick={onClose} className="flex-1">
              キャンセル
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!title.trim() || !reporter}
              className="flex-1 bg-slate-700 hover:bg-slate-800 text-white"
            >
              登録する
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
