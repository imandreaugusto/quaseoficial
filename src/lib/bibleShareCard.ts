interface BibleShareCardOptions {
  reference: string;
  verse: string;
  studentName: string;
  logoUrl: string;
}

const wrapText = (context: CanvasRenderingContext2D, text: string, maxWidth: number) => {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let line = '';

  words.forEach((word) => {
    const candidate = line ? `${line} ${word}` : word;
    if (line && context.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  });

  if (line) lines.push(line);
  return lines;
};

const loadImage = (source: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const image = new Image();
  image.onload = () => resolve(image);
  image.onerror = () => reject(new Error('Could not load the Brazilian in Action logo.'));
  image.src = source;
});

export const createBibleShareCard = async ({
  reference,
  verse,
  studentName,
  logoUrl,
}: BibleShareCardOptions) => {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1920;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not create the Bible share image.');

  const logo = await loadImage(logoUrl);
  const background = context.createLinearGradient(0, 0, 1080, 1920);
  background.addColorStop(0, '#111a17');
  background.addColorStop(0.52, '#20362d');
  background.addColorStop(1, '#101815');
  context.fillStyle = background;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const glow = context.createRadialGradient(540, 860, 80, 540, 860, 800);
  glow.addColorStop(0, 'rgba(190, 160, 94, 0.14)');
  glow.addColorStop(1, 'rgba(190, 160, 94, 0)');
  context.fillStyle = glow;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.strokeStyle = 'rgba(218, 190, 129, 0.75)';
  context.lineWidth = 2;
  context.strokeRect(52, 52, 976, 1816);
  context.strokeStyle = 'rgba(218, 190, 129, 0.24)';
  context.strokeRect(72, 72, 936, 1776);

  context.drawImage(logo, 465, 112, 150, 164);
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = '#f4e5be';
  context.font = '700 34px Arial, sans-serif';
  context.fillText('BRAZILIAN IN ACTION', 540, 326);
  context.fillStyle = '#d5bd85';
  context.font = '500 24px Arial, sans-serif';
  context.fillText('KING JAMES VERSION', 540, 374);

  context.strokeStyle = 'rgba(218, 190, 129, 0.45)';
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(180, 428);
  context.lineTo(900, 428);
  context.stroke();

  const textWidth = 840;
  const availableHeight = 850;
  let fontSize = 82;
  let lines: string[] = [];
  let lineHeight = 0;
  do {
    context.font = `${fontSize}px Georgia, "Times New Roman", serif`;
    lines = wrapText(context, verse, textWidth);
    lineHeight = fontSize * 1.24;
    if (lines.length * lineHeight <= availableHeight || fontSize <= 40) break;
    fontSize -= 2;
  } while (fontSize >= 40);

  context.fillStyle = '#fff8e8';
  context.font = `${fontSize}px Georgia, "Times New Roman", serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  const textHeight = lines.length * lineHeight;
  const verseGroupHeight = 62 + textHeight;
  const verseGroupTop = 472 + Math.max(0, (930 - verseGroupHeight) / 2);
  context.fillStyle = '#e0c989';
  context.font = '700 46px Georgia, "Times New Roman", serif';
  context.fillText(reference, 540, verseGroupTop + 22, 900);

  context.fillStyle = '#fff8e8';
  context.font = `${fontSize}px Georgia, "Times New Roman", serif`;
  const textStartY = verseGroupTop + 62 + lineHeight / 2;
  lines.forEach((line, index) => {
    context.fillText(line, 540, textStartY + index * lineHeight, textWidth);
  });

  context.strokeStyle = 'rgba(218, 190, 129, 0.45)';
  context.beginPath();
  context.moveTo(250, 1500);
  context.lineTo(830, 1500);
  context.stroke();

  context.fillStyle = '#f4e5be';
  context.font = '500 34px Arial, sans-serif';
  const attribution = `${studentName} está estudando a Bíblia King James no Brazilian in Action.`;
  const attributionLines = wrapText(context, attribution, 860);
  const attributionLineHeight = 46;
  attributionLines.forEach((line, index) => {
    context.fillText(line, 540, 1590 + index * attributionLineHeight);
  });

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Could not export the Bible share image.'));
    }, 'image/png');
  });
};
