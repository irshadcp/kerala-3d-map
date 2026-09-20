import React, { useRef, useState, useEffect, useCallback } from 'react';

interface VirtualJoystickProps {
  onMove: (dirX: number, dirZ: number, isMoving: boolean, dt?: number, sUp?: number) => void;
  getCameraBearing?: () => number;
}

export const VirtualJoystick: React.FC<VirtualJoystickProps> = ({ onMove, getCameraBearing }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [knobPos, setKnobPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isActive, setIsActive] = useState(false);
  const pointerIdRef = useRef<number | null>(null);
  const currentVectorRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());

  const radius = 38; // Max thumbstick displacement in pixels

  // Continuous movement loop while active
  const tickMovement = useCallback(() => {
    const now = performance.now();
    const dt = Math.min(0.04, Math.max(0.008, (now - lastTimeRef.current) / 1000));
    lastTimeRef.current = now;

    if (currentVectorRef.current.x !== 0 || currentVectorRef.current.y !== 0) {
      const vx = currentVectorRef.current.x;
      const vy = currentVectorRef.current.y;

      // Adjust vector according to camera bearing if provided
      const bearing = getCameraBearing ? (getCameraBearing() * Math.PI) / 180 : 0;
      const cosB = Math.cos(bearing);
      const sinB = Math.sin(bearing);

      // vx is screen right (+1 for right), vy is screen down (+1 for down, -1 for up/forward)
      const sUp = -vy;
      const sRight = vx;

      // In world coordinates: East is +X, North is -Z
      // When bearing = 0 (North is UP on screen):
      // sUp (+1) moves North (worldX = 0, worldZ = -1)
      // sRight (+1) moves East (worldX = +1, worldZ = 0)
      const worldX = sRight * cosB + sUp * sinB;
      const worldZ = sRight * sinB - sUp * cosB;

      onMove(worldX, worldZ, true, dt, sUp);
    }
    animFrameRef.current = requestAnimationFrame(tickMovement);
  }, [onMove, getCameraBearing]);

  useEffect(() => {
    if (isActive) {
      lastTimeRef.current = performance.now();
      animFrameRef.current = requestAnimationFrame(tickMovement);
    } else {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      onMove(0, 0, false);
    }
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isActive, tickMovement, onMove]);

  // Pointer event handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!containerRef.current) return;
    pointerIdRef.current = e.pointerId;
    containerRef.current.setPointerCapture(e.pointerId);
    lastTimeRef.current = performance.now();
    setIsActive(true);
    updatePosition(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isActive || e.pointerId !== pointerIdRef.current) return;
    updatePosition(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (e.pointerId !== pointerIdRef.current) return;
    pointerIdRef.current = null;
    setIsActive(false);
    setKnobPos({ x: 0, y: 0 });
    currentVectorRef.current = { x: 0, y: 0 };
  };

  const updatePosition = (clientX: number, clientY: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const dist = Math.hypot(dx, dy);

    const clampedDist = Math.min(dist, radius);
    const angle = Math.atan2(dy, dx);

    const nx = Math.cos(angle) * (clampedDist / radius);
    const ny = Math.sin(angle) * (clampedDist / radius);

    setKnobPos({
      x: Math.cos(angle) * clampedDist,
      y: Math.sin(angle) * clampedDist,
    });
    currentVectorRef.current = { x: nx, y: ny };
  };

  // Keyboard WASD / Arrow Keys listener for desktop
  useEffect(() => {
    const keys: Record<string, boolean> = {};

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        keys[e.code] = true;
        updateKeyboardVector();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (keys[e.code]) {
        keys[e.code] = false;
        updateKeyboardVector();
      }
    };

    const updateKeyboardVector = () => {
      let vx = 0;
      let vy = 0;

      if (keys['KeyW'] || keys['ArrowUp']) vy -= 1;
      if (keys['KeyS'] || keys['ArrowDown']) vy += 1;
      if (keys['KeyA'] || keys['ArrowLeft']) vx -= 1;
      if (keys['KeyD'] || keys['ArrowRight']) vx += 1;

      const len = Math.hypot(vx, vy);
      if (len > 0) {
        vx /= len;
        vy /= len;
        currentVectorRef.current = { x: vx, y: vy };
        setKnobPos({ x: vx * radius, y: vy * radius });
        setIsActive(true);
      } else {
        currentVectorRef.current = { x: 0, y: 0 };
        setKnobPos({ x: 0, y: 0 });
        setIsActive(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={`relative w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-slate-900/40 backdrop-blur-md border border-white/30 shadow-2xl flex items-center justify-center touch-none select-none transition-all duration-150 ${
        isActive ? 'scale-105 bg-slate-900/60 ring-2 ring-emerald-400/50' : 'opacity-85 hover:opacity-100'
      }`}
      style={{ touchAction: 'none' }}
      title="Walk / Run Joystick (or use WASD keys)"
    >
      {/* Direction Cross Markings */}
      <div className="absolute w-full h-[1px] bg-white/20 pointer-events-none" />
      <div className="absolute h-full w-[1px] bg-white/20 pointer-events-none" />

      {/* Floating Center Thumb Knob */}
      <div
        className="absolute w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/95 shadow-md border-2 border-emerald-500 flex items-center justify-center pointer-events-none transition-transform ease-out duration-75"
        style={{
          transform: `translate3d(${knobPos.x}px, ${knobPos.y}px, 0)`,
        }}
      >
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-600 shadow-inner" />
      </div>
    </div>
  );
};

export default VirtualJoystick;
