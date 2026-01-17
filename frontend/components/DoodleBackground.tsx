'use client';

import { useState, useEffect, useMemo } from 'react';

const DOODLES = [
  '/doodles/doodle1.png',
  '/doodles/doodle2.png',
  '/doodles/doodle3.png',
  '/doodles/doodle4.png',
  '/doodles/doodle5.png',
  '/doodles/doodle6.png',
  '/doodles/doodle7.png',
  '/doodles/doodle8.png',
  '/doodles/doodle9.png',
  '/doodles/doodle10.png',
  '/doodles/doodle11.png',
  '/doodles/doodle12.png',
];

interface DoodlePosition {
  id: number;
  src: string;
  top: number;
  left: number;
  rotation: number;
  scale: number;
  opacity: number;
}

// Generate doodles function - called only on client
const generateDoodles = (): DoodlePosition[] => {
  const newDoodles: DoodlePosition[] = [];
  const rows = 4;
  const cols = 5;
  const cellWidth = 100 / cols;
  const cellHeight = 100 / rows;
  
  let id = 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // Skip some cells randomly to prevent overcrowding (30% chance to skip)
      if (Math.random() > 0.7) continue;

      // Calculate base position (center of cell)
      const baseX = (c * cellWidth) + (cellWidth / 2);
      const baseY = (r * cellHeight) + (cellHeight / 2);

      // Add random jitter within the cell (-25% to +25% of cell size)
      const jitterX = (Math.random() - 0.5) * (cellWidth * 0.8);
      const jitterY = (Math.random() - 0.5) * (cellHeight * 0.8);

      newDoodles.push({
        id: id++,
        src: DOODLES[Math.floor(Math.random() * DOODLES.length)],
        top: baseY + jitterY,
        left: baseX + jitterX,
        rotation: Math.random() * 360,
        scale: 0.8 + Math.random() * 0.4,
        opacity: 0.1 + Math.random() * 0.2,
      });
    }
  }

  return newDoodles;
};

export const DoodleBackground = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Necessary to avoid hydration mismatch for random client-side content
    // eslint-disable-next-line
    setMounted(true);
  }, []);

  const doodles = useMemo(() => {
    if (!mounted) return [];
    return generateDoodles();
  }, [mounted]);

  if (!mounted) {
    return null;
  }

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-[1]">
      {doodles.map((doodle) => (
        <div
          key={doodle.id}
          className="absolute transition-opacity duration-1000 ease-in"
          style={{
            top: `${doodle.top}%`,
            left: `${doodle.left}%`,
            transform: `translate(-50%, -50%) rotate(${doodle.rotation}deg) scale(${doodle.scale})`,
            opacity: doodle.opacity,
          }}
        >
          <img
            src={doodle.src}
            alt=""
            className="w-44 h-44 object-contain" 
          />
        </div>
      ))}
    </div>
  );
};

