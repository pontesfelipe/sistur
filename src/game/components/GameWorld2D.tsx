import { useRef, useEffect, useCallback, useState } from 'react';
import type { PlacedBuilding, BiomeType } from '../types';
import { BIOME_INFO } from '../types';
import { BUILDINGS, GRID_SIZE } from '../constants';

// Import all building sprites
import treeSprite from '@/assets/game/tree.png';
import parkSprite from '@/assets/game/park.png';
import reserveSprite from '@/assets/game/reserve.png';
import trailSprite from '@/assets/game/trail.png';
import gardenSprite from '@/assets/game/garden.png';
import houseSprite from '@/assets/game/house.png';
import schoolSprite from '@/assets/game/school.png';
import hotelSprite from '@/assets/game/hotel.png';
import bikeSprite from '@/assets/game/bike.png';
import carSprite from '@/assets/game/car.png';
import hospitalSprite from '@/assets/game/hospital.png';
import councilSprite from '@/assets/game/council.png';
import cleanupSprite from '@/assets/game/cleanup.png';
import signsSprite from '@/assets/game/signs.png';
import communitySprite from '@/assets/game/community.png';
import recyclingSprite from '@/assets/game/recycling.png';

const SPRITE_MAP: Record<string, string> = {
  tree: treeSprite,
  park: parkSprite,
  reserve: reserveSprite,
  trail: trailSprite,
  garden: gardenSprite,
  house: houseSprite,
  school: schoolSprite,
  hotel: hotelSprite,
  clean_transport: bikeSprite,
  dirty_transport: carSprite,
  hospital: hospitalSprite,
  council: councilSprite,
  cleanup: cleanupSprite,
  signs: signsSprite,
  community_center: communitySprite,
  recycling: recyclingSprite,
};

interface GameWorld2DProps {
  grid: (PlacedBuilding | null)[][];
  biome: BiomeType;
  selectedBuilding: string | null;
  onTileClick: (x: number, y: number) => void;
  raValue: number;
}

// Isometric conversion: grid (x,y) → screen (px,py)
const TILE_W = 96;
const TILE_H = 48;

function gridToScreen(gx: number, gy: number, offsetX: number, offsetY: number) {
  const px = (gx - gy) * (TILE_W / 2) + offsetX;
  const py = (gx + gy) * (TILE_H / 2) + offsetY;
  return { px, py };
}

function screenToGrid(sx: number, sy: number, offsetX: number, offsetY: number): { gx: number; gy: number } {
  const rx = sx - offsetX;
  const ry = sy - offsetY;
  const gx = Math.floor((rx / (TILE_W / 2) + ry / (TILE_H / 2)) / 2);
  const gy = Math.floor((ry / (TILE_H / 2) - rx / (TILE_W / 2)) / 2);
  return { gx, gy };
}

// Biome ground colors
const BIOME_GROUND: Record<BiomeType, { tile: string; tileDark: string; bg: string }> = {
  floresta: { tile: '#4a8c3f', tileDark: '#3a7030', bg: '#2d5a27' },
  praia: { tile: '#e8d5a3', tileDark: '#d4c090', bg: '#c2b280' },
  montanha: { tile: '#8a917c', tileDark: '#717860', bg: '#6b705c' },
  cerrado: { tile: '#c4a66a', tileDark: '#a88e54', bg: '#a68a64' },
  lagoa: { tile: '#5d9c6e', tileDark: '#4a8558', bg: '#4a7c59' },
  cidade: { tile: '#9a9a9a', tileDark: '#808080', bg: '#7a7a7a' },
};

// Water colors for beach/lagoa
const WATER_COLOR = 'rgba(30, 144, 255, 0.5)';

