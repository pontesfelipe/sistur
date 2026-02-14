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

function TreeModel({ color, h }: { color: THREE.Color; h: number }) {
  return (
    <>
      <mesh position={[0, -h / 3, 0]}>
        <cylinderGeometry args={[0.05, 0.08, h / 2, 6]} />
        <meshStandardMaterial color="#6B3E26" />
      </mesh>
      <mesh position={[0, 0.05, 0]}>
        <coneGeometry args={[0.3, h * 0.5, 8]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, 0.3, 0]}>
        <coneGeometry args={[0.22, h * 0.35, 8]} />
        <meshStandardMaterial color={color.clone().multiplyScalar(1.15)} />
      </mesh>
    </>
  );
}

function ParkModel({ color, h }: { color: THREE.Color; h: number }) {
  return (
    <>
      {/* Grass base */}
      <mesh position={[0, -h / 2 + 0.03, 0]}>
        <cylinderGeometry args={[0.38, 0.4, 0.06, 12]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Small bush left */}
      <mesh position={[-0.15, -0.05, 0.1]}>
        <sphereGeometry args={[0.12, 6, 5]} />
        <meshStandardMaterial color={color.clone().multiplyScalar(0.9)} />
      </mesh>
      {/* Small bush right */}
      <mesh position={[0.15, -0.05, -0.1]}>
        <sphereGeometry args={[0.1, 6, 5]} />
        <meshStandardMaterial color={color.clone().multiplyScalar(1.1)} />
      </mesh>
      {/* Bench */}
      <mesh position={[0, -0.08, 0]} rotation={[0, 0.5, 0]}>
        <boxGeometry args={[0.3, 0.04, 0.08]} />
        <meshStandardMaterial color="#8B6914" />
      </mesh>
    </>
  );
}

function ReserveModel({ color, h }: { color: THREE.Color; h: number }) {
  return (
    <>
      {/* Big tree */}
      <mesh position={[0, -h / 4, 0]}>
        <cylinderGeometry args={[0.07, 0.1, h * 0.6, 6]} />
        <meshStandardMaterial color="#5D3A1A" />
      </mesh>
      <mesh position={[0, h * 0.2, 0]}>
        <sphereGeometry args={[0.35, 8, 6]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Bird */}
      <mesh position={[0.2, h * 0.35, 0.1]}>
        <sphereGeometry args={[0.05, 5, 4]} />
        <meshStandardMaterial color="#FF6347" />
      </mesh>
      {/* Fence posts */}
      {[-0.35, 0.35].map((xp, i) => (
        <mesh key={i} position={[xp, -h / 3, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.3, 4]} />
          <meshStandardMaterial color="#A0522D" />
        </mesh>
      ))}
    </>
  );
}

function TrailModel({ color }: { color: THREE.Color }) {
  return (
    <>
      <mesh position={[0, -0.04, 0]} rotation={[-Math.PI / 2, 0, 0.3]}>
        <planeGeometry args={[0.15, 0.7]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Stepping stones */}
      {[[-0.05, 0.15], [0.05, -0.05], [-0.03, -0.2]].map(([xp, zp], i) => (
        <mesh key={i} position={[xp as number, -0.02, zp as number]} rotation={[-Math.PI / 2, 0, i * 0.5]}>
          <circleGeometry args={[0.05, 6]} />
          <meshStandardMaterial color="#A0926B" />
        </mesh>
      ))}
    </>
  );
}

function GardenModel({ color }: { color: THREE.Color }) {
  return (
    <>
      <mesh position={[0, -0.05, 0]}>
        <cylinderGeometry args={[0.35, 0.38, 0.05, 12]} />
        <meshStandardMaterial color="#5A4020" />
      </mesh>
      {/* Flowers */}
      {[[0.12, 0.1], [-0.1, 0.15], [0.05, -0.12], [-0.15, -0.08]].map(([xp, zp], i) => (
        <group key={i} position={[xp as number, 0.05, zp as number]}>
          <mesh position={[0, 0.06, 0]}>
            <sphereGeometry args={[0.06, 5, 4]} />
            <meshStandardMaterial color={i % 2 === 0 ? '#FFD700' : '#FF69B4'} />
          </mesh>
          <mesh>
            <cylinderGeometry args={[0.01, 0.01, 0.12, 4]} />
            <meshStandardMaterial color="#228B22" />
          </mesh>
        </group>
      ))}
    </>
  );
}

function HouseModel({ color, h }: { color: THREE.Color; h: number }) {
  return (
    <>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.5, h * 0.6, 0.45]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, h * 0.35, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[0.42, h * 0.35, 4]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>
      {/* Door */}
      <mesh position={[0, -h * 0.15, 0.23]}>
        <boxGeometry args={[0.1, 0.18, 0.02]} />
        <meshStandardMaterial color="#5D3A1A" />
      </mesh>
      {/* Window */}
      <mesh position={[0.15, 0.08, 0.23]}>
        <boxGeometry args={[0.08, 0.08, 0.02]} />
        <meshStandardMaterial color="#87CEEB" />
      </mesh>
    </>
  );
}

