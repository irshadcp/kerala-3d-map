import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import maplibregl from 'maplibre-gl';
import { LocationPreset } from '../config/gameConfig';
import ThreeMapLayer from '../graphics/ThreeMapLayer';

export type PerspectiveMode = 'tpp' | 'fpp';
export type WidenLevel = '1x' | '2x' | '5x' | '10x';

export const WIDEN_CONFIG: Record<WidenLevel, { zoom: number; pitch: number; lookAhead: number; label: string; desc: string }> = {
  '1x': { zoom: 22.0, pitch: 80, lookAhead: 4.5, label: '1x', desc: 'GTA/PUBG Close TPP' },
  '2x': { zoom: 20.6, pitch: 76, lookAhead: 5.5, label: '2x', desc: 'Wide TPP' },
  '5x': { zoom: 19.0, pitch: 66, lookAhead: 6.0, label: '5x', desc: 'High Drone' },
  '10x': { zoom: 17.2, pitch: 52, lookAhead: 0, label: '10x', desc: 'Tactical Overview' },
};

export const FPP_CONFIG = { zoom: 22.4, pitch: 84, lookAhead: 0, label: 'FPP', desc: 'First Person' };

/**
 * Computes lookahead target on the ground in front of the character.
 * This positions the camera directly behind the character's shoulders,
 * framing the character in the lower-third with the road ahead clearly visible (GTA / PUBG style).
 */
export const getTargetCenter = (
  lat: number,
  lng: number,
  bearing: number,
  widen: WidenLevel,
  mode: PerspectiveMode
): [number, number] => {
  if (mode === 'fpp') {
    return [lng, lat];
  }
  const lookAhead = WIDEN_CONFIG[widen]?.lookAhead || 0;
  if (lookAhead <= 0) {
    return [lng, lat];
  }
  const bRad = (bearing * Math.PI) / 180;
  const dLat = (Math.cos(bRad) * lookAhead) / 111111;
  const dLng = (Math.sin(bRad) * lookAhead) / (111111 * Math.cos((lat * Math.PI) / 180));
  return [lng + dLng, lat + dLat];
};

export interface SnapMapCanvasRef {
  toggle3D: () => boolean;
  recenter: () => void;
  rotateBy: (degrees: number) => void;
  resetRotation: () => void;
  toggleRotateMode: () => boolean;
  moveInDirection: (dirX: number, dirZ: number, isMoving: boolean, dt?: number, sUp?: number) => void;
  getCameraBearing: () => number;
  setPerspective: (mode: PerspectiveMode) => void;
  setWidenLevel: (level: WidenLevel) => void;
  getPerspective: () => PerspectiveMode;
  getWidenLevel: () => WidenLevel;
  is3D: boolean;
  isRotateMode: boolean;
}

interface SnapMapCanvasProps {
  currentLocation: LocationPreset;
  onPlayerMove?: (lat: number, lng: number) => void;
  resetTrigger: number;
}

