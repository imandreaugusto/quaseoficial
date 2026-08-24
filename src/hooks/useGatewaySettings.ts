import { useState, useEffect } from 'react';
import { GatewaySettings } from '../types';

export const DEFAULT_GATEWAY_SETTINGS: GatewaySettings = {
  subscriptionPrice: 10.00,
  provider: 'mercadopago',
  apiKey: '',
  publicKey: '',
  clientId: '',
  clientSecret: '',
  webhookSecret: '',
  pixKey: 'brazilianinaction@gmail.com',
  pixKeyType: 'email',
  beneficiaryName: 'Brazilian in Action Idiomas',
  city: 'São Paulo'
};

export function useGatewaySettings(): [GatewaySettings, (newSettings: GatewaySettings | ((prev: GatewaySettings) => GatewaySettings)) => void] {
  const [settings, setSettings] = useState<GatewaySettings>(() => {
    try {
      const saved = localStorage.getItem('bia_gateway_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Gateway secrets belong only in the server environment, never in browser storage.
        const sanitized = {
          ...DEFAULT_GATEWAY_SETTINGS,
          ...parsed,
          apiKey: '',
          publicKey: '',
          clientId: '',
          clientSecret: '',
          webhookSecret: ''
        };
        localStorage.setItem('bia_gateway_settings', JSON.stringify(sanitized));
        return sanitized;
      }
    } catch (e) {
      console.error('Error reading gateway settings from localStorage:', e);
    }
    return DEFAULT_GATEWAY_SETTINGS;
  });

  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const saved = localStorage.getItem('bia_gateway_settings');
        if (saved) {
          setSettings(JSON.parse(saved));
        }
      } catch (e) {
        console.error('Error reading gateway settings from event:', e);
      }
    };

    window.addEventListener('bia_gateway_settings_changed', handleStorageChange);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('bia_gateway_settings_changed', handleStorageChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const updateSettings = (newSettingsOrFn: GatewaySettings | ((prev: GatewaySettings) => GatewaySettings)) => {
    setSettings((prev) => {
      const resolved = typeof newSettingsOrFn === 'function' ? newSettingsOrFn(prev) : newSettingsOrFn;
      try {
        localStorage.setItem('bia_gateway_settings', JSON.stringify(resolved));
        window.dispatchEvent(new Event('bia_gateway_settings_changed'));
      } catch (e) {
        console.error('Error saving gateway settings to localStorage:', e);
      }
      return resolved;
    });
  };

  return [settings, updateSettings];
}