function SchoolModel({ color, h }: { color: THREE.Color; h: number }) {
  return (
    <>
      <mesh>
        <boxGeometry args={[0.6, h * 0.65, 0.5]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Flat roof */}
      <mesh position={[0, h * 0.35, 0]}>
        <boxGeometry args={[0.65, 0.06, 0.55]} />
        <meshStandardMaterial color={color.clone().multiplyScalar(0.85)} />
      </mesh>
      {/* Flag pole */}
      <mesh position={[0.25, h * 0.55, 0.2]}>
        <cylinderGeometry args={[0.01, 0.01, 0.4, 4]} />
        <meshStandardMaterial color="#C0C0C0" />
      </mesh>
      <mesh position={[0.3, h * 0.7, 0.2]}>
        <boxGeometry args={[0.1, 0.06, 0.01]} />
        <meshStandardMaterial color="#2ECC71" />
      </mesh>
      {/* Windows */}
      {[-0.15, 0.05].map((xp, i) => (
        <mesh key={i} position={[xp, 0.1, 0.26]}>
          <boxGeometry args={[0.1, 0.12, 0.02]} />
          <meshStandardMaterial color="#87CEEB" />
        </mesh>
      ))}
    </>
  );
}

function HotelModel({ color, h }: { color: THREE.Color; h: number }) {
  return (
    <>
      <mesh>
        <boxGeometry args={[0.5, h, 0.45]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Windows grid */}
      {[-0.12, 0.12].map((xp, xi) =>
        [-0.3, 0, 0.3].map((yp, yi) => (
          <mesh key={`${xi}-${yi}`} position={[xp, yp, 0.23]}>
            <boxGeometry args={[0.08, 0.08, 0.02]} />
            <meshStandardMaterial color="#FFD700" emissive="#FFD700" emissiveIntensity={0.3} />
          </mesh>
        ))
      )}
      {/* Sign */}
      <mesh position={[0, h * 0.42, 0.24]}>
        <boxGeometry args={[0.3, 0.08, 0.02]} />
        <meshStandardMaterial color="#FFD700" />
      </mesh>
    </>
  );
}

function BikeModel({ color, h }: { color: THREE.Color; h: number }) {
  return (
    <>
      <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.6, 0.15]} />
        <meshStandardMaterial color="#555555" />
      </mesh>
      {/* Bike wheels */}
      <mesh position={[-0.1, 0.05, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.08, 0.015, 6, 12]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0.1, 0.05, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.08, 0.015, 6, 12]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </>
  );
}

function CarModel({ color }: { color: THREE.Color }) {
  return (
    <>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.35, 0.15, 0.2]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0.02, 0.1, 0]}>
        <boxGeometry args={[0.2, 0.12, 0.18]} />
        <meshStandardMaterial color={color.clone().multiplyScalar(0.9)} />
      </mesh>
      {/* Smoke puff */}
      <mesh position={[-0.22, 0.02, 0]}>
        <sphereGeometry args={[0.04, 5, 4]} />
        <meshStandardMaterial color="#AAAAAA" transparent opacity={0.6} />
      </mesh>
    </>
  );
}

function HospitalModel({ color, h }: { color: THREE.Color; h: number }) {
  return (
    <>
      <mesh>
        <boxGeometry args={[0.55, h * 0.8, 0.5]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>
      {/* Red cross */}
      <mesh position={[0, 0.15, 0.26]}>
        <boxGeometry args={[0.18, 0.05, 0.02]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, 0.15, 0.26]}>
        <boxGeometry args={[0.05, 0.18, 0.02]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Entrance */}
      <mesh position={[0, -h * 0.25, 0.26]}>
        <boxGeometry args={[0.14, 0.2, 0.02]} />
        <meshStandardMaterial color="#87CEEB" />
      </mesh>
    </>
  );
}

function CouncilModel({ color, h }: { color: THREE.Color; h: number }) {
  return (
    <>
      {/* Round table */}
      <mesh position={[0, -0.1, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.04, 12]} />
        <meshStandardMaterial color="#8B6914" />
      </mesh>
      <mesh position={[0, -0.25, 0]}>
        <cylinderGeometry args={[0.05, 0.06, 0.25, 6]} />
        <meshStandardMaterial color="#6B4E1A" />
      </mesh>
      {/* Seats around table */}
      {[0, 1.2, 2.4, 3.6, 4.8].map((angle, i) => (
        <mesh key={i} position={[Math.cos(angle) * 0.35, -0.15, Math.sin(angle) * 0.35]}>
          <sphereGeometry args={[0.06, 5, 4]} />
          <meshStandardMaterial color={color} />
        </mesh>
      ))}
    </>
  );
}