export function GameWorld2D({ grid, biome, selectedBuilding, onTileClick, raValue }: GameWorld2DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imagesRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [hoverTile, setHoverTile] = useState<{ x: number; y: number } | null>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 600, h: 400 });
  const animFrameRef = useRef<number>(0);
  const [tick, setTick] = useState(0);

  // Preload images
  useEffect(() => {
    let loaded = 0;
    const total = Object.keys(SPRITE_MAP).length;
    const map = new Map<string, HTMLImageElement>();

    Object.entries(SPRITE_MAP).forEach(([id, src]) => {
      const img = new Image();
      img.onload = () => {
        map.set(id, img);
        loaded++;
        if (loaded >= total) {
          imagesRef.current = map;
          setImagesLoaded(true);
        }
      };
      img.onerror = () => {
        loaded++;
        if (loaded >= total) {
          imagesRef.current = map;
          setImagesLoaded(true);
        }
      };
      img.src = src;
    });
  }, []);

  // Resize observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setCanvasSize({ w: Math.floor(width), h: Math.floor(height) });
      }
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  const getOffsets = useCallback(() => {
    const offsetX = canvasSize.w / 2;
    const offsetY = TILE_H * 1.5;
    return { offsetX, offsetY };
  }, [canvasSize]);

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasSize.w * dpr;
    canvas.height = canvasSize.h * dpr;
    ctx.scale(dpr, dpr);

    const { offsetX, offsetY } = getOffsets();
    const colors = BIOME_GROUND[biome];
    const time = Date.now();

    // Clear
    ctx.clearRect(0, 0, canvasSize.w, canvasSize.h);

    // Draw sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, canvasSize.h);
    skyGrad.addColorStop(0, '#87CEEB');
    skyGrad.addColorStop(1, '#E0F7FA');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, canvasSize.w, canvasSize.h);

    // RA-based tint
    const status = raValue >= 60 ? 'green' : raValue >= 40 ? 'yellow' : 'red';

    // Draw tiles (back to front for proper overlap)
    for (let gy = 0; gy < GRID_SIZE; gy++) {
      for (let gx = 0; gx < GRID_SIZE; gx++) {
        const { px, py } = gridToScreen(gx, gy, offsetX, offsetY);

        // Tile diamond
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + TILE_W / 2, py + TILE_H / 2);
        ctx.lineTo(px, py + TILE_H);
        ctx.lineTo(px - TILE_W / 2, py + TILE_H / 2);
        ctx.closePath();

        // Tile color with status tint
        let tileColor = (gx + gy) % 2 === 0 ? colors.tile : colors.tileDark;
        if (status === 'red') {
          tileColor = blendColor(tileColor, '#8b0000', 0.25);
        } else if (status === 'yellow') {
          tileColor = blendColor(tileColor, '#8b8000', 0.12);
        }

        // Hover highlight
        if (hoverTile && hoverTile.x === gx && hoverTile.y === gy) {
          tileColor = blendColor(tileColor, '#ffffff', 0.3);
        }

        ctx.fillStyle = tileColor;
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.15)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Draw building sprite if present
        const cell = grid[gy]?.[gx];
        if (cell) {
          const img = imagesRef.current.get(cell.buildingId);
          if (img) {
            const spriteW = TILE_W * 0.9;
            const spriteH = TILE_W * 0.9;
            // Subtle bounce animation
            const bounce = Math.sin(time * 0.003 + gx * 3 + gy * 7) * 2;
            ctx.drawImage(
              img,
              px - spriteW / 2,
              py - spriteH * 0.55 + bounce,
              spriteW,
              spriteH
            );
          } else {
            // Fallback: emoji
            const data = BUILDINGS.find(b => b.id === cell.buildingId);
            if (data) {
              ctx.font = '28px serif';
              ctx.textAlign = 'center';
              ctx.fillText(data.emoji, px, py + 10);
            }
          }
        }

        // Selected building ghost preview
        if (selectedBuilding && hoverTile && hoverTile.x === gx && hoverTile.y === gy && !cell) {
          const ghostImg = imagesRef.current.get(selectedBuilding);
          if (ghostImg) {
            ctx.globalAlpha = 0.5;
            const spriteW = TILE_W * 0.9;
            const spriteH = TILE_W * 0.9;
            ctx.drawImage(
              ghostImg,
              px - spriteW / 2,
              py - spriteH * 0.55,
              spriteW,
              spriteH
            );
            ctx.globalAlpha = 1;
          }
        }
      }
    }

    // Draw water for beach/lagoa
    if (biome === 'praia' || biome === 'lagoa') {
      const waveOffset = Math.sin(time * 0.002) * 3;
      ctx.fillStyle = WATER_COLOR;
      ctx.beginPath();
      const waterY = offsetY + GRID_SIZE * TILE_H + 10 + waveOffset;
      ctx.ellipse(canvasSize.w / 2, waterY, canvasSize.w * 0.45, 30, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Request next frame
    animFrameRef.current = requestAnimationFrame(() => {
      // Trigger re-render for animation
      setImagesLoaded(prev => prev);
    });
  }, [grid, biome, selectedBuilding, raValue, hoverTile, canvasSize, imagesLoaded, getOffsets, tick]);

  // Animation loop - tick every 50ms for smooth animations
  useEffect(() => {
    let running = true;
    const animate = () => {
      if (!running) return;
      setTick(t => t + 1);
      animFrameRef.current = requestAnimationFrame(animate);
    };
    animFrameRef.current = requestAnimationFrame(animate);
    return () => {
      running = false;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const { offsetX, offsetY } = getOffsets();
    const { gx, gy } = screenToGrid(sx, sy, offsetX, offsetY);
    if (gx >= 0 && gx < GRID_SIZE && gy >= 0 && gy < GRID_SIZE) {
      onTileClick(gx, gy);
    }
  }, [onTileClick, getOffsets]);

  const handleCanvasMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const { offsetX, offsetY } = getOffsets();
    const { gx, gy } = screenToGrid(sx, sy, offsetX, offsetY);
    if (gx >= 0 && gx < GRID_SIZE && gy >= 0 && gy < GRID_SIZE) {
      setHoverTile({ x: gx, y: gy });
    } else {
      setHoverTile(null);
    }
  }, [getOffsets]);

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const sx = touch.clientX - rect.left;
    const sy = touch.clientY - rect.top;
    const { offsetX, offsetY } = getOffsets();
    const { gx, gy } = screenToGrid(sx, sy, offsetX, offsetY);
    if (gx >= 0 && gx < GRID_SIZE && gy >= 0 && gy < GRID_SIZE) {
      setHoverTile({ x: gx, y: gy });
      onTileClick(gx, gy);
    }
  }, [onTileClick, getOffsets]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full rounded-xl overflow-hidden relative"
      style={{ minHeight: 300 }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-pointer"
        style={{ display: 'block' }}
        onClick={handleCanvasClick}
        onMouseMove={handleCanvasMove}
        onMouseLeave={() => setHoverTile(null)}
        onTouchStart={handleTouchStart}
      />
      {selectedBuilding && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-background/90 backdrop-blur-sm rounded-xl px-4 py-2 shadow-lg border border-border animate-pulse">
          <p className="text-xs font-medium text-center">
            👆 Toque no mapa para construir!
          </p>
        </div>
      )}
    </div>
  );
}

// Simple color blending utility
function blendColor(base: string, blend: string, amount: number): string {
  const parseHex = (hex: string) => {
    hex = hex.replace('#', '');
    return {
      r: parseInt(hex.substring(0, 2), 16),
      g: parseInt(hex.substring(2, 4), 16),
      b: parseInt(hex.substring(4, 6), 16),
    };
  };
  const b = parseHex(base);
  const t = parseHex(blend);
  const r = Math.round(b.r + (t.r - b.r) * amount);
  const g = Math.round(b.g + (t.g - b.g) * amount);
  const bl = Math.round(b.b + (t.b - b.b) * amount);
  return `rgb(${r},${g},${bl})`;
}
