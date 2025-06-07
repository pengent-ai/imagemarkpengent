# ImageMarkPengent 実装タスク

## 0. チュートリアル：現状の拡張機能をビルド・実行する

1. 依存パッケージのインストール（初回のみ）
   ```sh
   yarn install
   ```
2. ビルド
   ```sh
   yarn compile
   ```
3. VSCodeでこのプロジェクト（imagemarkpengent）を開く
4. F5キー（または「実行とデバッグ」→「拡張機能のデバッグ」）で新しいVSCodeウィンドウが起動し、拡張機能が有効化される
5. コマンドパレット（Ctrl+Shift+P）で `Hello World` コマンドを実行できる




---

## 概要
VSCode拡張機能「ImageMarkPengent」の実装タスク一覧です。

---

## 実装ステップ

### 1. コマンド登録と右クリックメニュー対応
- [x] `package.json` にコマンドを登録する
- [x] `explorer/context` メニューに「Open in ImageMarkPengent」を追加
- [ ] 対象拡張子を `.png` / `.jpg` / `.jpeg` に限定

### 2. WebViewで画像表示
- [ ] コマンド実行時にWebViewパネルを開く
- [ ] 画像ファイルを `<img>` または `<canvas>` で表示
- [ ] 画像の上に描き込み可能な `canvas` を重ねる

### 3. 赤丸マーク描画機能
- [ ] WebView内でJavaScriptにより `<canvas>` へ赤丸を描画
- [ ] クリック座標を取得し、赤丸を描画・保持
- [ ] 複数マークの描画・再描画に対応

### 4. 加工画像の保存機能
- [ ] WebViewに「保存」ボタンを設置
- [ ] `canvas.toDataURL()` で画像データを取得
- [ ] `vscode.postMessage()` で拡張機能側に送信
- [ ] 拡張機能側でファイル保存（別名保存も対応）

---

## 今後の拡張案（任意）
- 番号付きマーカーや矢印の追加
- マークの色やサイズ変更
- Undo/Redo機能
- 他画像フォーマット対応 