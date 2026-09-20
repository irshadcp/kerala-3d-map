import React, { useRef, useState, useEffect, useCallback } from 'react';

interface VirtualJoystickProps {
  onMove: (dirX: number, dirZ: number, isMoving: boolean, dt?: number, sUp?: number) => void;
  getCameraBearing?: () => number;
}

export const VirtualJoystick: React.FC<VirtualJoystickProps> = ({ onMove, getCameraBearing }) => {
  const zoneRef = useRef<HTMLDivElement>(null);
  const [knobPos, setKnobPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [basePos, setBasePos] = useState<{ x: number; y: number } | null>(null);
  const [isActive, setIsActive] = useState(false);
  const pointerIdRef = useRef<number | null>(null);
  const currentVectorRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const originRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const radius = 42; // Max thumbstick displacement in pixels

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

  // Pointer event handlers on the touch zone
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!zoneRef.current) return;
    pointerIdRef.current = e.pointerId;
    zoneRef.current.setPointerCapture(e.pointerId);
    lastTimeRef.current = performance.now();

    const rect = zoneRef.current.getBoundingClientRect();
    const touchX = e.clientX - rect.left;
    const touchY = e.clientY - rect.top;

    originRef.current = { x: e.clientX, y: e.clientY };
    setBasePos({ x: touchX, y: touchY });
    setKnobPos({ x: 0, y: 0 });
    currentVectorRef.current = { x: 0, y: 0 };
    setIsActive(true);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isActive || e.pointerId !== pointerIdRef.current) return;

    const dx = e.clientX - originRef.current.x;
    const dy = e.clientY - originRef.current.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 3) {
      setKnobPos({ x: 0, y: 0 });
      currentVectorRef.current = { x: 0, y: 0 };
      return;
    }

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

  const handlePointerUp = (e: React.PointerEvent) => {
    if (e.pointerId !== pointerIdRef.current) return;
    pointerIdRef.current = null;
    setIsActive(false);
    setKnobPos({ x: 0, y: 0 });
    currentVectorRef.current = { x: 0, y: 0 };
    setBasePos(null);
  };

  // Keyboard WASD / Arrow Keys listener for desktop
  useEffect(() => {
    const keys: Record<string, boolean> = {};

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

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
      ref={zoneRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className="absolute bottom-0 left-0 w-[calc(100%-85px)] sm:w-[calc(100%-110px)] h-[44vh] sm:h-[40vh] pointer-events-auto touch-none select-none z-20"
      style={{ touchAction: 'none' }}
    >
      {/* Joystick Base Ring - Centered at bottom when resting, or floating dynamically under thumb when active */}
      <div
        className={`absolute rounded-full border border-white/50 shadow-2xl flex items-center justify-center transition-opacity duration-200 pointer-events-none ${
          isActive
            ? 'w-24 h-24 sm:w-28 sm:h-28 bg-slate-900/65 backdrop-blur-md ring-2 ring-emerald-400/70 opacity-100'
            : 'w-20 h-20 sm:w-22 sm:h-22 bg-slate-900/40 backdrop-blur-sm opacity-60'
        }`}
        style={
          basePos
            ? {
                left: `${basePos.x}px`,
                top: `${basePos.y}px`,
                transform: 'translate(-50%, -50%)',
              }
            : {
                left: '50%',
                bottom: '22px',
                transform: 'translateX(-50%)',
              }
        }
      >
        {/* Crosshair indicators */}
        <div className="absolute w-full h-[1px] bg-white/20 pointer-events-none" />
        <div className="absolute h-full w-[1px] bg-white/20 pointer-events-none" />

        {/* Center Thumb Knob */}
        <div
          className="absolute w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-white/95 shadow-lg border-2 border-emerald-500 flex items-center justify-center pointer-events-none transition-transform ease-out duration-75"
          style={{
            transform: `translate3d(${knobPos.x}px, ${knobPos.y}px, 0)`,
          }}
        >
          <div className="w-3 h-3 rounded-full bg-emerald-600 shadow-inner" />
        </div>
      </div>
    </div>
  );
};

export default VirtualJoystick;
