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
        <button id="markBtn">マーク追加(Ctr+左クリック)</button>
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
      const markBtn = document.getElementById('markBtn');
      const lineWidthSelect = document.getElementById('lineWidth');
      const colorPicker = document.getElementById('colorPicker');

      // 状態
      let mode = 'move'; // 'move' or 'mark'
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

      // マーク（楕円）の配列
      let marks = [];
      // 一時的なマーク（ドラッグ中のプレビュー）
      let tempMark = null;
      let markStart = null;

      // 設定
      let markColor = colorPicker.value;
      let markLineWidth = parseInt(lineWidthSelect.value, 10);

      // UIイベント
      moveBtn.onclick = () => setMode('move');
      markBtn.onclick = () => setMode('mark');
      lineWidthSelect.onchange = () => { markLineWidth = parseInt(lineWidthSelect.value, 10); draw(); };
      colorPicker.oninput = () => { markColor = colorPicker.value; draw(); };

      function setMode(newMode) {
        mode = newMode;
        if (mode === 'move') {
          moveBtn.classList.add('active-btn');
          markBtn.classList.remove('active-btn');
          canvas.style.cursor = 'grab';
        } else {
          moveBtn.classList.remove('active-btn');
          markBtn.classList.add('active-btn');
          canvas.style.cursor = 'crosshair';
        }
        // プレビュー消去
        tempMark = null;
        markStart = null;
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

      // --- マーク追加モード or Ctrl+ドラッグで楕円追加 ---
      canvas.addEventListener('mousedown', (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left - offsetX) / scale;
        const y = (e.clientY - rect.top - offsetY) / scale;
        if (mode === 'mark' || ctrlPressed) {
          if (x >= 0 && y >= 0 && x <= img.width && y <= img.height) {
            markStart = { x1: x, y1: y };
            tempMark = { x1: x, y1: y, x2: x, y2: y, color: markColor, lineWidth: markLineWidth };
          }
        } else if (mode === 'move') {
          isDragging = true;
          dragStartX = e.clientX;
          dragStartY = e.clientY;
          lastOffsetX = offsetX;
          lastOffsetY = offsetY;
          canvas.style.cursor = 'grabbing';
        }
      });
      window.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left - offsetX) / scale;
        const y = (e.clientY - rect.top - offsetY) / scale;
        if ((mode === 'mark' || ctrlPressed) && markStart) {
          tempMark = { x1: markStart.x1, y1: markStart.y1, x2: x, y2: y, color: markColor, lineWidth: markLineWidth };
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
            marks.push({ ...tempMark });
          }
          markStart = null;
          tempMark = null;
          if (mode === 'mark') setMode('move');
          draw();
        } else if (mode === 'move' && isDragging) {
          isDragging = false;
          canvas.style.cursor = 'grab';
        }
      });

      let undoStack = [];
      function pushUndo() {
        undoStack.push(JSON.stringify(marks));
        if (undoStack.length > 100) undoStack.shift();
      }
      function undo() {
        if (undoStack.length > 0) {
          marks = JSON.parse(undoStack.pop());
          draw();
        }
      }

      // 初期リサイズ
      resizeCanvas();
      </script>
    </body>
    </html>
  `;
} 