function CleanupModel({ color }: { color: THREE.Color }) {
  return (
    <>
      {/* Broom handle */}
      <mesh position={[0, 0.1, 0]} rotation={[0, 0, 0.2]}>
        <cylinderGeometry args={[0.015, 0.015, 0.4, 4]} />
        <meshStandardMaterial color="#C19A6B" />
      </mesh>
      {/* Broom head */}
      <mesh position={[-0.04, -0.08, 0]}>
        <boxGeometry args={[0.15, 0.04, 0.08]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Sparkles */}
      {[[0.15, 0.1], [-0.12, 0.2], [0.1, -0.05]].map(([xp, zp], i) => (
        <mesh key={i} position={[xp as number, 0.02, zp as number]}>
          <octahedronGeometry args={[0.03, 0]} />
          <meshStandardMaterial color="#FFD700" emissive="#FFD700" emissiveIntensity={0.5} />
        </mesh>
      ))}
    </>
  );
}

function SignModel({ color, h }: { color: THREE.Color; h: number }) {
  return (
    <>
      <mesh position={[0, -0.1, 0]}>
        <cylinderGeometry args={[0.025, 0.025, h * 0.7, 4]} />
        <meshStandardMaterial color="#8B6914" />
      </mesh>
      <mesh position={[0, h * 0.2, 0.02]}>
        <boxGeometry args={[0.3, 0.2, 0.03]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Text lines */}
      <mesh position={[0, h * 0.22, 0.04]}>
        <boxGeometry args={[0.2, 0.02, 0.01]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>
      <mesh position={[0, h * 0.17, 0.04]}>
        <boxGeometry args={[0.15, 0.02, 0.01]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>
    </>
  );
}

function CommunityCenterModel({ color, h }: { color: THREE.Color; h: number }) {
  return (
    <>
      <mesh>
        <boxGeometry args={[0.6, h * 0.6, 0.55]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Columns */}
      {[-0.22, 0.22].map((xp, i) => (
        <mesh key={i} position={[xp, 0, 0.28]}>
          <cylinderGeometry args={[0.03, 0.04, h * 0.65, 6]} />
          <meshStandardMaterial color="#F5F5DC" />
        </mesh>
      ))}
      {/* Triangular pediment */}
      <mesh position={[0, h * 0.38, 0.28]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.35, 0.06, 3]} />
        <meshStandardMaterial color={color.clone().multiplyScalar(0.85)} />
      </mesh>
    </>
  );
}

function RecyclingModel({ color }: { color: THREE.Color }) {
  return (
    <>
      {/* Three bins */}
      {[[-0.15, '#3498DB'], [0, color.getStyle()], [0.15, '#F39C12']].map(([xp, c], i) => (
        <group key={i} position={[xp as number, 0, 0]}>
          <mesh position={[0, -0.02, 0]}>
            <cylinderGeometry args={[0.08, 0.07, 0.2, 8]} />
            <meshStandardMaterial color={c as string} />
          </mesh>
          <mesh position={[0, 0.1, 0]}>
            <cylinderGeometry args={[0.085, 0.085, 0.02, 8]} />
            <meshStandardMaterial color={(c as string)} />
          </mesh>
        </group>
      ))}
    </>
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

  useFrame(() => {
    if (ref.current) {
      ref.current.position.y = h / 2 + Math.sin(Date.now() * 0.002 + x * 3 + y * 7) * 0.02;
    }
  });

  const renderBuilding = () => {
    switch (data.id) {
      case 'tree': return <TreeModel color={color} h={h} />;
      case 'park': return <ParkModel color={color} h={h} />;
      case 'reserve': return <ReserveModel color={color} h={h} />;
      case 'trail': return <TrailModel color={color} />;
      case 'garden': return <GardenModel color={color} />;
      case 'house': return <HouseModel color={color} h={h} />;
      case 'school': return <SchoolModel color={color} h={h} />;
      case 'hotel': return <HotelModel color={color} h={h} />;
      case 'clean_transport': return <BikeModel color={color} h={h} />;
      case 'dirty_transport': return <CarModel color={color} />;
      case 'hospital': return <HospitalModel color={color} h={h} />;
      case 'council': return <CouncilModel color={color} h={h} />;
      case 'cleanup': return <CleanupModel color={color} />;
      case 'signs': return <SignModel color={color} h={h} />;
      case 'community_center': return <CommunityCenterModel color={color} h={h} />;
      case 'recycling': return <RecyclingModel color={color} />;
      default:
        return (
          <RoundedBox args={[0.5, h, 0.5]} radius={0.08} smoothness={4}>
            <meshStandardMaterial color={color} />
          </RoundedBox>
        );
    }
  };

  return (
    <group ref={ref} position={[px, h / 2, pz]}>
      {renderBuilding()}
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