export const SnapMapCanvas = forwardRef<SnapMapCanvasRef, SnapMapCanvasProps>(
  ({ currentLocation, onPlayerMove, resetTrigger }, ref) => {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<maplibregl.Map | null>(null);
    const threeLayer = useRef<ThreeMapLayer | null>(null);
    const is3DRef = useRef<boolean>(true);
    const isRotateModeRef = useRef<boolean>(false);
    const isManualInteractingRef = useRef<boolean>(false);
    const perspectiveRef = useRef<PerspectiveMode>('tpp');
    const widenLevelRef = useRef<WidenLevel>('1x');
    const playerCoordsRef = useRef<{ lat: number; lng: number }>({
      lat: currentLocation.lat,
      lng: currentLocation.lng,
    });

    useImperativeHandle(ref, () => ({
      toggle3D: () => {
        if (!map.current) return is3DRef.current;
        is3DRef.current = !is3DRef.current;
        const targetPitch = is3DRef.current
          ? (perspectiveRef.current === 'fpp' ? FPP_CONFIG.pitch : WIDEN_CONFIG[widenLevelRef.current].pitch)
          : 0;
        map.current.easeTo({
          pitch: targetPitch,
          duration: 600,
        });
        return is3DRef.current;
      },
      recenter: () => {
        if (!map.current) return;
        const lat = threeLayer.current ? threeLayer.current.playerLat : playerCoordsRef.current.lat;
        const lng = threeLayer.current ? threeLayer.current.playerLng : playerCoordsRef.current.lng;
        const bearing = map.current.getBearing();
        const zoom = perspectiveRef.current === 'fpp' ? FPP_CONFIG.zoom : WIDEN_CONFIG[widenLevelRef.current].zoom;
        const pitch = is3DRef.current
          ? (perspectiveRef.current === 'fpp' ? FPP_CONFIG.pitch : WIDEN_CONFIG[widenLevelRef.current].pitch)
          : 0;
        const targetCenter = getTargetCenter(lat, lng, bearing, widenLevelRef.current, perspectiveRef.current);
        map.current.flyTo({
          center: targetCenter,
          zoom,
          pitch,
          duration: 1000,
        });
      },
      rotateBy: (deg: number) => {
        if (!map.current) return;
        const currentBearing = map.current.getBearing();
        map.current.easeTo({
          bearing: currentBearing + deg,
          duration: 400,
        });
      },
      resetRotation: () => {
        if (!map.current) return;
        map.current.easeTo({
          bearing: 0,
          duration: 500,
        });
      },
      toggleRotateMode: () => {
        isRotateModeRef.current = !isRotateModeRef.current;
        return isRotateModeRef.current;
      },
      setPerspective: (mode: PerspectiveMode) => {
        perspectiveRef.current = mode;
        if (threeLayer.current) {
          threeLayer.current.setPerspective(mode);
        }
        if (!map.current) return;
        const pLat = threeLayer.current ? threeLayer.current.playerLat : playerCoordsRef.current.lat;
        const pLng = threeLayer.current ? threeLayer.current.playerLng : playerCoordsRef.current.lng;
        const bearing = map.current.getBearing();

        if (mode === 'fpp') {
          map.current.easeTo({
            center: [pLng, pLat],
            zoom: FPP_CONFIG.zoom,
            pitch: FPP_CONFIG.pitch,
            duration: 600,
            easing: (t) => t * (2 - t),
          });
        } else {
          const cfg = WIDEN_CONFIG[widenLevelRef.current];
          const targetCenter = getTargetCenter(pLat, pLng, bearing, widenLevelRef.current, 'tpp');
          map.current.easeTo({
            center: targetCenter,
            zoom: cfg.zoom,
            pitch: is3DRef.current ? cfg.pitch : 0,
            duration: 600,
            easing: (t) => t * (2 - t),
          });
        }
      },
      setWidenLevel: (level: WidenLevel) => {
        widenLevelRef.current = level;
        if (perspectiveRef.current === 'fpp') {
          perspectiveRef.current = 'tpp';
          if (threeLayer.current) {
            threeLayer.current.setPerspective('tpp');
          }
        }
        if (!map.current) return;
        const pLat = threeLayer.current ? threeLayer.current.playerLat : playerCoordsRef.current.lat;
        const pLng = threeLayer.current ? threeLayer.current.playerLng : playerCoordsRef.current.lng;
        const bearing = map.current.getBearing();
        const cfg = WIDEN_CONFIG[level];
        const targetCenter = getTargetCenter(pLat, pLng, bearing, level, 'tpp');
        map.current.easeTo({
          center: targetCenter,
          zoom: cfg.zoom,
          pitch: is3DRef.current ? cfg.pitch : 0,
          duration: 600,
          easing: (t) => t * (2 - t),
        });
      },
      getPerspective: () => perspectiveRef.current,
      getWidenLevel: () => widenLevelRef.current,
      moveInDirection: (dirX: number, dirZ: number, isMoving: boolean, dt?: number, sUp?: number) => {
        if (!threeLayer.current) return;
        if (isMoving) {
          // Cancel tap-to-walk destination if user takes joystick control
          threeLayer.current.isWalking = false;

          const delta = dt && dt > 0 && dt < 0.1 ? dt : 0.016;
          threeLayer.current.moveInDirection(dirX, dirZ, delta);
          const pLat = threeLayer.current.playerLat;
          const pLng = threeLayer.current.playerLng;
          playerCoordsRef.current = { lat: pLat, lng: pLng };

          // Ultra-smooth chase camera locked to character
          if (map.current && !isManualInteractingRef.current) {
            const currentBearing = map.current.getBearing();
            let newBearing = currentBearing;

            if (perspectiveRef.current === 'fpp') {
              // In FPP, camera heading matches character heading directly
              const targetBearing = ((Math.atan2(dirX, -dirZ) * 180 / Math.PI) + 360) % 360;
              let diff = targetBearing - currentBearing;
              while (diff < -180) diff += 360;
              while (diff > 180) diff -= 360;
              if (Math.abs(diff) > 0.05) {
                newBearing = (currentBearing + diff * 0.08 + 360) % 360;
              }
            } else {
              // In TPP, only rotate behind player if steering mostly forward (sUp > 0.1)
              // If strafing sideways or moving backward, keep current bearing steady
              if (sUp === undefined || sUp > 0.1) {
                const targetBearing = ((Math.atan2(dirX, -dirZ) * 180 / Math.PI) + 360) % 360;
                let diff = targetBearing - currentBearing;
                while (diff < -180) diff += 360;
                while (diff > 180) diff -= 360;

                if (Math.abs(diff) > 0.05) {
                  newBearing = (currentBearing + diff * 0.045 + 360) % 360;
                }
              }
            }

            const targetCenter = getTargetCenter(pLat, pLng, newBearing, widenLevelRef.current, perspectiveRef.current);
            map.current.jumpTo({
              center: targetCenter,
              bearing: newBearing,
            });
          }
          if (onPlayerMove) {
            onPlayerMove(pLat, pLng);
          }
        } else {
          if (threeLayer.current) {
            threeLayer.current.isWalking = false;
          }
        }
      },
      getCameraBearing: () => {
        return map.current ? map.current.getBearing() : 0;
      },
      get is3D() {
        return is3DRef.current;
      },
      get isRotateMode() {
        return isRotateModeRef.current;
      },
    }));

    // Smooth dedicated camera follow loop for tap-to-walk (independent of WebGL render)
    useEffect(() => {
      let animId: number;
      let lastTime = performance.now();

      const chaseLoop = () => {
        const now = performance.now();
        const delta = Math.min(0.033, Math.max(0.008, (now - lastTime) / 1000));
        lastTime = now;

        if (threeLayer.current && map.current && threeLayer.current.isWalking) {
          // Advance character position step BEFORE updating camera
          const moved = threeLayer.current.updateTapMovement(delta);

          if (moved && !isManualInteractingRef.current) {
            const pLng = threeLayer.current.playerLng;
            const pLat = threeLayer.current.playerLat;
            const heading = threeLayer.current.character.getHeading();
            const targetBearing = ((Math.atan2(Math.sin(heading), -Math.cos(heading)) * 180 / Math.PI) + 360) % 360;
            const currentBearing = map.current.getBearing();
            let diff = targetBearing - currentBearing;
            while (diff < -180) diff += 360;
            while (diff > 180) diff -= 360;

            const turnRate = perspectiveRef.current === 'fpp' ? 0.08 : 0.045;
            const newBearing = Math.abs(diff) > 0.05 ? (currentBearing + diff * turnRate + 360) % 360 : currentBearing;
            const targetCenter = getTargetCenter(pLat, pLng, newBearing, widenLevelRef.current, perspectiveRef.current);
            map.current.jumpTo({
              center: targetCenter,
              bearing: newBearing,
            });
          }
        }
        animId = requestAnimationFrame(chaseLoop);
      };
      animId = requestAnimationFrame(chaseLoop);
      return () => cancelAnimationFrame(animId);
    }, []);

    useEffect(() => {
      if (!mapContainer.current) return;

      if (!map.current) {
        playerCoordsRef.current = { lat: currentLocation.lat, lng: currentLocation.lng };
        const initCfg = WIDEN_CONFIG[widenLevelRef.current];
        const initCenter = getTargetCenter(currentLocation.lat, currentLocation.lng, 0, widenLevelRef.current, perspectiveRef.current);

        const mapInstance = new maplibregl.Map({
          container: mapContainer.current,
          style: '/pastel-style.json',
          center: initCenter,
          zoom: initCfg.zoom,
          pitch: initCfg.pitch,
          bearing: 0,
          maxPitch: 85,
          minPitch: 0,
          maxZoom: 24,
          minZoom: 10,
          dragRotate: true,
          pitchWithRotate: true,
          touchZoomRotate: true,
          touchPitch: true,
        });

        map.current = mapInstance;
        (window as any).__map = mapInstance;

        // Manual rotation / drag listeners to prevent chase camera fighting user gesture
        // Check e.originalEvent so programmatic jumpTo calls never trigger manual interaction flags!
        const setManualInteraction = (val: boolean) => {
          isManualInteractingRef.current = val;
          (window as any).__isManualRotating = val;
        };

        mapInstance.on('dragstart', (e: any) => {
          if (e.originalEvent) setManualInteraction(true);
        });
        mapInstance.on('dragend', (e: any) => {
          if (e.originalEvent) setManualInteraction(false);
        });
        mapInstance.on('rotatestart', (e: any) => {
          if (e.originalEvent) setManualInteraction(true);
        });
        mapInstance.on('rotateend', (e: any) => {
          if (e.originalEvent) setManualInteraction(false);
        });
        mapInstance.on('pitchstart', (e: any) => {
          if (e.originalEvent) setManualInteraction(true);
        });
        mapInstance.on('pitchend', (e: any) => {
          if (e.originalEvent) setManualInteraction(false);
        });

        mapInstance.on('style.load', () => {
          const layer = new ThreeMapLayer(currentLocation.lat, currentLocation.lng);
          threeLayer.current = layer;
          layer.setPerspective(perspectiveRef.current);
          mapInstance.addLayer(layer);
        });

        // Tap or click to walk/move avatar (when not in rotate mode)
        mapInstance.on('click', (e) => {
          if (!mapInstance || !threeLayer.current || isRotateModeRef.current) return;

          const { lng, lat } = e.lngLat;
          playerCoordsRef.current = { lat, lng };

          // Tell character to walk towards tapped location
          threeLayer.current.updatePlayerPosition(lat, lng);

          if (onPlayerMove) {
            onPlayerMove(lat, lng);
          }
        });

        // 3D Rotate gesture handling when Rotate Mode is active
        let isRotating = false;
        let startX = 0;
        let startY = 0;
        let startBearing = 0;
        let startPitch = 75;

        const container = mapContainer.current;

        const onPointerDown = (e: PointerEvent) => {
          if (!isRotateModeRef.current || !map.current) return;
          isRotating = true;
          setManualInteraction(true);
          startX = e.clientX;
          startY = e.clientY;
          startBearing = map.current.getBearing();
          startPitch = map.current.getPitch();
          container.setPointerCapture(e.pointerId);
          e.stopPropagation();
        };

        const onPointerMove = (e: PointerEvent) => {
          if (!isRotating || !map.current) return;
          const dx = e.clientX - startX;
          const dy = e.clientY - startY;
          const newBearing = (startBearing + dx * 0.45) % 360;
          const newPitch = Math.max(0, Math.min(85, startPitch - dy * 0.35));
          map.current.jumpTo({
            bearing: newBearing,
            pitch: newPitch,
          });
          e.stopPropagation();
        };

        const onPointerUp = (e: PointerEvent) => {
          if (!isRotating) return;
          isRotating = false;
          setManualInteraction(false);
          try {
            container.releasePointerCapture(e.pointerId);
          } catch (_) {}
          e.stopPropagation();
        };

        container.addEventListener('pointerdown', onPointerDown, { capture: true });
        container.addEventListener('pointermove', onPointerMove, { capture: true });
        container.addEventListener('pointerup', onPointerUp, { capture: true });
        container.addEventListener('pointercancel', onPointerUp, { capture: true });
      }

      return () => {
        if (map.current) {
          map.current.remove();
          map.current = null;
        }
      };
    }, []);

    // Handle location preset changes
    useEffect(() => {
      if (map.current && threeLayer.current) {
        playerCoordsRef.current = { lat: currentLocation.lat, lng: currentLocation.lng };
        const zoom = perspectiveRef.current === 'fpp' ? FPP_CONFIG.zoom : WIDEN_CONFIG[widenLevelRef.current].zoom;
        const pitch = is3DRef.current
          ? (perspectiveRef.current === 'fpp' ? FPP_CONFIG.pitch : WIDEN_CONFIG[widenLevelRef.current].pitch)
          : 0;
        const bearing = map.current.getBearing();
        const targetCenter = getTargetCenter(currentLocation.lat, currentLocation.lng, bearing, widenLevelRef.current, perspectiveRef.current);

        map.current.flyTo({
          center: targetCenter,
          zoom,
          pitch,
          duration: 1600,
        });

        threeLayer.current.setOrigin(currentLocation.lat, currentLocation.lng);
      }
    }, [currentLocation, resetTrigger]);

    return (
      <div className="game-viewport">
        <div ref={mapContainer} className="map-container" />
      </div>
    );
  }
);

SnapMapCanvas.displayName = 'SnapMapCanvas';
export default SnapMapCanvas;
