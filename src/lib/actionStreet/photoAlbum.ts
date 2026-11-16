export interface PostcardPhoto {
  id: string;
  cityId: string;
  cityName: string;
  spotName: string;
  createdAt: number;
  image: Blob;
}

const DATABASE_NAME = 'action-street-photo-album';
const DATABASE_VERSION = 1;
const STORE_NAME = 'photos';

function openPhotoAlbum(): Promise<IDBDatabase> {
  if (!('indexedDB' in window)) {
    return Promise.reject(new Error('Este navegador não oferece armazenamento para o álbum.'));
  }

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    let blocked = false;
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => {
      if (blocked) {
        request.result.close();
        return;
      }
      resolve(request.result);
    };
    request.onerror = () => reject(request.error ?? new Error('Não foi possível abrir o álbum.'));
    request.onblocked = () => {
      blocked = true;
      reject(new Error('Feche outra aba do Action Street para acessar o álbum.'));
    };
  });
}

export async function savePostcardPhoto(photo: PostcardPhoto): Promise<void> {
  const database = await openPhotoAlbum();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(photo);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('Não foi possível salvar a foto no álbum.'));
    transaction.onabort = () => reject(transaction.error ?? new Error('O salvamento da foto foi cancelado.'));
  }).finally(() => database.close());
}

export async function loadPostcardPhotos(): Promise<PostcardPhoto[]> {
  const database = await openPhotoAlbum();
  return new Promise<PostcardPhoto[]>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const request = transaction.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve((request.result as PostcardPhoto[]).sort((a, b) => b.createdAt - a.createdAt));
    request.onerror = () => reject(request.error ?? new Error('Não foi possível carregar o álbum.'));
    transaction.onabort = () => reject(transaction.error ?? new Error('A leitura do álbum foi cancelada.'));
  }).finally(() => database.close());
}

export function createPostcardArtwork(photo: PostcardPhoto): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const imageUrl = URL.createObjectURL(photo.image);
    const image = new Image();
    image.onerror = () => {
      URL.revokeObjectURL(imageUrl);
      reject(new Error('Não foi possível preparar a foto para o cartão-postal.'));
    };
    image.onload = () => {
      URL.revokeObjectURL(imageUrl);
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1920;
      const context = canvas.getContext('2d');
      if (!context) {
        reject(new Error('Seu navegador não conseguiu criar o cartão-postal.'));
        return;
      }

      context.fillStyle = '#f2ead8';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = '#fffdf7';
      context.fillRect(28, 28, 1024, 1864);

      const photoX = 64;
      const photoY = 64;
      const photoWidth = 952;
      const photoHeight = 1320;
      const scale = Math.max(photoWidth / image.width, photoHeight / image.height);
      const cropWidth = photoWidth / scale;
      const cropHeight = photoHeight / scale;
      const sourceX = (image.width - cropWidth) / 2;
      const sourceY = (image.height - cropHeight) / 2;
      context.drawImage(image, sourceX, sourceY, cropWidth, cropHeight, photoX, photoY, photoWidth, photoHeight);

      context.fillStyle = '#1f2937';
      context.font = '700 24px sans-serif';
      context.fillText('ACTION STREET  /  POSTCARD', 68, 1450, 920);
      context.fillStyle = '#111827';
      context.font = '700 64px Georgia, serif';
      context.fillText(photo.cityName, 68, 1540, 920);
      context.fillStyle = '#475569';
      context.font = '400 34px sans-serif';
      context.fillText(photo.spotName, 68, 1600, 920);

      context.strokeStyle = '#c9bda7';
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(68, 1650);
      context.lineTo(1012, 1650);
      context.stroke();

      context.fillStyle = '#475569';
      context.font = '600 24px sans-serif';
      context.fillText(
        new Date(photo.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }),
        68,
        1710,
        920
      );
      context.fillStyle = '#9b4a39';
      context.font = '700 20px sans-serif';
      context.fillText('UMA LEMBRANÇA DA MINHA VIAGEM', 68, 1820, 920);

      context.save();
      context.translate(910, 1756);
      context.rotate(-0.09);
      context.strokeStyle = '#ad5141';
      context.fillStyle = '#ad5141';
      context.globalAlpha = 0.82;
      context.lineWidth = 5;
      context.beginPath();
      context.arc(0, 0, 64, 0, Math.PI * 2);
      context.stroke();
      context.lineWidth = 2;
      context.beginPath();
      context.arc(0, 0, 57, 0, Math.PI * 2);
      context.stroke();
      context.textAlign = 'center';
      context.font = '800 15px sans-serif';
      context.fillText('ACTION STREET', 0, -8, 102);
      context.font = '700 19px Georgia, serif';
      context.fillText(String(new Date(photo.createdAt).getFullYear()), 0, 19, 80);
      context.lineWidth = 3;
      for (let index = 0; index < 3; index += 1) {
        const y = -24 + index * 10;
        context.beginPath();
        context.moveTo(69, y);
        context.lineTo(137, y + 5);
        context.stroke();
      }
      context.restore();

      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Não foi possível exportar o cartão-postal.'));
      }, 'image/png');
    };
    image.src = imageUrl;
  });
}
