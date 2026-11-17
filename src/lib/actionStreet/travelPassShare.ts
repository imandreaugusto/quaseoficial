export interface TravelPassArtworkDetails {
  displayName: string;
  origin: string;
  destination: string;
}

const CANVAS_WIDTH = 1080;
const CANVAS_HEIGHT = 1350;

function loadBrandMark(): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Não foi possível carregar o logo Brazilian in Action.'));
    image.src = '/brazilian-in-action-icon.svg';
    if (image.complete && image.naturalWidth > 0) resolve(image);
  });
}

function fitFontSize(context: CanvasRenderingContext2D, text: string, initialSize: number, maxWidth: number): number {
  let size = initialSize;
  while (size > 28) {
    context.font = `700 ${size}px Arial, sans-serif`;
    if (context.measureText(text).width <= maxWidth) return size;
    size -= 2;
  }
  return size;
}

export async function createTravelPassArtwork(details: TravelPassArtworkDetails): Promise<File> {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Não foi possível preparar a imagem do Travel Pass neste navegador.');

  const brandMark = await loadBrandMark();
  const background = context.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  background.addColorStop(0, '#07182b');
  background.addColorStop(0.52, '#172554');
  background.addColorStop(1, '#082f49');
  context.fillStyle = background;
  context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  context.fillStyle = 'rgba(125, 211, 252, 0.1)';
  context.beginPath();
  context.arc(930, 180, 310, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = 'rgba(255,255,255,0.2)';
  context.lineWidth = 2;
  context.strokeRect(54, 54, CANVAS_WIDTH - 108, CANVAS_HEIGHT - 108);

  context.drawImage(brandMark, 92, 96, 92, 92);
  context.fillStyle = '#e0f2fe';
  context.font = '700 28px Arial, sans-serif';
  context.fillText('BRAZILIAN IN ACTION', 210, 146);
  context.fillStyle = '#fcd34d';
  context.font = '700 20px Arial, sans-serif';
  context.fillText('ACTION STREET · PERSONAL TRAVEL PASS', 210, 180);

  context.fillStyle = 'rgba(255,255,255,0.72)';
  context.font = '700 24px Arial, sans-serif';
  context.fillText('TRAVELER', 96, 390);
  context.fillStyle = '#ffffff';
  const name = details.displayName.trim() || 'Viajante';
  context.font = `700 ${fitFontSize(context, name, 76, 860)}px Arial, sans-serif`;
  context.fillText(name, 96, 478, 860);

  context.strokeStyle = 'rgba(255,255,255,0.25)';
  context.beginPath();
  context.moveTo(96, 550);
  context.lineTo(984, 550);
  context.stroke();

  const drawField = (label: string, value: string, y: number) => {
    context.fillStyle = 'rgba(255,255,255,0.62)';
    context.font = '700 21px Arial, sans-serif';
    context.fillText(label, 96, y);
    context.fillStyle = '#ffffff';
    const fieldValue = value.trim() || 'A definir';
    context.font = `700 ${fitFontSize(context, fieldValue, 38, 860)}px Arial, sans-serif`;
    context.fillText(fieldValue, 96, y + 56, 860);
  };
  drawField('ORIGIN', details.origin, 660);
  drawField('DESTINATION', details.destination, 830);

  context.fillStyle = 'rgba(255,255,255,0.1)';
  context.fillRect(96, 1000, 888, 2);
  context.fillStyle = '#fde68a';
  context.font = '700 22px Arial, sans-serif';
  context.fillText('A JOURNEY TO LEARN ENGLISH THROUGH REAL PLACES', 96, 1070);
  context.fillStyle = 'rgba(255,255,255,0.76)';
  context.font = '700 18px Arial, sans-serif';
  context.fillText('EXPERIENCE CARD · NOT A PASSPORT OR OFFICIAL DOCUMENT', 96, 1194);
  context.fillStyle = 'rgba(255,255,255,0.56)';
  context.font = '18px Arial, sans-serif';
  context.fillText('Share your first Action Street journey', 96, 1232);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) resolve(result);
      else reject(new Error('Não foi possível gerar a imagem do Travel Pass.'));
    }, 'image/png');
  });
  return new File([blob], 'action-street-travel-pass.png', { type: 'image/png' });
}

export function downloadTravelPassArtwork(file: File): void {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
