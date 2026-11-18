export interface TravelPassArtworkDetails {
  displayName: string;
  origin: string;
  destination: string;
  photoUrl?: string;
}

export interface TravelPassArtwork {
  file: File;
  photoUnavailable: boolean;
}

const CANVAS_WIDTH = 1400;
const CANVAS_HEIGHT = 980;

function loadProfilePhoto(photoUrl: string | undefined): Promise<{ image: HTMLImageElement | null; unavailable: boolean }> {
  if (!photoUrl) return Promise.resolve({ image: null, unavailable: false });
  return new Promise((resolve) => {
    const image = new Image();
    try {
      if (new URL(photoUrl, window.location.href).origin !== window.location.origin) {
        image.crossOrigin = 'anonymous';
      }
    } catch {
      resolve({ image: null, unavailable: true });
      return;
    }
    image.onload = () => resolve({ image, unavailable: false });
    image.onerror = () => resolve({ image: null, unavailable: true });
    image.src = photoUrl;
    if (image.complete) {
      if (image.naturalWidth > 0) resolve({ image, unavailable: false });
      else resolve({ image: null, unavailable: true });
    }
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

function drawPhoto(context: CanvasRenderingContext2D, image: HTMLImageElement | null, x: number, y: number, width: number, height: number, initials: string): void {
  context.fillStyle = '#d7cfbd';
  context.fillRect(x, y, width, height);
  if (image) {
    const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
    const sourceWidth = width / scale;
    const sourceHeight = height / scale;
    const sourceX = (image.naturalWidth - sourceWidth) / 2;
    const sourceY = (image.naturalHeight - sourceHeight) / 2;
    context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
    return;
  }
  context.fillStyle = '#586477';
  context.font = '700 58px Arial, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(initials || 'AS', x + width / 2, y + height / 2);
  context.textAlign = 'start';
  context.textBaseline = 'alphabetic';
}

function drawBrazilFlag(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number): void {
  context.fillStyle = '#009b3a';
  context.fillRect(x, y, width, height);
  context.fillStyle = '#ffdf00';
  context.beginPath();
  context.moveTo(x + width / 2, y + height * 0.1);
  context.lineTo(x + width * 0.92, y + height / 2);
  context.lineTo(x + width / 2, y + height * 0.9);
  context.lineTo(x + width * 0.08, y + height / 2);
  context.closePath();
  context.fill();
  context.fillStyle = '#002776';
  context.beginPath();
  context.arc(x + width / 2, y + height / 2, height * 0.22, 0, Math.PI * 2);
  context.fill();
}

export async function createTravelPassArtwork(details: TravelPassArtworkDetails): Promise<TravelPassArtwork> {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Não foi possível preparar a imagem do Travel Pass neste navegador.');

  const { image: profilePhoto, unavailable: photoUnavailable } = await loadProfilePhoto(details.photoUrl);
  context.fillStyle = '#101d31';
  context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  context.fillStyle = '#f3ead4';
  context.fillRect(48, 48, 638, 884);
  context.fillRect(714, 48, 638, 884);
  context.strokeStyle = '#b9a36a';
  context.lineWidth = 3;
  context.strokeRect(48, 48, 638, 884);
  context.strokeRect(714, 48, 638, 884);
  context.fillStyle = 'rgba(16, 29, 49, 0.15)';
  context.fillRect(686, 48, 28, 884);

  context.fillStyle = '#152944';
  context.font = '700 36px Arial, sans-serif';
  context.fillText('BRAZILIAN IN ACTION', 100, 140);
  drawBrazilFlag(context, 578, 90, 62, 42);
  context.fillStyle = '#8b7134';
  context.font = '700 24px Arial, sans-serif';
  context.fillText('ACTION STREET', 100, 184);
  context.fillStyle = '#1c3455';
  context.font = '700 31px Arial, sans-serif';
  context.fillText('TRAVEL PASSPORT', 100, 250);
  context.fillStyle = '#6f6147';
  context.font = '22px Arial, sans-serif';
  context.fillText('A journey to learn English', 100, 292);
  context.fillText('through real places.', 100, 324);

  context.strokeStyle = 'rgba(139, 113, 52, 0.6)';
  context.lineWidth = 3;
  context.beginPath();
  context.arc(367, 574, 154, 0, Math.PI * 2);
  context.stroke();
  context.beginPath();
  context.arc(367, 574, 130, 0, Math.PI * 2);
  context.stroke();
  context.beginPath();
  context.ellipse(367, 574, 60, 130, 0, 0, Math.PI * 2);
  context.stroke();
  context.beginPath();
  context.moveTo(238, 574);
  context.lineTo(496, 574);
  context.moveTo(255, 512);
  context.lineTo(479, 512);
  context.moveTo(255, 636);
  context.lineTo(479, 636);
  context.stroke();
  context.fillStyle = '#8b7134';
  context.font = '700 24px Arial, sans-serif';
  context.textAlign = 'center';
  context.fillText('FIRST JOURNEY', 367, 820);
  context.textAlign = 'start';

  context.fillStyle = '#152944';
  context.font = '700 28px Arial, sans-serif';
  context.fillText('ACTION STREET · TRAVEL PASS', 764, 116);
  context.strokeStyle = 'rgba(21, 41, 68, 0.3)';
  context.beginPath();
  context.moveTo(764, 142);
  context.lineTo(1312, 142);
  context.stroke();

  const name = details.displayName.trim() || 'Viajante';
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  drawPhoto(context, profilePhoto, 764, 186, 218, 290, initials);
  context.strokeStyle = '#8e8165';
  context.lineWidth = 2;
  context.strokeRect(764, 186, 218, 290);
  context.fillStyle = '#667085';
  context.font = '700 20px Arial, sans-serif';
  context.fillText('TRAVELER', 1018, 226);
  context.fillStyle = '#1c2738';
  context.font = `700 ${fitFontSize(context, name, 40, 285)}px Arial, sans-serif`;
  context.fillText(name, 1018, 274, 285);

  const drawField = (label: string, value: string, y: number) => {
    context.fillStyle = '#667085';
    context.font = '700 20px Arial, sans-serif';
    context.fillText(label, 764, y);
    context.fillStyle = '#1c2738';
    const fieldValue = value.trim() || 'A definir';
    context.font = `700 ${fitFontSize(context, fieldValue, 27, 530)}px Arial, sans-serif`;
    context.fillText(fieldValue, 764, y + 38, 548);
  };
  drawField('ORIGIN', details.origin, 548);
  drawField('FIRST DESTINATION', details.destination, 636);
  context.fillStyle = 'rgba(21, 41, 68, 0.3)';
  context.fillRect(764, 742, 548, 2);
  context.fillStyle = '#5c6470';
  context.font = '700 19px Arial, sans-serif';
  context.fillText('YOUR ACTION STREET JOURNEY', 764, 794);
  context.font = '17px Arial, sans-serif';
  context.fillText('Explore a new place, learn, and collect memories.', 764, 828);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) resolve(result);
      else reject(new Error('Não foi possível gerar a imagem do Travel Pass.'));
    }, 'image/png');
  });
  return {
    file: new File([blob], 'action-street-travel-pass.png', { type: 'image/png' }),
    photoUnavailable,
  };
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
