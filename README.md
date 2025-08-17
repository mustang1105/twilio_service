# Twilio Service - ビデオルームアプリケーション

Laravel 12 + React 19 + Twilioを使用したモダンなビデオルームサービスです。

## 🚀 技術スタック

### バックエンド
- **PHP 8.2+** - 最新のPHP機能を活用
- **Laravel 12** - 最新のLaravelフレームワーク
- **Twilio SDK** - ビデオ通話機能
- **MySQL** - データベース

### フロントエンド
- **React 19** - 最新のReact
- **TypeScript** - 型安全性
- **Tailwind CSS 4** - モダンなCSSフレームワーク
- **Radix UI** - アクセシブルなUIコンポーネント
- **Vite** - 高速なビルドツール

### インフラ
- **Docker** - コンテナ化された開発環境
- **Nginx** - Webサーバー
- **PHP-FPM** - PHP実行環境
- **Node.js** - フロントエンドビルド環境

## 📋 必要条件

- Docker & Docker Compose
- PHP 8.2+
- Composer
- Node.js 18+
- npm または yarn
- Twilioアカウント
  - Account SID
  - Auth Token
  - API Key
  - API Secret

## 🛠️ セットアップ

### 1. リポジトリのクローン
```bash
git clone git@github.com:mustang1105/twilio_service.git
cd twilio_service
```

### 2. 環境設定
```bash
cp .env.example .env
```

`.env`ファイルに以下の設定を追加してください：
```env
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_API_KEY=your_twilio_api_key
TWILIO_API_SECRET=your_twilio_api_secret
```

### 3. Docker環境の起動
```bash
docker-compose up -d
```

### 4. 依存関係のインストール
```bash
# PHP依存関係
docker compose exec -it php-fpm composer install

# Node.js依存関係
docker compose run --rm nodejs npm install
```

### 5. アプリケーションキーの生成
```bash
docker compose exec -it php-fpm php artisan key:generate
```

### 6. データベースのマイグレーション
```bash
docker compose exec -it php-fpm php artisan migrate
```

### 7. フロントエンドのビルド
```bash
docker compose run --rm nodejs npm run build
```

## 🌐 アクセス

- **メインアプリケーション**: http://localhost:5556
- **ngrok**: http://localhost:4040

## 🔍 コード品質管理 (Lint)

このプロジェクトでは、PHPとTypeScriptの両方で包括的なコード品質管理が設定されています。<br>
Laravel12のデフォルト設定になります。

### **PHP Lint (Laravel Pint)**

#### **設定**
- **Laravel Pint 1.18** - PSR-12標準準拠
- **自動コード修正**機能
- **EditorConfig** - エディタ設定統一

#### **コマンド**
```bash
# コードスタイルチェック（修正なし）
docker compose exec -it php-fpm ./vendor/bin/pint --test

# コードスタイル自動修正
docker compose exec -it php-fpm ./vendor/bin/pint

# 特定ディレクトリのチェック
docker compose exec -it php-fpm ./vendor/bin/pint app/ --test
```

#### **チェック項目**
- インデント（スペース4文字）
- 改行コード（LF）
- 末尾スペース
- PSR-12準拠
- PHPコーディング規約

### **TypeScript/JavaScript Lint (ESLint + Prettier)**

#### **設定**
- **ESLint 9.17.0** - 最新版
- **TypeScript ESLint** - TypeScript対応
- **React ESLint** - React 19対応
- **Prettier 3.4.2** - コードフォーマッター

#### **コマンド**
```bash
# コードのlintと自動修正
docker compose run --rm nodejs npm run lint

# コードのフォーマット
docker compose run --rm nodejs npm run format

# フォーマットチェック（CI用）
docker compose run --rm nodejs npm run format:check

# TypeScriptの型チェック
docker compose run --rm nodejs npm run types
```

#### **ESLintルール**
- React 17+のJSX Runtime対応
- React Hooksのルール適用
- TypeScriptの推奨設定
- Prettierとの競合回避

### **CI/CD設定**

GitHub Actionsで自動lintチェックが実行されます：

```yaml
# .github/workflows/lint.yml
- name: Run Pint
  run: vendor/bin/pint

- name: Format Frontend
  run: npm run format

- name: Lint Frontend
  run: npm run lint
```

### **除外設定**

- **PHP**: `vendor/`, `node_modules/`, `public/`, `bootstrap/ssr/`
- **TypeScript**: `resources/js/components/ui/*`, `resources/js/ziggy.js`, `resources/views/mail/*`
