import React, { createContext, useContext, useState, useEffect } from 'react';

interface LayoutPositionContextType {
  isBLiveDockOpen: boolean;
  setIsBLiveDockOpen: (open: boolean) => void;
  landmarkRightOffset: number; // in pixels
  bottomBarOffset: number; // in pixels for bottom ticker / controls
}

const LayoutPositionContext = createContext<LayoutPositionContextType>({
  isBLiveDockOpen: false,
  setIsBLiveDockOpen: () => {},
  landmarkRightOffset: 120,
  bottomBarOffset: 120,
});

export const LayoutPositionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isBLiveDockOpen, setIsBLiveDockOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState<number>(typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calculate dynamic right offset:
  // - Dock closed: B LIVE floating button is ~96px wide + 16px right gap => landmark starts at 124px right
  // - Dock open: B LIVE panel is ~320px wide + 16px right gap => landmark starts at 348px right
  const landmarkRightOffset = isBLiveDockOpen ? 348 : 124;
  const bottomBarOffset = landmarkRightOffset;

  return (
    <LayoutPositionContext.Provider
      value={{
        isBLiveDockOpen,
        setIsBLiveDockOpen,
        landmarkRightOffset,
        bottomBarOffset,
      }}
    >
      {children}
    </LayoutPositionContext.Provider>
  );
};

export const useLayoutPosition = () => useContext(LayoutPositionContext);

