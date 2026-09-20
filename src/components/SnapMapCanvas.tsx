import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import maplibregl from 'maplibre-gl';
import { LocationPreset } from '../config/gameConfig';
import ThreeMapLayer from '../graphics/ThreeMapLayer';
import { RemotePlayerData } from '../graphics/RemotePlayerManager';
import { LocalUserProfile } from '../network/MultiplayerManager';
import {
  PerformanceTier,
  detectDeviceTier,
  getDevicePixelRatio,
  savePerformanceTier,
  getDeviceInfo,
} from '../utils/deviceTier';

export type WidenLevel = '2x' | '5x' | '10x';

function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export const WIDEN_CONFIG: Record<WidenLevel, { zoom: number; pitch: number; lookAhead: number; label: string; desc: string }> = {
  '2x': { zoom: 20.6, pitch: 68, lookAhead: 4.0, label: '2x', desc: 'Wide 3D View' },
  '5x': { zoom: 19.0, pitch: 50, lookAhead: 2.0, label: '5x', desc: 'Drone Overview' },
  '10x': { zoom: 17.2, pitch: 30, lookAhead: 0, label: '10x', desc: 'Max Tactical View' },
};

/**
 * Computes lookahead target on the ground in front of the character.
 * Positions camera behind character, framing character in lower-third
 * with the road ahead clearly visible.
 */
export const getTargetCenter = (
  lat: number,
  lng: number,
  bearing: number,
  widen: WidenLevel
): [number, number] => {
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
  setWidenLevel: (level: WidenLevel) => void;
  getWidenLevel: () => WidenLevel;
  getThreeLayer: () => ThreeMapLayer | null;
  flyToLocation: (lat: number, lng: number, zoom?: number) => void;
  teleportToLocation: (lat: number, lng: number) => void;
  toggleDrive: () => boolean;
  setPerformanceTier: (tier: PerformanceTier) => void;
  getPerformanceTier: () => PerformanceTier;
  is3D: boolean;
  isRotateMode: boolean;
  isDriving: boolean;
}

interface SnapMapCanvasProps {
  currentLocation: LocationPreset;
  onPlayerMove?: (lat: number, lng: number, heading?: number, isWalking?: boolean, isDriving?: boolean) => void;
  resetTrigger: number;
  remotePlayers?: RemotePlayerData[];
  localPlayer?: LocalUserProfile | null;
  onSelectPlayer?: (player: RemotePlayerData) => void;
}

