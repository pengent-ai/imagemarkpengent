export function getWebviewContent(imageSrc: string): string {
  return `
    <!DOCTYPE html>
    <html lang="ja">
    <head>
      <meta charset="UTF-8">
      <title>ImageMarkPengent</title>
      <style>
        body { margin: 0; padding: 0; }
        canvas { display: block; }
      </style>
    </head>
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
      </script>
    </body>
    </html>
  `;
} 