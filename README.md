# 院内問題ボード（dental-board）

さくら歯科クリニック向けの、院内で発生した問題を報告・共有・対応管理するツールです。Next.js（App Router）+ Neon（PostgreSQL）+ Vercel で構築しています。

- 公開URL: https://dental-board-five.vercel.app
- 図解（設計の意図まとめ）: https://yukunya1218-collab.github.io/dental-board/

## データベースの接続設定

このアプリはデータの保存に [Neon](https://neon.tech)（サーバーレスのPostgreSQL）を使っています。ローカルで動かす場合は、以下の環境変数が必要です。

| 環境変数名 | 内容 |
|---|---|
| `DATABASE_URL` | NeonのPostgres接続文字列（`postgresql://...`の形式） |

### ローカルでの設定手順

1. プロジェクト直下に `.env.local` を作成する（`.env.local.example` をコピーすると早い）
2. NeonダッシュボードでDBを作成し、接続文字列を取得する
3. `.env.local` に以下の形式で貼り付ける

```
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
```

4. 初回のみ、以下のエンドポイントにアクセスしてテーブル作成と初期データ投入を行う

```
http://localhost:3000/api/seed
```

### Vercel本番環境での設定

VercelのStorageタブから「Neon」を追加すると、`DATABASE_URL` を含む環境変数が自動でVercelプロジェクトに登録されます。手動で追加する場合は、Vercelプロジェクトの **Settings → Environment Variables** に同名の変数を設定してください。

`.env.local` はGitの管理対象外（`.gitignore`済み）のため、接続情報がリポジトリに含まれることはありません。

## データベースの構成

`problems`（問題）と `comments`（コメント）の2つの表を、`comments.problem_id` で1対多に紐づけています。詳しい設計意図は上記の図解ページを参照してください。

## 開発コマンド

```bash
npm install       # 依存パッケージのインストール
npm run dev       # 開発サーバー起動（http://localhost:3000）
npm run build     # 本番ビルド
```

---

以下は `create-next-app` が生成した標準のREADMEです。

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