export const SnapMapCanvas = forwardRef<SnapMapCanvasRef, SnapMapCanvasProps>(
  ({ currentLocation, onPlayerMove, resetTrigger, remotePlayers, localPlayer, onSelectPlayer }, ref) => {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<maplibregl.Map | null>(null);
    const threeLayer = useRef<ThreeMapLayer | null>(null);
    const is3DRef = useRef<boolean>(true);
    const isRotateModeRef = useRef<boolean>(false);
    const isManualInteractingRef = useRef<boolean>(false);
    const isTeleportingRef = useRef<boolean>(false);
    const widenLevelRef = useRef<WidenLevel>('2x');
    const tierRef = useRef<PerformanceTier>(detectDeviceTier());
    const playerCoordsRef = useRef<{ lat: number; lng: number }>({
      lat: currentLocation.lat,
      lng: currentLocation.lng,
    });

    useImperativeHandle(ref, () => ({
      toggle3D: () => {
        if (!map.current) return is3DRef.current;
        is3DRef.current = !is3DRef.current;
        threeLayer.current?.set3DMode(is3DRef.current);
        const targetPitch = is3DRef.current
          ? WIDEN_CONFIG[widenLevelRef.current].pitch
          : 0;
        map.current.easeTo({
          pitch: targetPitch,
          duration: 500,
        });
        return is3DRef.current;
      },
      recenter: () => {
        if (!map.current) return;
        is3DRef.current = true;
        threeLayer.current?.set3DMode(true);
        const lat = threeLayer.current ? threeLayer.current.playerLat : playerCoordsRef.current.lat;
        const lng = threeLayer.current ? threeLayer.current.playerLng : playerCoordsRef.current.lng;
        const bearing = map.current.getBearing();
        const zoom = WIDEN_CONFIG[widenLevelRef.current].zoom;
        const pitch = WIDEN_CONFIG[widenLevelRef.current].pitch;
        const targetCenter = getTargetCenter(lat, lng, bearing, widenLevelRef.current);
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
      setWidenLevel: (level: WidenLevel) => {
        widenLevelRef.current = level;
        if (!map.current) return;
        is3DRef.current = true;
        threeLayer.current?.set3DMode(true);
        const pLat = threeLayer.current ? threeLayer.current.playerLat : playerCoordsRef.current.lat;
        const pLng = threeLayer.current ? threeLayer.current.playerLng : playerCoordsRef.current.lng;
        const bearing = map.current.getBearing();
        const cfg = WIDEN_CONFIG[level];
        const targetCenter = getTargetCenter(pLat, pLng, bearing, level);
        map.current.easeTo({
          center: targetCenter,
          zoom: cfg.zoom,
          pitch: cfg.pitch,
          duration: 600,
          easing: (t) => t * (2 - t),
        });
      },
      getWidenLevel: () => widenLevelRef.current,
      getThreeLayer: () => threeLayer.current,
      flyToLocation: (lat: number, lng: number, zoom = 18.2) => {
        if (!map.current) return;
        if (zoom >= 16.2) {
          is3DRef.current = true;
          threeLayer.current?.set3DMode(true);
        }
        const pitch = is3DRef.current ? WIDEN_CONFIG[widenLevelRef.current].pitch : 0;
        map.current.flyTo({
          center: [lng, lat],
          zoom,
          pitch,
          duration: 1600,
        });
      },
      teleportToLocation: (lat: number, lng: number) => {
        if (!map.current || !threeLayer.current) return;
        isTeleportingRef.current = true;
        playerCoordsRef.current = { lat, lng };

        // Always lock into 2x 3D View (zoom: 20.6, pitch: 68) when going to a player!
        widenLevelRef.current = '2x';
        is3DRef.current = true;
        threeLayer.current.set3DMode(true);
        threeLayer.current.setOrigin(lat, lng);
        threeLayer.current.updatePlayerPosition(lat, lng, true);

        const cfg = WIDEN_CONFIG['2x'];
        const bearing = map.current.getBearing();
        const targetCenter = getTargetCenter(lat, lng, bearing, '2x');

        // Instant snappy jump directly to the player's side in full 2x 3D view
        map.current.jumpTo({
          center: targetCenter,
          zoom: cfg.zoom,
          pitch: cfg.pitch,
          bearing,
        });

        isTeleportingRef.current = false;
        threeLayer.current.updatePlayerPosition(lat, lng, true);
        map.current.triggerRepaint();
      },
      moveInDirection: (dirX: number, dirZ: number, isMoving: boolean, dt?: number, _sUp?: number) => {
        if (!threeLayer.current) return;
        if (isMoving) {
          // Cancel tap-to-walk destination if user takes joystick control
          threeLayer.current.isWalking = false;

          const delta = dt && dt > 0 && dt < 0.1 ? dt : 0.016;
          threeLayer.current.moveInDirection(dirX, dirZ, delta);
          const pLat = threeLayer.current.playerLat;
          const pLng = threeLayer.current.playerLng;
          playerCoordsRef.current = { lat: pLat, lng: pLng };

          // Rock-solid camera follow locked to character position
          if (map.current && !isManualInteractingRef.current) {
            const currentBearing = map.current.getBearing();
            const basePitch = is3DRef.current ? WIDEN_CONFIG[widenLevelRef.current].pitch : 0;
            const targetCenter = getTargetCenter(pLat, pLng, currentBearing, widenLevelRef.current);

            map.current.jumpTo({
              center: targetCenter,
              bearing: currentBearing,
              pitch: basePitch,
            });
          }
          if (onPlayerMove) {
            const heading = threeLayer.current.character.getHeading();
            onPlayerMove(pLat, pLng, heading, true, threeLayer.current.isDriving());
          }
        } else {
          if (threeLayer.current) {
            const wasWalking = threeLayer.current.isWalking;
            threeLayer.current.isWalking = false;
            if (wasWalking && onPlayerMove) {
              const pLat = threeLayer.current.playerLat;
              const pLng = threeLayer.current.playerLng;
              const heading = threeLayer.current.character.getHeading();
              onPlayerMove(pLat, pLng, heading, false, threeLayer.current.isDriving());
            }
          }
        }
      },
      toggleDrive: () => {
        if (!threeLayer.current) return false;
        const res = threeLayer.current.toggleDrive();
        if (onPlayerMove) {
          const heading = threeLayer.current.character.getHeading();
          onPlayerMove(
            threeLayer.current.playerLat,
            threeLayer.current.playerLng,
            heading,
            threeLayer.current.isWalking,
            res
          );
        }
        return res;
      },
      setPerformanceTier: (tier: PerformanceTier) => {
        tierRef.current = tier;
        savePerformanceTier(tier);
        const dpr = getDevicePixelRatio(tier);
        if (map.current) {
          (map.current as any).setPixelRatio(dpr);
        }
        threeLayer.current?.setPerformanceMode(tier === 'performance');
      },
      getPerformanceTier: () => {
        return tierRef.current;
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
      get isDriving() {
        return threeLayer.current ? threeLayer.current.isDriving() : false;
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
          if (onPlayerMove) {
            const heading = threeLayer.current.character.getHeading();
            onPlayerMove(
              threeLayer.current.playerLat,
              threeLayer.current.playerLng,
              heading,
              moved,
              threeLayer.current.isDriving()
            );
          }

          if (moved && !isManualInteractingRef.current) {
            const pLng = threeLayer.current.playerLng;
            const pLat = threeLayer.current.playerLat;
            const heading = threeLayer.current.character.getHeading();
            const targetBearing = ((Math.atan2(Math.sin(heading), -Math.cos(heading)) * 180 / Math.PI) + 360) % 360;
            const currentBearing = map.current.getBearing();
            let diff = targetBearing - currentBearing;
            while (diff < -180) diff += 360;
            while (diff > 180) diff -= 360;

            const turnRate = 0.045;
            const newBearing = Math.abs(diff) > 0.05 ? (currentBearing + diff * turnRate + 360) % 360 : currentBearing;

            const basePitch = is3DRef.current ? WIDEN_CONFIG[widenLevelRef.current].pitch : 0;
            const targetCenter = getTargetCenter(pLat, pLng, newBearing, widenLevelRef.current);
            map.current.jumpTo({
              center: targetCenter,
              bearing: newBearing,
              pitch: basePitch,
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
        const initCenter = getTargetCenter(currentLocation.lat, currentLocation.lng, 0, widenLevelRef.current);

        const currentTier = tierRef.current;
        const initialDpr = getDevicePixelRatio(currentTier);
        const isBudgetDevice = getDeviceInfo().isLowEnd;

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
          minZoom: 6, // Allows full view of entire Kerala state and all player pins
          dragRotate: true,
          pitchWithRotate: true,
          touchZoomRotate: true,
          touchPitch: true,
          fadeDuration: 0, // Zero tile fade tweening for maximum 60fps mobile speed
          dragPan: false, // In 3D mode, swipe rotates camera; enabled in 2D mode
          pixelRatio: initialDpr,
          maxTileCacheSize: isBudgetDevice ? 25 : 70,
        });

        map.current = mapInstance;
        (window as any).__map = mapInstance;

        // Manual rotation / drag listeners to prevent chase camera fighting user gesture
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
          layer.setPerformanceMode(tierRef.current === 'performance');
          threeLayer.current = layer;
          mapInstance.addLayer(layer);
        });

        // Dynamic Snapchat-style 2D/3D zoom transition engine
        // When zoomed out (< 16.2), auto-ease pitch to 0 and switch to flat 2D mode for zero lag and zero heat!
        const checkZoomAndMode = () => {
          if (!map.current || isTeleportingRef.current) return;
          const currentZoom = map.current.getZoom();
          const isCloseEnoughFor3D = currentZoom >= 16.2;

          if (!isCloseEnoughFor3D && is3DRef.current) {
            is3DRef.current = false;
            threeLayer.current?.set3DMode(false);
            map.current.dragPan.enable(); // Enable full Kerala map pan in 2D
            map.current.easeTo({
              pitch: 0,
              duration: 350,
            });
          } else if (isCloseEnoughFor3D && !is3DRef.current) {
            is3DRef.current = true;
            threeLayer.current?.set3DMode(true);
            map.current.dragPan.disable(); // In 3D mode, swipe rotates camera around character
            const targetPitch = WIDEN_CONFIG[widenLevelRef.current].pitch;
            map.current.easeTo({
              pitch: targetPitch,
              duration: 350,
            });
          }
        };

        mapInstance.on('zoom', checkZoomAndMode);
        mapInstance.on('zoomend', checkZoomAndMode);

        // Tap or click to walk/move avatar
        mapInstance.on('click', (e) => {
          if (!mapInstance || !threeLayer.current || isRotateModeRef.current) return;

          const { lng, lat } = e.lngLat;
          playerCoordsRef.current = { lat, lng };

          // Tell character to walk towards tapped location
          threeLayer.current.updatePlayerPosition(lat, lng);

          if (onPlayerMove) {
            const heading = threeLayer.current.character.getHeading();
            onPlayerMove(lat, lng, heading, true, threeLayer.current.isDriving());
          }
        });

        // Mobile & Desktop Swipe-to-Rotate Look-Around in 3D
        let isRotating = false;
        let startX = 0;
        let startY = 0;
        let startBearing = 0;
        let startPitch = 75;

        const container = mapContainer.current;

        const onPointerDown = (e: PointerEvent) => {
          if (!map.current || !is3DRef.current) return;
          // Ignore if pointer is inside the bottom-left joystick area
          const isJoystickZone = e.clientX < 165 && e.clientY > window.innerHeight - 230;
          if (isJoystickZone) return;

          isRotating = true;
          setManualInteraction(true);
          startX = e.clientX;
          startY = e.clientY;
          startBearing = map.current.getBearing();
          startPitch = map.current.getPitch();
          try {
            container.setPointerCapture(e.pointerId);
          } catch (_) {}
        };

        const onPointerMove = (e: PointerEvent) => {
          if (!isRotating || !map.current || !is3DRef.current) return;
          const dx = e.clientX - startX;
          const dy = e.clientY - startY;

          // Touch sensitivity tuned for natural thumb swiping
          const newBearing = (startBearing - dx * 0.45 + 360) % 360;
          const newPitch = Math.max(25, Math.min(80, startPitch - dy * 0.30));

          const pLat = threeLayer.current ? threeLayer.current.playerLat : playerCoordsRef.current.lat;
          const pLng = threeLayer.current ? threeLayer.current.playerLng : playerCoordsRef.current.lng;
          const targetCenter = getTargetCenter(pLat, pLng, newBearing, widenLevelRef.current);

          map.current.jumpTo({
            center: targetCenter,
            bearing: newBearing,
            pitch: newPitch,
          });
        };

        const onPointerUp = (e: PointerEvent) => {
          if (!isRotating) return;
          isRotating = false;
          setTimeout(() => {
            setManualInteraction(false);
          }, 150);
          try {
            container.releasePointerCapture(e.pointerId);
          } catch (_) {}
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

    // -------------------------------------------------------------------------
    // Snapchat-Style 2D Player Pins on Map (Zoomed Out Pinpoint View)
    // -------------------------------------------------------------------------
    const remoteMarkersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
    const localMarkerRef = useRef<maplibregl.Marker | null>(null);

    // Sync remote players 2D map pins
    useEffect(() => {
      const mapInst = map.current;
      if (!mapInst) return;

      const activePeerIds = new Set<string>();

      if (remotePlayers && remotePlayers.length > 0) {
        for (const player of remotePlayers) {
          if (!player.lat || !player.lng || isNaN(player.lat) || isNaN(player.lng)) continue;
          activePeerIds.add(player.id);

          let marker = remoteMarkersRef.current.get(player.id);
          if (!marker) {
            const el = document.createElement('div');
            el.className = 'snap-player-marker';
            el.style.cursor = 'pointer';
            el.style.pointerEvents = 'auto';

            el.innerHTML = `
              <div style="display: flex; flex-direction: column; align-items: center; user-select: none; transform: translateY(-4px); transition: transform 0.2s ease;">
                <!-- Name & District Floating Overhead Card -->
                <div style="background: rgba(255, 255, 255, 0.96); backdrop-filter: blur(8px); border: 1.5px solid #059669; border-radius: 9999px; padding: 3px 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.25); display: flex; align-items: center; gap: 4px; margin-bottom: 2px;">
                  <span class="p-name" style="font-weight: 900; font-size: 11px; color: #111827; white-space: nowrap;">${escapeHtml(player.name)}</span>
                  <span class="p-district" style="background: #d1fae5; color: #065f46; font-size: 9px; font-weight: 800; padding: 1px 5px; border-radius: 6px; white-space: nowrap;">${escapeHtml(player.district)}</span>
                </div>
                <!-- Stem -->
                <div style="width: 2px; height: 5px; background: #059669;"></div>
                <!-- Avatar Circular Beacon Pin -->
                <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
                  <div style="position: absolute; width: 34px; height: 34px; border-radius: 50%; background: rgba(14, 165, 233, 0.4); animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
                  <div style="width: 30px; height: 30px; border-radius: 50%; background: linear-gradient(135deg, #0284c7, #4f46e5); border: 2px solid #ffffff; box-shadow: 0 4px 10px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; color: white; font-weight: 900; font-size: 13px;">
                    ${escapeHtml(player.name.charAt(0).toUpperCase())}
                  </div>
                  <div style="position: absolute; bottom: -3px; width: 0; height: 0; border-left: 4px solid transparent; border-right: 4px solid transparent; border-top: 5px solid #4f46e5;"></div>
                </div>
              </div>
            `;

            el.addEventListener('click', (ev) => {
              ev.stopPropagation();
              if (onSelectPlayer) {
                onSelectPlayer(player);
              }
            });

            marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
              .setLngLat([player.lng, player.lat])
              .addTo(mapInst);

            remoteMarkersRef.current.set(player.id, marker);
          } else {
            marker.setLngLat([player.lng, player.lat]);
            const nameEl = marker.getElement().querySelector('.p-name');
            if (nameEl && nameEl.textContent !== player.name) {
              nameEl.textContent = player.name;
            }
            const distEl = marker.getElement().querySelector('.p-district');
            if (distEl && distEl.textContent !== player.district) {
              distEl.textContent = player.district;
            }
          }
        }
      }

      // Cleanup disconnected peers
      for (const [id, marker] of remoteMarkersRef.current) {
        if (!activePeerIds.has(id)) {
          marker.remove();
          remoteMarkersRef.current.delete(id);
        }
      }
    }, [remotePlayers, onSelectPlayer]);

    // Sync local player 2D pin on map
    useEffect(() => {
      const mapInst = map.current;
      if (!mapInst || !localPlayer) {
        if (localMarkerRef.current) {
          localMarkerRef.current.remove();
          localMarkerRef.current = null;
        }
        return;
      }

      const pLat = threeLayer.current ? threeLayer.current.playerLat : playerCoordsRef.current.lat;
      const pLng = threeLayer.current ? threeLayer.current.playerLng : playerCoordsRef.current.lng;

      if (!localMarkerRef.current) {
        const el = document.createElement('div');
        el.className = 'snap-local-marker';
        el.style.pointerEvents = 'none';

        el.innerHTML = `
          <div style="display: flex; flex-direction: column; align-items: center; user-select: none; transform: translateY(-4px);">
            <div style="background: #059669; border: 1.5px solid #ffffff; border-radius: 9999px; padding: 3px 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.25); display: flex; align-items: center; gap: 4px; margin-bottom: 2px;">
              <span style="font-weight: 900; font-size: 11px; color: #ffffff; white-space: nowrap;">${escapeHtml(localPlayer.name)}</span>
              <span style="background: #064e3b; color: #a7f3d0; font-size: 9px; font-weight: 800; padding: 1px 5px; border-radius: 6px; white-space: nowrap;">നിങ്ങൾ (You)</span>
            </div>
            <div style="width: 2px; height: 5px; background: #059669;"></div>
            <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
              <div style="position: absolute; width: 34px; height: 34px; border-radius: 50%; background: rgba(5, 150, 105, 0.4); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
              <div style="width: 30px; height: 30px; border-radius: 50%; background: linear-gradient(135deg, #10b981, #059669); border: 2px solid #ffffff; box-shadow: 0 4px 10px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; color: white; font-size: 14px;">
                😎
              </div>
              <div style="position: absolute; bottom: -3px; width: 0; height: 0; border-left: 4px solid transparent; border-right: 4px solid transparent; border-top: 5px solid #059669;"></div>
            </div>
          </div>
        `;

        localMarkerRef.current = new maplibregl.Marker({ element: el, anchor: 'bottom' })
          .setLngLat([pLng, pLat])
          .addTo(mapInst);
      } else {
        localMarkerRef.current.setLngLat([pLng, pLat]);
      }
    }, [localPlayer, currentLocation]);

    // Handle location preset changes
    useEffect(() => {
      if (isTeleportingRef.current) return;
      if (map.current && threeLayer.current) {
        playerCoordsRef.current = { lat: currentLocation.lat, lng: currentLocation.lng };
        const zoom = WIDEN_CONFIG[widenLevelRef.current].zoom;
        const pitch = is3DRef.current
          ? WIDEN_CONFIG[widenLevelRef.current].pitch
          : 0;
        const bearing = map.current.getBearing();
        const targetCenter = getTargetCenter(currentLocation.lat, currentLocation.lng, bearing, widenLevelRef.current);

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
