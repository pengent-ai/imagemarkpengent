# ImageMarkPengent拡張機能の設計書

* 画像に赤い印や注釈を描ける
* いちいちEXECLなどを開いて画像を加工するのも面倒

## 機能一覧

| 分類   | 機能        | 説明                                     |
| ------ | ----------- | ---------------------------------------- |
| ビュー | WebView表示 | `.png/.jpg`ファイルを開くとWebViewで表示 |
| 機能   | マーク描画  | クリックしたところに記号を描画           |
|        | 保存機能    | 加工後に保存する(別名保存も対応)         |

最初は記号は丸のオブジェクトのみとする
※ 番号付きマーカーや矢印 も将来的に追加できるようにする



## 仕様について

### フォルダの構成
```txt
imagemarkpengent/
├── src/
│   └── extension.ts          # 拡張機能のメインエントリ
├── package.json              # 拡張機能の定義（コマンド、設定など）
├── tsconfig.json             # TypeScript設定
├── vsc-extension-quickstart.md  # チュートリアル的なREADME
└── .vscode/
```

---

## 開発ステップ

1. コマンドを登録し.png/.jpgファイルに対して有効にする
    - package.json に explorer/context のコマンドメニュー追加
    - 対象拡張子を`.png/.jpg`に限定する
2. WebView で画像を表示する処理を追加
    - コマンドからWebviewPanelを作成し画像を`<img>`として読み込む
    - canvas上に画像を描画してユーザーが上から描き込めるようにする
3. クリック位置に赤丸を描画できるようにする
    - WebView内でJavaScriptを使い`<canvas>`に描画する
    - 座標はクリックイベントで取得、再描画用に保持
4. 加工画像の保存機能を追加
    - 「保存」ボタンをWebView内に用意
    - `canvas.toDataURL()`を取得し、拡張機能に`vscode.postMessage()`で送信
    - 拡張機能側でファイル保存（別名保存もサポート）

### 
完璧なスタートです！  
以下に続きの「**開発ステップ**」とそれぞれの **具体的な手順** を設計書スタイルで追記します。

---

## 開発ステップ

### ステップ 1. コマンドを登録し `.png/.jpg` ファイルに対して有効にする  
- `package.json` に `explorer/context` のコマンドメニュー追加
- 対象拡張子を `.png` / `.jpg` に限定

### ステップ 2. WebView で画像を表示する処理を追加  
- コマンドから `WebviewPanel` を作成し画像を `<img>` として読み込み
- `canvas` 上に画像を描画して、ユーザーが上から描き込めるようにする

### ステップ 3. クリック位置に赤丸を描画できるようにする  
- WebView内で JavaScript を使い `<canvas>` に赤丸描画
- 座標はクリックイベントで取得、再描画用に保持

### ステップ 4. 加工画像の保存機能を追加  
- 「保存」ボタンをWebView内に用意
- `canvas.toDataURL()` を取得し、拡張機能に `vscode.postMessage()` で送信
- 拡張機能側でファイル保存（別名保存もサポート）

---

## 各ステップの具体的な手順

### コマンド登録（右クリックメニューに表示）

**package.json**
```json
"activationEvents": [
  "onCommand:imagemarkpengent.openImageEditor"
],
"contributes": {
  "commands": [
    {
      "command": "imagemarkpengent.openImageEditor",
      "title": "Open in ImageMarkPengent"
    }
  ],
  "menus": {
    "explorer/context": [
      {
        "command": "imagemarkpengent.openImageEditor",
        "when": "resourceExtname =~ /\\.(png|jpg|jpeg)$/",
        "group": "navigation"
      }
    ]
  }
}
```

---

### WebViewに画像表示

**extension.ts**

```ts
vscode.commands.registerCommand('imagemarkpengent.openImageEditor', (uri: vscode.Uri) => {
  const panel = vscode.window.createWebviewPanel(
    'imageEditor',
    'ImageMarkPengent',
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.file(path.dirname(uri.fsPath))]
    }
  );

  const imageSrc = panel.webview.asWebviewUri(uri);

  panel.webview.html = getWebviewContent(imageSrc.toString());
});
```

**getWebviewContent()**
```ts
function getWebviewContent(imageSrc: string): string {
  return `
    <html>
    <body>
      <canvas id="canvas"></canvas>
      <script>
        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.src = "${imageSrc}";
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
        };

        canvas.addEventListener('click', (e) => {
          const rect = canvas.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          ctx.beginPath();
          ctx.arc(x, y, 10, 0, 2 * Math.PI);
          ctx.strokeStyle = 'red';
          ctx.lineWidth = 2;
          ctx.stroke();
        });
      </script>
    </body>
    </html>
  `;
}
```

---

### 保存処理（vscode拡張から保存）

- WebView内に「保存」ボタン追加
- `canvas.toDataURL()` を取得し、`vscode.postMessage()` で送信
- `extension.ts` で受け取ってバイナリ化し、`fs.writeFile()` で保存


