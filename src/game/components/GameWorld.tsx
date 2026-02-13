import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import type { PlacedBuilding, BiomeType } from '../types';
import { BIOME_INFO } from '../types';
import { BUILDINGS, GRID_SIZE } from '../constants';

interface GameWorldProps {
  grid: (PlacedBuilding | null)[][];
  biome: BiomeType;
  selectedBuilding: string | null;
  onTileClick: (x: number, y: number) => void;
  raValue: number;
}

function Tile({ x, y, biome, hasBuilding, raValue, onClick }: {
  x: number; y: number; biome: BiomeType; hasBuilding: boolean;
  raValue: number; onClick: () => void;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const baseColor = BIOME_INFO[biome].groundColor;
  
  const status = raValue >= 60 ? 'green' : raValue >= 40 ? 'yellow' : 'red';
  const tint = status === 'green' ? 0.0 : status === 'yellow' ? 0.15 : 0.3;
  
  const color = useMemo(() => {
    const c = new THREE.Color(baseColor);
    if (tint > 0) c.lerp(new THREE.Color(status === 'red' ? '#8b0000' : '#8b8000'), tint);
    return c;
  }, [baseColor, tint, status]);

  return (
    <group position={[x - GRID_SIZE / 2 + 0.5, 0, y - GRID_SIZE / 2 + 0.5]}>
      <mesh
        ref={ref}
        position={[0, -0.05, 0]}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        onPointerOver={() => { if (ref.current) ref.current.scale.y = 1.1; }}
        onPointerOut={() => { if (ref.current) ref.current.scale.y = 1; }}
      >
        <boxGeometry args={[0.92, 0.1, 0.92]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {!hasBuilding && (
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.88, 0.88]} />
          <meshStandardMaterial color={color} transparent opacity={0.3} />
        </mesh>
      )}
    </group>
  );
}

function BuildingMesh({ building, x, y }: { building: PlacedBuilding; x: number; y: number }) {
  const ref = useRef<THREE.Group>(null);
  const data = BUILDINGS.find(b => b.id === building.buildingId);
  if (!data) return null;

  const color = new THREE.Color(data.color);
  const h = data.height;
  const px = x - GRID_SIZE / 2 + 0.5;
  const pz = y - GRID_SIZE / 2 + 0.5;

  // Gentle bob animation
  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.position.y = h / 2 + Math.sin(Date.now() * 0.002 + x * 3 + y * 7) * 0.02;
    }
  });

  const isNature = data.category === 'RA';
  const isOrg = data.category === 'AO';

  return (
    <group ref={ref} position={[px, h / 2, pz]}>
      {isNature ? (
        // Tree-like shape for nature
        <>
          <mesh position={[0, -h / 3, 0]}>
            <cylinderGeometry args={[0.06, 0.08, h / 2, 6]} />
            <meshStandardMaterial color="#8B4513" />
          </mesh>
          <mesh position={[0, h / 6, 0]}>
            <sphereGeometry args={[0.3, 8, 6]} />
            <meshStandardMaterial color={color} />
          </mesh>
        </>
      ) : isOrg ? (
        // Rounded shape for organization
        <RoundedBox args={[0.5, h, 0.5]} radius={0.08} smoothness={4}>
          <meshStandardMaterial color={color} />
        </RoundedBox>
      ) : (
        // Box shape for infrastructure
        <>
          <mesh>
            <boxGeometry args={[0.6, h, 0.6]} />
            <meshStandardMaterial color={color} />
          </mesh>
          {/* Roof */}
          <mesh position={[0, h / 2 + 0.1, 0]}>
            <coneGeometry args={[0.45, 0.25, 4]} />
            <meshStandardMaterial color={color.clone().multiplyScalar(0.8)} />
          </mesh>
        </>
      )}
    </group>
  );
}

function Water({ biome }: { biome: BiomeType }) {
  const ref = useRef<THREE.Mesh>(null);
  
  useFrame(() => {
    if (ref.current) {
      ref.current.position.y = -0.15 + Math.sin(Date.now() * 0.001) * 0.02;
    }
  });

  if (biome !== 'praia' && biome !== 'lagoa') return null;

  return (
    <mesh ref={ref} position={[GRID_SIZE / 2 + 1, -0.15, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[3, GRID_SIZE + 2]} />
      <meshStandardMaterial color="#1e90ff" transparent opacity={0.6} />
    </mesh>
  );
}

export function GameWorld({ grid, biome, selectedBuilding, onTileClick, raValue }: GameWorldProps) {
  return (
    <div className="w-full h-full rounded-xl overflow-hidden" style={{ minHeight: 400 }}>
      <Canvas
        camera={{ position: [6, 6, 6], fov: 45 }}
        shadows
        gl={{ antialias: true }}
        style={{ background: 'linear-gradient(to bottom, #87CEEB, #E0F7FA)' }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 8, 5]} intensity={1} castShadow />
        <pointLight position={[-3, 4, -3]} intensity={0.3} color="#FFD700" />

        {/* Ground plane */}
        <mesh position={[0, -0.15, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[GRID_SIZE + 2, GRID_SIZE + 2]} />
          <meshStandardMaterial color={BIOME_INFO[biome].groundColor} />
        </mesh>

        {/* Grid tiles */}
        {grid.map((row, y) =>
          row.map((cell, x) => (
            <Tile
              key={`${x}-${y}`}
              x={x} y={y}
              biome={biome}
              hasBuilding={!!cell}
              raValue={raValue}
              onClick={() => onTileClick(x, y)}
            />
          ))
        )}

        {/* Buildings */}
        {grid.map((row, y) =>
          row.map((cell, x) =>
            cell ? <BuildingMesh key={`b-${x}-${y}`} building={cell} x={x} y={y} /> : null
          )
        )}

        {/* Water for beach/lake biomes */}
        <Water biome={biome} />

        <OrbitControls
          enablePan={false}
          minDistance={4}
          maxDistance={14}
          maxPolarAngle={Math.PI / 2.5}
          minPolarAngle={Math.PI / 6}
        />
      </Canvas>
    </div>
  );
}
