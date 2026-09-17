import { StageBroadcastState } from '../types';

const BROADCAST_CHANNEL_NAME = 'brazilian_live_stage_sync';

export class StageBroadcaster {
  private channel: BroadcastChannel | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      } catch (e) {
        console.warn('BroadcastChannel não suportado:', e);
      }
    }
  }

  public sendState(state: StageBroadcastState) {
    if (this.channel) {
      this.channel.postMessage(state);
    }
    // Fallback via LocalStorage para navegadores sem BroadcastChannel compartilhado
    localStorage.setItem('bia_live_stage_state', JSON.stringify(state));
  }

  public subscribe(callback: (state: StageBroadcastState) => void): () => void {
    const handleMessage = (event: MessageEvent) => {
      if (event.data) {
        callback(event.data);
      }
    };

    if (this.channel) {
      this.channel.addEventListener('message', handleMessage);
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'bia_live_stage_state' && e.newValue) {
        try {
          callback(JSON.parse(e.newValue));
        } catch (err) {
          console.error('Falha ao processar estado do palco:', err);
        }
      }
    };

    window.addEventListener('storage', handleStorage);

    return () => {
      if (this.channel) {
        this.channel.removeEventListener('message', handleMessage);
      }
      window.removeEventListener('storage', handleStorage);
    };
  }

  public close() {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
  }
}

export const stageBroadcaster = new StageBroadcaster();
