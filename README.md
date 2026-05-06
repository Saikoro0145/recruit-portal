# recruit-hub

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

### 3. 環境変数を設定（オプション）

企業ごとのREADMEファイルをアプリと別ディレクトリで管理したい場合は `.env.local` を作成します。

```bash
cp .env.local.example .env.local
```

`.env.local` を編集して `RECRUIT_ROOT` にあなたのディレクトリパスを指定します。

```
RECRUIT_ROOT=/Users/yourname/Documents/recruit
```

設定しない場合は `recruit-portal/` の親ディレクトリがデフォルトになります。

### 4. 起動

```bash
npm run dev
```

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
