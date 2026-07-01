export type Status = "未対応" | "対応中" | "確認待ち" | "完了";
export type Priority = "緊急" | "通常";
export type Category =
  | "機器・設備"
  | "患者対応"
  | "スタッフ間"
  | "業務フロー"
  | "在庫・発注";

export type Role = "院長" | "副院長" | "スタッフ";

export interface Comment {
  id: string;
  author: string;
  role: Role;
  text: string;
  createdAt: string;
}

export interface Problem {
  id: string;
  title: string;
  description: string;
  category: Category;
  status: Status;
  priority: Priority;
  assignee: string | null;
  reportedBy: string;
  reportedByRole: Role;
  createdAt: string;
  deadline: string | null;
  comments: Comment[];
  images: string[];
}

export const CATEGORIES: Category[] = [
  "機器・設備",
  "患者対応",
  "スタッフ間",
  "業務フロー",
  "在庫・発注",
];

export const STATUSES: Status[] = ["未対応", "対応中", "確認待ち", "完了"];

export const STAFF_MEMBERS = ["田中さん", "佐藤さん", "鈴木さん", "伊藤さん", "高橋院長", "山本副院長"];

export const INITIAL_PROBLEMS: Problem[] = [
  {
    id: "1",
    title: "3番チェアの吸引が弱い",
    description: "午後から3番チェアの吸引力が急に落ちた。フィルター清掃しても改善せず。次の患者さんに影響が出る前に確認してほしい。",
    category: "機器・設備",
    status: "対応中",
    priority: "緊急",
    assignee: "田中さん",
    reportedBy: "佐藤さん",
    reportedByRole: "スタッフ",
    createdAt: "2026-06-04T09:15:00",
    deadline: "2026-06-04",
    images: [],
    comments: [
      {
        id: "c1",
        author: "田中さん",
        role: "スタッフ",
        text: "メーカーに連絡しました。本日15時に来てもらえます。",
        createdAt: "2026-06-04T10:02:00",
      },
      {
        id: "c2",
        author: "高橋院長",
        role: "院長",
        text: "ありがとう。修理完了したら教えて。",
        createdAt: "2026-06-04T10:20:00",
      },
    ],
  },
  {
    id: "2",
    title: "山田さんへの説明が不十分だったとクレーム",
    description: "治療費の説明が足りなかったとのこと。次回来院時に丁寧に説明し直す予定。担当は鈴木さん。",
    category: "患者対応",
    status: "確認待ち",
    priority: "緊急",
    assignee: "鈴木さん",
    reportedBy: "鈴木さん",
    reportedByRole: "スタッフ",
    createdAt: "2026-06-03T16:30:00",
    deadline: "2026-06-06",
    images: [],
    comments: [
      {
        id: "c3",
        author: "山本副院長",
        role: "副院長",
        text: "次回の説明内容を事前に共有してください。一緒に確認します。",
        createdAt: "2026-06-03T18:00:00",
      },
    ],
  },
  {
    id: "3",
    title: "グローブMサイズの在庫が残り2箱",
    description: "発注ペースを考えると来週半ばには切れる。早めに発注が必要。",
    category: "在庫・発注",
    status: "未対応",
    priority: "通常",
    assignee: null,
    reportedBy: "伊藤さん",
    reportedByRole: "スタッフ",
    createdAt: "2026-06-04T08:00:00",
    deadline: "2026-06-07",
    images: [],
    comments: [],
  },
  {
    id: "4",
    title: "予約変更の連絡ルールが不明確",
    description: "スタッフによって患者さんへの連絡タイミングがバラバラ。統一ルールを作りたい。",
    category: "業務フロー",
    status: "未対応",
    priority: "通常",
    assignee: null,
    reportedBy: "高橋院長",
    reportedByRole: "院長",
    createdAt: "2026-06-02T11:00:00",
    deadline: null,
    images: [],
    comments: [
      {
        id: "c4",
        author: "山本副院長",
        role: "副院長",
        text: "他院のフローを参考にたたき台を作ってみます。",
        createdAt: "2026-06-02T14:30:00",
      },
    ],
  },
  {
    id: "5",
    title: "申し送りノートが読みにくいと声が上がっている",
    description: "手書き部分が判読しにくい。デジタル化を検討したい。",
    category: "スタッフ間",
    status: "完了",
    priority: "通常",
    assignee: "高橋院長",
    reportedBy: "田中さん",
    reportedByRole: "スタッフ",
    createdAt: "2026-05-28T09:00:00",
    deadline: null,
    images: [],
    comments: [
      {
        id: "c5",
        author: "高橋院長",
        role: "院長",
        text: "LINE WORKSのノート機能を試験導入することにした。来週から使ってみよう。",
        createdAt: "2026-06-01T12:00:00",
      },
    ],
  },
  {
    id: "6",
    title: "滅菌パックの封が甘い個体が出た",
    description: "今朝、滅菌済みのパックが完全に封じられていないものが2つ見つかった。使用前に確認する習慣を徹底する必要あり。",
    category: "機器・設備",
    status: "対応中",
    priority: "緊急",
    assignee: "佐藤さん",
    reportedBy: "伊藤さん",
    reportedByRole: "スタッフ",
    createdAt: "2026-06-04T07:45:00",
    deadline: "2026-06-05",
    images: [],
    comments: [],
  },
];
