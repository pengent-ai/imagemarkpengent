export function getWebviewContent(imageSrc: string): string {
  return `
    <!DOCTYPE html>
    <html lang="ja">
    <head>
      <meta charset="UTF-8">
      <title>ImageMarkPengent</title>
      <style>
        html, body { height: 100%; margin: 0; padding: 0; overflow: hidden; }
        #canvas { display: block; width: 100vw; height: 100vh; background: #222; cursor: grab; }
      </style>
    </head>
    <body>
      <canvas id="canvas"></canvas>
      <script>
      const canvas = document.getElementById('canvas');
      const ctx = canvas.getContext('2d');
      let img = new Image();
      img.src = "${imageSrc}";

      // ズーム・パン用変数
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

      // リサイズ対応
      function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        draw();
      }
      window.addEventListener('resize', resizeCanvas);

      // 画像ロード後、初期ズーム・位置を計算
      img.onload = () => {
        // 画像全体がcanvasに収まるように初期scaleを計算
        const scaleX = canvas.width / img.width;
        const scaleY = canvas.height / img.height;
        scale = Math.min(scaleX, scaleY, 1);
        // 画像が中央に来るように初期オフセット
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
        // ズーム位置をマウス座標中心に
        offsetX = mouseX - ((mouseX - offsetX) * (scale / prevScale));
        offsetY = mouseY - ((mouseY - offsetY) * (scale / prevScale));
        draw();
      }, { passive: false });

      // ドラッグでパン
      canvas.addEventListener('mousedown', (e) => {
        isDragging = true;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        lastOffsetX = offsetX;
        lastOffsetY = offsetY;
        canvas.style.cursor = 'grabbing';
      });
      window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        offsetX = lastOffsetX + (e.clientX - dragStartX);
        offsetY = lastOffsetY + (e.clientY - dragStartY);
        draw();
      });
      window.addEventListener('mouseup', () => {
        isDragging = false;
        canvas.style.cursor = 'grab';
      });

      // 初期リサイズ
      resizeCanvas();
      </script>
    </body>
    </html>
  `;
} 