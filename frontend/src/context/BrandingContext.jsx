import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

const BrandingContext = createContext(null);

function hexToRgb(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
  if (!m) return '37 99 235';
  return `${parseInt(m[1], 16)} ${parseInt(m[2], 16)} ${parseInt(m[3], 16)}`;
}

function shade(rgbStr, amount) {
  const [r, g, b] = rgbStr.split(' ').map(Number);
  const adj = (v) => Math.max(0, Math.min(255, Math.round(v + (255 - v) * amount)));
  const dark = (v) => Math.max(0, Math.min(255, Math.round(v * (1 - Math.abs(amount)))));
  if (amount >= 0) return `${adj(r)} ${adj(g)} ${adj(b)}`;
  return `${dark(r)} ${dark(g)} ${dark(b)}`;
}

export function BrandingProvider({ children }) {
  const { academy } = useAuth();
  const [override, setOverride] = useState(null);

  const active = override || academy || null;

  useEffect(() => {
    const color = active?.theme?.primaryColor || '#2563eb';
    const rgb = hexToRgb(color);
    const root = document.documentElement;
    root.style.setProperty('--brand', rgb);
    root.style.setProperty('--brand-50', shade(rgb, 0.92));
    root.style.setProperty('--brand-100', shade(rgb, 0.8));
    root.style.setProperty('--brand-500', rgb);
    root.style.setProperty('--brand-600', shade(rgb, -0.1));
    root.style.setProperty('--brand-700', shade(rgb, -0.25));
    const mode = active?.theme?.mode || localStorage.getItem('theme') || 'light';
    if (mode === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
  }, [active]);

  return (
    <BrandingContext.Provider value={{ branding: active, setBranding: setOverride }}>
      {children}
    </BrandingContext.Provider>
  );
}

export const useBranding = () => useContext(BrandingContext);
