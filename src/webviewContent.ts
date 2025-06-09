export function getWebviewContent(imageSrc: string): string {
  return `
    <!DOCTYPE html>
    <html lang="ja">
    <head>
      <meta charset="UTF-8">
      <title>ImageMarkPengent</title>
      <style>
        html, body { height: 100%; margin: 0; padding: 0; overflow: hidden; }
        #toolbar {
          position: absolute;
          top: 10px;
          left: 10px;
          background: rgba(255,255,255,0.95);
          border-radius: 6px;
          box-shadow: 0 2px 8px #0002;
          padding: 8px 12px;
          z-index: 10;
          display: flex;
          gap: 8px;
          align-items: center;
          font-size: 14px;
        }
        #canvas { display: block; width: 100vw; height: 100vh; background: #222; cursor: grab; }
        .active-btn { background: #1976d2; color: #fff; border-radius: 4px; }
      </style>
    </head>
    <body>
      <div id="toolbar">
        <button id="moveBtn" class="active-btn">移動モード</button>
        <button id="selectBtn">選択モード</button>
        <button id="markBtn">マーク追加(Ctr+左クリック)</button>
        <button id="saveBtn">保存</button>
        <label>太さ:
          <select id="lineWidth">
            <option value="2">2px</option>
            <option value="4">4px</option>
            <option value="8">8px</option>
          </select>
        </label>
        <label>色:
          <input type="color" id="colorPicker" value="#ff0000" />
        </label>
      </div>
      <canvas id="canvas"></canvas>
      <script>
      const canvas = document.getElementById('canvas');
      const ctx = canvas.getContext('2d');
      let img = new Image();
      img.src = "${imageSrc}";

      // UI要素
      const moveBtn = document.getElementById('moveBtn');
      const selectBtn = document.getElementById('selectBtn');
      const markBtn = document.getElementById('markBtn');
      const lineWidthSelect = document.getElementById('lineWidth');
      const colorPicker = document.getElementById('colorPicker');
      const saveBtn = document.getElementById('saveBtn');

      // 状態
      let mode = 'move'; // 'move' or 'mark' or 'select'
      let scale = 1;
      let minScale = 0.1;
      let maxScale = 10;
      let offsetX = 0;
      let offsetY = 0;
      let isDragging = false;
      let dragStartX = 0;
      let dragStartY = 0;
      let lastOffsetX = 0;
      let lastOffsetY = 0;
      let ctrlPressed = false;
      // 図形移動用
      let isMarkMoving = false;
      let markMoveStart = null;
      let markMoveOrigin = null;
      // 図形リサイズ用
      let isMarkResizing = false;
      let resizeTarget = null; // {mark, handleIndex}
      let resizeStart = null; // {x, y, orig}

      // マーク（楕円）の配列
      let marks = [];
      // 一時的なマーク（ドラッグ中のプレビュー）
      let tempMark = null;
      let markStart = null;

      // 設定
      let markColor = colorPicker.value;
      let markLineWidth = parseInt(lineWidthSelect.value, 10);

      // VS Code API を一度だけ取得
      const vscode = window.acquireVsCodeApi ? window.acquireVsCodeApi() : null;

      // UIイベント
      moveBtn.onclick = () => setMode('move');
      selectBtn.onclick = () => setMode('select');
      markBtn.onclick = () => setMode('mark');
      lineWidthSelect.onchange = () => {
        markLineWidth = parseInt(lineWidthSelect.value, 10);
        let changed = false;
        for (const mark of marks) {
          if (mark.isSelected) {
            mark.lineWidth = markLineWidth;
            changed = true;
          }
        }
        if (changed) pushUndo();
        draw();
      };
      colorPicker.oninput = () => {
        markColor = colorPicker.value;
        let changed = false;
        for (const mark of marks) {
          if (mark.isSelected) {
            mark.color = markColor;
            changed = true;
          }
        }
        if (changed) pushUndo();
        draw();
      };
      saveBtn.onclick = () => {
        console.log('Save button onclick fired!');
        // 元画像サイズのオフスクリーンcanvasで保存
        const offCanvas = document.createElement('canvas');
        offCanvas.width = img.width;
        offCanvas.height = img.height;
        const offCtx = offCanvas.getContext('2d');
        offCtx.clearRect(0, 0, offCanvas.width, offCanvas.height);
        offCtx.drawImage(img, 0, 0);
        // マークを描画（ズーム・オフセットなし）
        for (const mark of marks) {
          drawEllipseRaw(offCtx, mark.x1, mark.y1, mark.x2, mark.y2, mark.color, mark.lineWidth);
        }
        const dataUrl = offCanvas.toDataURL('image/png');
        console.log('Data URL created, checking VSCode API...');
        if (vscode) {
          console.log('VSCode API available, sending message...');
          vscode.postMessage({ type: 'save-image', dataUrl });
          console.log('Message sent to extension');
        } else {
          console.log('VSCode API not available!');
        }
      };

      function setMode(newMode) {
        mode = newMode;
        moveBtn.classList.remove('active-btn');
        selectBtn.classList.remove('active-btn');
        markBtn.classList.remove('active-btn');
        if (mode === 'move') {
          moveBtn.classList.add('active-btn');
          canvas.style.cursor = 'grab';
        } else if (mode === 'select') {
          selectBtn.classList.add('active-btn');
          canvas.style.cursor = 'pointer';
        } else {
          markBtn.classList.add('active-btn');
          canvas.style.cursor = 'crosshair';
        }
        tempMark = null;
        markStart = null;
        // 選択解除
        if (mode !== 'select') {
          for (const mark of marks) mark.isSelected = false;
        }
        draw();
      }

      // Ctrlキー押下・離上で一時的にマーク追加モード
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Control') {
          ctrlPressed = true;
          canvas.style.cursor = 'crosshair';
        }
        if (e.key === 'Escape') {
          setMode('move');
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
          undo();
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
          redo();
        }
        // 選択モードでDeleteキー
        if (mode === 'select' && (e.key === 'Delete' || e.key === 'Backspace')) {
          const before = marks.length;
          const newMarks = marks.filter(m => !m.isSelected);
          if (newMarks.length !== marks.length) {
            pushUndo();
            marks = newMarks;
            draw();
          }
        }
      });
      window.addEventListener('keyup', (e) => {
        if (e.key === 'Control') {
          ctrlPressed = false;
          if (mode === 'move') canvas.style.cursor = 'grab';
        }
      });

      // リサイズ対応
      function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        draw();
      }
      window.addEventListener('resize', resizeCanvas);

      // 画像ロード後、初期ズーム・位置を計算
      img.onload = () => {
        const scaleX = canvas.width / img.width;
        const scaleY = canvas.height / img.height;
        scale = Math.min(scaleX, scaleY, 1);
        offsetX = (canvas.width - img.width * scale) / 2;
        offsetY = (canvas.height - img.height * scale) / 2;
        draw();
      };

      // 描画関数
      function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);
        ctx.drawImage(img, 0, 0);
        // マークをすべて描画
        for (const mark of marks) {
          drawEllipse(mark.x1, mark.y1, mark.x2, mark.y2, mark.color, mark.lineWidth);
          if (mark.isSelected) {
            drawEllipse(mark.x1, mark.y1, mark.x2, mark.y2, '#1976d2', (mark.lineWidth + 4), true);
            drawResizeHandles(mark);
          }
        }
        // プレビュー中のマーク
        if (tempMark) {
          drawEllipse(tempMark.x1, tempMark.y1, tempMark.x2, tempMark.y2, tempMark.color, tempMark.lineWidth, true);
        }
        ctx.restore();
      }

      function drawEllipse(x1, y1, x2, y2, color, lineWidth, dashed = false) {
        ctx.save();
        ctx.beginPath();
        const cx = (x1 + x2) / 2;
        const cy = (y1 + y2) / 2;
        const rx = Math.abs(x2 - x1) / 2;
        const ry = Math.abs(y2 - y1) / 2;
        ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth / scale;
        if (dashed) ctx.setLineDash([6 / scale, 6 / scale]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }

      // リサイズハンドル描画
      function drawResizeHandles(mark) {
        const handles = getHandlePositions(mark);
        for (const h of handles) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(h.x - 5, h.y - 5, 10, 10);
          ctx.fillStyle = '#fff';
          ctx.strokeStyle = '#1976d2';
          ctx.lineWidth = 2 / scale;
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }
      }
      // 四隅のハンドル座標取得
      function getHandlePositions(mark) {
        return [
          { x: mark.x1, y: mark.y1 }, // 左上
          { x: mark.x2, y: mark.y1 }, // 右上
          { x: mark.x2, y: mark.y2 }, // 右下
          { x: mark.x1, y: mark.y2 }, // 左下
        ];
      }
      // ハンドル上か判定
      function getHandleAt(x, y, mark) {
        const handles = getHandlePositions(mark);
        for (let i = 0; i < handles.length; i++) {
          const h = handles[i];
          if (Math.abs(x - h.x) < 10 / scale && Math.abs(y - h.y) < 10 / scale) {
            return i;
          }
        }
        return -1;
      }

      // ホイールでズーム
      canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const mouseX = e.offsetX;
        const mouseY = e.offsetY;
        const prevScale = scale;
        if (e.deltaY < 0) {
          scale *= 1.1;
        } else {
          scale /= 1.1;
        }
        scale = Math.max(minScale, Math.min(maxScale, scale));
        offsetX = mouseX - ((mouseX - offsetX) * (scale / prevScale));
        offsetY = mouseY - ((mouseY - offsetY) * (scale / prevScale));
        draw();
      }, { passive: false });

      // --- マーク追加モード or Ctrl+ドラッグで楕円追加 or 選択モードで選択 ---
      canvas.addEventListener('mousedown', (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left - offsetX) / scale;
        const y = (e.clientY - rect.top - offsetY) / scale;
        if (mode === 'mark' || ctrlPressed) {
          if (x >= 0 && y >= 0 && x <= img.width && y <= img.height) {
            markStart = { x1: x, y1: y };
            tempMark = { x1: x, y1: y, x2: x, y2: y, color: markColor, lineWidth: markLineWidth };
          }
        } else if (mode === 'select') {
          // 先にリサイズハンドル判定
          let resized = false;
          for (const mark of marks) {
            if (mark.isSelected) {
              const handleIdx = getHandleAt(x, y, mark);
              if (handleIdx !== -1) {
                isMarkResizing = true;
                resizeTarget = { mark, handleIdx };
                resizeStart = { x, y, orig: { x1: mark.x1, y1: mark.y1, x2: mark.x2, y2: mark.y2 } };
                resized = true;
                break;
              }
            }
          }
          if (resized) return;
          // 既存マークの選択判定
          let found = false;
          for (let i = marks.length - 1; i >= 0; i--) { // 上に描画されているもの優先
            const mark = marks[i];
            if (isPointInEllipse(x, y, mark)) {
              for (const m of marks) m.isSelected = false;
              mark.isSelected = true;
              found = true;
              // 選択中マークの移動開始
              isMarkMoving = true;
              markMoveStart = { x, y };
              // 複数選択対応のため配列で保存
              markMoveOrigin = marks.filter(m => m.isSelected).map(m => ({ x1: m.x1, y1: m.y1, x2: m.x2, y2: m.y2 }));
              break;
            }
          }
          if (!found) {
            for (const m of marks) m.isSelected = false;
            isMarkMoving = false;
            markMoveStart = null;
            markMoveOrigin = null;
          }
          draw();
        } else if (mode === 'move') {
          // 追加: マーク上なら選択モードに切り替え
          let found = false;
          for (let i = marks.length - 1; i >= 0; i--) {
            const mark = marks[i];
            if (isPointInEllipse(x, y, mark)) {
              for (const m of marks) m.isSelected = false;
              mark.isSelected = true;
              setMode('select');
              found = true;
              break;
            }
          }
          if (!found) {
            isDragging = true;
            dragStartX = e.clientX;
            dragStartY = e.clientY;
            lastOffsetX = offsetX;
            lastOffsetY = offsetY;
            canvas.style.cursor = 'grabbing';
          }
        }
      });
      window.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left - offsetX) / scale;
        const y = (e.clientY - rect.top - offsetY) / scale;
        if ((mode === 'mark' || ctrlPressed) && markStart) {
          tempMark = { x1: markStart.x1, y1: markStart.y1, x2: x, y2: y, color: markColor, lineWidth: markLineWidth };
          draw();
        } else if (mode === 'select' && isMarkResizing && resizeTarget && resizeStart) {
          // リサイズ処理
          const { mark, handleIdx } = resizeTarget;
          const dx = x - resizeStart.x;
          const dy = y - resizeStart.y;
          // ハンドルごとに座標を調整
          let { x1, y1, x2, y2 } = resizeStart.orig;
          if (handleIdx === 0) { // 左上
            mark.x1 = x1 + dx;
            mark.y1 = y1 + dy;
          } else if (handleIdx === 1) { // 右上
            mark.x2 = x2 + dx;
            mark.y1 = y1 + dy;
          } else if (handleIdx === 2) { // 右下
            mark.x2 = x2 + dx;
            mark.y2 = y2 + dy;
          } else if (handleIdx === 3) { // 左下
            mark.x1 = x1 + dx;
            mark.y2 = y2 + dy;
          }
          draw();
        } else if (mode === 'select' && isMarkMoving && markMoveStart && markMoveOrigin) {
          // 選択中図形の移動
          const dx = x - markMoveStart.x;
          const dy = y - markMoveStart.y;
          let idx = 0;
          for (let i = 0; i < marks.length; i++) {
            if (marks[i].isSelected) {
              const orig = markMoveOrigin[idx++];
              marks[i].x1 = orig.x1 + dx;
              marks[i].y1 = orig.y1 + dy;
              marks[i].x2 = orig.x2 + dx;
              marks[i].y2 = orig.y2 + dy;
            }
          }
          draw();
        } else if (mode === 'move' && isDragging) {
          offsetX = lastOffsetX + (e.clientX - dragStartX);
          offsetY = lastOffsetY + (e.clientY - dragStartY);
          draw();
        }
      });
      window.addEventListener('mouseup', (e) => {
        if ((mode === 'mark' || ctrlPressed) && markStart && tempMark) {
          if (Math.abs(tempMark.x2 - tempMark.x1) >= 2 / scale && Math.abs(tempMark.y2 - tempMark.y1) >= 2 / scale) {
            pushUndo();
            marks.push({ ...tempMark, isSelected: false });
          }
          markStart = null;
          tempMark = null;
          if (mode === 'mark') setMode('move');
          draw();
        } else if (mode === 'select' && isMarkResizing) {
          isMarkResizing = false;
          resizeTarget = null;
          resizeStart = null;
          pushUndo();
          draw();
        } else if (mode === 'select' && isMarkMoving) {
          isMarkMoving = false;
          markMoveStart = null;
          markMoveOrigin = null;
          pushUndo();
          draw();
        } else if (mode === 'move' && isDragging) {
          isDragging = false;
          canvas.style.cursor = 'grab';
        }
      });

      let undoStack = [];
      let redoStack = [];
      function pushUndo() {
        undoStack.push(JSON.stringify(marks));
        if (undoStack.length > 100) undoStack.shift();
        redoStack = []; // Undoした後に新しい操作があればRedo履歴は消す
      }
      function undo() {
        if (undoStack.length > 1) {
          redoStack.push(JSON.stringify(marks));
          marks = JSON.parse(undoStack.pop());
          draw();
        }
      }
      function redo() {
        if (redoStack.length > 0) {
          undoStack.push(JSON.stringify(marks));
          marks = JSON.parse(redoStack.pop());
          draw();
        }
      }

      // 楕円内判定関数
      function isPointInEllipse(px, py, mark) {
        const cx = (mark.x1 + mark.x2) / 2;
        const cy = (mark.y1 + mark.y2) / 2;
        const rx = Math.abs(mark.x2 - mark.x1) / 2;
        const ry = Math.abs(mark.y2 - mark.y1) / 2;
        if (rx < 1e-2 || ry < 1e-2) return false;
        return ((px - cx) ** 2) / (rx ** 2) + ((py - cy) ** 2) / (ry ** 2) <= 1;
      }

      // オフスクリーン用: scale/offsetなしで楕円を描画
      function drawEllipseRaw(ctx, x1, y1, x2, y2, color, lineWidth, dashed = false) {
        ctx.save();
        ctx.beginPath();
        const cx = (x1 + x2) / 2;
        const cy = (y1 + y2) / 2;
        const rx = Math.abs(x2 - x1) / 2;
        const ry = Math.abs(y2 - y1) / 2;
        ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        if (dashed) ctx.setLineDash([6, 6]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }

      // 初期リサイズ
      resizeCanvas();
      // 最初の状態をundoStackにpush
      pushUndo();
      </script>
    </body>
    </html>
  `;
} 