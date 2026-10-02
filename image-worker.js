self.onmessage = async (event) => {
  try {
    const bitmap = await createImageBitmap(event.data.file);
    const max = 1400;
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.drawImage(bitmap, 0, 0, width, height);
    const image = context.getImageData(0, 0, width, height);
    const pixels = image.data;
    const corners = [[0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1]];
    const background = corners.reduce((acc, [x, y]) => {
      const offset = (y * width + x) * 4;
      return [acc[0] + pixels[offset], acc[1] + pixels[offset + 1], acc[2] + pixels[offset + 2]];
    }, [0, 0, 0]).map((value) => value / 4);
    let minX = width, minY = height, maxX = 0, maxY = 0, foreground = 0;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const offset = (y * width + x) * 4;
        const distance = Math.sqrt((pixels[offset] - background[0]) ** 2 + (pixels[offset + 1] - background[1]) ** 2 + (pixels[offset + 2] - background[2]) ** 2);
        const edgeFactor = Math.min(x, y, width - x - 1, height - y - 1) < Math.min(width, height) * 0.03 ? 1.3 : 1;
        if (distance < 42 * edgeFactor) pixels[offset + 3] = Math.max(0, Math.min(255, (distance - 18) * 10));
        if (pixels[offset + 3] > 90) {
          foreground += 1; minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
        }
      }
    }
    if (foreground < width * height * 0.04) throw new Error("Не удалось уверенно отделить вещь от фона");
    context.putImageData(image, 0, 0);
    const pad = Math.round(Math.max(maxX - minX, maxY - minY) * 0.06);
    const cropX = Math.max(0, minX - pad), cropY = Math.max(0, minY - pad);
    const cropW = Math.min(width - cropX, maxX - minX + pad * 2), cropH = Math.min(height - cropY, maxY - minY + pad * 2);
    const output = new OffscreenCanvas(1200, 1500);
    const out = output.getContext("2d");
    const fit = Math.min(1080 / cropW, 1380 / cropH);
    const drawW = cropW * fit, drawH = cropH * fit;
    out.drawImage(canvas, cropX, cropY, cropW, cropH, (1200 - drawW) / 2, (1500 - drawH) / 2, drawW, drawH);
    const blob = await output.convertToBlob({ type: "image/webp", quality: 0.9 });
    self.postMessage({ blob, background }, [blob]);
  } catch (error) {
    self.postMessage({ error: error.message || "Ошибка обработки изображения" });
  }
};
