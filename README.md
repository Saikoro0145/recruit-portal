# 概要

就活インターン管理アプリ。企業情報・締切・イベントをカレンダーとリストで一元管理できます。

## 機能

- カレンダービューで締切・インターン期間を可視化
- 企業ごとにメモ・アカウント情報・ファイルを管理
- 締切カウントダウン・日程重複警告
- 企業フィルタ（表示/非表示）
- マイページURL・ログインID管理（コピーボタン付き）
- 各企業フォルダ内のファイルを直接開く
- 業界カテゴリの追加・管理

## セットアップ

### 1. 依存パッケージをインストール

```bash
cd recruit-portal
npm install
```

### 2. データファイルを用意

```bash
cp -r src/data.example src/data
```

### 3. 環境変数を設定

```bash
cp .env.local.example .env.local
```

#### RECRUIT_ROOT（オプション）

企業ごとのREADMEファイルをアプリと別ディレクトリで管理したい場合は `RECRUIT_ROOT` を指定します。

```
RECRUIT_ROOT=/Users/yourname/Documents/recruit
```

設定しない場合は `recruit-portal/` の親ディレクトリがデフォルトになります。

#### RECRUIT_SECRET_KEY（必須・パスワード暗号化用）

`companies.json` に保存される企業マイページパスワードを AES-256-GCM で暗号化するための鍵。

```bash
npm run gen-key
```

出力された `RECRUIT_SECRET_KEY=...` の行を `.env.local` に貼り付けます。**この値は絶対に Git に commit しないこと**。

既に平文パスワードを登録済の場合は、鍵設定後に下記で一括暗号化できます:

```bash
npm run encrypt-existing
```

新規追加・編集時は自動で暗号化されます。

### 4.ビルド
```bash
npm run build
```

### 5. 起動

```bash
npm run start
```
※ Windowsの場合 Start_NextServer_rp.bat をスタートメニューから実行することでも起動できます

`http://localhost:3000` にアクセスします。

## ディレクトリ構成

```
recruit-portal/
├── src/
│   ├── app/           # ページ
│   ├── components/    # UIコンポーネント
│   ├── data/          # データファイル（gitignore対象）
│   ├── data.example/  # サンプルデータ
│   └── lib/           # データ読み書きロジック
└── .env.local.example
```

## 技術スタック

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui
- FullCalendar
