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

export type WidenLevel = '2x' | '5x' | '10x' | 'map';

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
  '2x': { zoom: 20.2, pitch: 66, lookAhead: 4.5, label: '2x', desc: 'Close-up 3D View' },
  '5x': { zoom: 19.0, pitch: 52, lookAhead: 3.0, label: '5x', desc: 'Drone Overview' },
  '10x': { zoom: 17.2, pitch: 32, lookAhead: 0, label: '10x', desc: 'Max Tactical View' },
  'map': { zoom: 11.5, pitch: 0, lookAhead: 0, label: '🗺️', desc: '2D Tactical Map' },
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
  widen: WidenLevel | number
): [number, number] => {
  const lookAhead = typeof widen === 'number' ? widen : (WIDEN_CONFIG[widen]?.lookAhead || 0);
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
  recenterCamera: () => void;
  rotateBy: (degrees: number) => void;
  resetRotation: () => void;
  toggleRotateMode: () => boolean;
  moveInDirection: (dirX: number, dirZ: number, isMoving: boolean, dt?: number, sUp?: number, sRight?: number) => void;
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
  isMuted?: boolean;
  isSpeaking?: boolean;
  onSelectPlayer?: (player: RemotePlayerData) => void;
}

export const SnapMapCanvas = forwardRef<SnapMapCanvasRef, SnapMapCanvasProps>(
  ({ currentLocation, onPlayerMove, resetTrigger, remotePlayers, localPlayer, isMuted, isSpeaking, onSelectPlayer }, ref) => {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<maplibregl.Map | null>(null);
    const threeLayer = useRef<ThreeMapLayer | null>(null);
    const is3DRef = useRef<boolean>(true);
    const isRotateModeRef = useRef<boolean>(false);
    const isManualInteractingRef = useRef<boolean>(false);
    const lastManualLookTimeRef = useRef<number>(0);
    const isTeleportingRef = useRef<boolean>(false);
    const widenLevelRef = useRef<WidenLevel>('2x');
    const tierRef = useRef<PerformanceTier>(detectDeviceTier());
    const playerCoordsRef = useRef<{ lat: number; lng: number }>({
      lat: currentLocation.lat,
      lng: currentLocation.lng,
    });

    const syncMarkerVisibility = (isMapMode: boolean) => {
      const display = isMapMode ? 'block' : 'none';
      if (localMarkerRef.current) {
        localMarkerRef.current.getElement().style.display = display;
      }
      for (const marker of remoteMarkersRef.current.values()) {
        marker.getElement().style.display = display;
      }
    };

    /**
     * In Map View: Shows ONLY clean main highways & trunk corridors, eliminating minor road/building clutter.
     */
    const updateMapRoadsMode = (isMapMode: boolean) => {
      if (!map.current) return;
      const mapInst = map.current;
      try {
        if (mapInst.getLayer('road_minor')) {
          mapInst.setLayoutProperty('road_minor', 'visibility', isMapMode ? 'none' : 'visible');
        }
        if (mapInst.getLayer('road_major_lanes')) {
          mapInst.setLayoutProperty('road_major_lanes', 'visibility', isMapMode ? 'none' : 'visible');
        }
        if (mapInst.getLayer('road_major_center')) {
          mapInst.setLayoutProperty('road_major_center', 'visibility', isMapMode ? 'none' : 'visible');
        }
        if (mapInst.getLayer('2d-buildings')) {
          mapInst.setLayoutProperty('2d-buildings', 'visibility', isMapMode ? 'none' : 'visible');
        }
        if (mapInst.getLayer('road_label')) {
          mapInst.setLayoutProperty('road_label', 'visibility', isMapMode ? 'none' : 'visible');
        }
        if (mapInst.getLayer('road_major')) {
          mapInst.setFilter('road_major', ['match', ['get', 'class'], ['motorway', 'trunk', 'primary'], true, false]);
        }
        if (mapInst.getLayer('road_major_casing')) {
          mapInst.setFilter('road_major_casing', ['match', ['get', 'class'], ['motorway', 'trunk', 'primary'], true, false]);
        }
      } catch (_) {}
    };

    // Keep local 3D nameplate voice and profile state in sync
    useEffect(() => {
      if (threeLayer.current && localPlayer) {
        threeLayer.current.setLocalProfile(localPlayer.name, localPlayer.district);
      }
    }, [localPlayer]);

    useEffect(() => {
      if (threeLayer.current) {
        threeLayer.current.setLocalVoiceState(!!isMuted, !!isSpeaking);
      }
    }, [isMuted, isSpeaking]);

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
      recenterCamera: () => {
        if (!map.current || !threeLayer.current) return;
        const pLat = threeLayer.current.playerLat;
        const pLng = threeLayer.current.playerLng;
        const heading = threeLayer.current.character.getHeading();
        const compassDeg = Math.round(((Math.atan2(Math.sin(heading), -Math.cos(heading)) * 180 / Math.PI) + 360) % 360);
        const isDriving = threeLayer.current.isDriving();
        const cfg = WIDEN_CONFIG[widenLevelRef.current] || WIDEN_CONFIG['2x'];
        const lookAhead = isDriving ? 7.5 : (cfg.lookAhead || 4.5);
        const targetPitch = isDriving ? 64 : cfg.pitch;
        const targetCenter = getTargetCenter(pLat, pLng, compassDeg, lookAhead);
        map.current.easeTo({
          center: targetCenter,
          bearing: compassDeg,
          pitch: targetPitch,
          duration: 600,
        });
      },
      recenter: () => {
        if (!map.current) return;
        const lat = threeLayer.current ? threeLayer.current.playerLat : playerCoordsRef.current.lat;
        const lng = threeLayer.current ? threeLayer.current.playerLng : playerCoordsRef.current.lng;
        if (widenLevelRef.current === 'map') {
          map.current.flyTo({
            center: [lng, lat],
            zoom: WIDEN_CONFIG.map.zoom,
            pitch: 0,
            duration: 800,
          });
        } else {
          is3DRef.current = true;
          threeLayer.current?.set3DMode(true);
          const heading = threeLayer.current ? threeLayer.current.character.getHeading() : 0;
          const compassDeg = Math.round(((Math.atan2(Math.sin(heading), -Math.cos(heading)) * 180 / Math.PI) + 360) % 360);
          const isDriving = threeLayer.current ? threeLayer.current.isDriving() : false;
          const cfg = WIDEN_CONFIG[widenLevelRef.current];
          const lookAhead = isDriving ? 7.5 : (cfg.lookAhead || 4.5);
          const pitch = isDriving ? 64 : cfg.pitch;
          const targetCenter = getTargetCenter(lat, lng, compassDeg, lookAhead);
          map.current.flyTo({
            center: targetCenter,
            zoom: cfg.zoom,
            pitch,
            bearing: compassDeg,
            duration: 800,
          });
        }
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
        const cfg = WIDEN_CONFIG[level];

        if (level === 'map') {
          isTeleportingRef.current = true;
          is3DRef.current = false;
          threeLayer.current?.set3DMode(false);
          syncMarkerVisibility(true);
          updateMapRoadsMode(true);
          map.current.dragPan.enable();
          map.current.touchZoomRotate.enable();
          map.current.touchPitch.enable();
          const pLat = threeLayer.current ? threeLayer.current.playerLat : playerCoordsRef.current.lat;
          const pLng = threeLayer.current ? threeLayer.current.playerLng : playerCoordsRef.current.lng;
          map.current.flyTo({
            center: [pLng, pLat],
            zoom: cfg.zoom,
            pitch: 0,
            duration: 650,
          });
          setTimeout(() => {
            isTeleportingRef.current = false;
          }, 700);
        } else {
          isTeleportingRef.current = true;
          is3DRef.current = true;
          syncMarkerVisibility(false);
          updateMapRoadsMode(false);
          map.current.dragPan.disable();
          map.current.touchZoomRotate.disable();
          map.current.touchPitch.disable();
          map.current.dragRotate.disable();

          const pLat = threeLayer.current ? threeLayer.current.playerLat : playerCoordsRef.current.lat;
          const pLng = threeLayer.current ? threeLayer.current.playerLng : playerCoordsRef.current.lng;
          playerCoordsRef.current = { lat: pLat, lng: pLng };

          if (threeLayer.current) {
            threeLayer.current.setOrigin(pLat, pLng);
            threeLayer.current.updatePlayerPosition(pLat, pLng, true);
            threeLayer.current.set3DMode(true);
          }

          const heading = threeLayer.current ? threeLayer.current.character.getHeading() : 0;
          const compassDeg = Math.round(((Math.atan2(Math.sin(heading), -Math.cos(heading)) * 180 / Math.PI) + 360) % 360);
          const isDriving = threeLayer.current ? threeLayer.current.isDriving() : false;
          const lookAhead = isDriving ? 7.5 : (cfg.lookAhead || 4.5);
          const pitch = isDriving ? 64 : cfg.pitch;
          const targetCenter = getTargetCenter(pLat, pLng, compassDeg, lookAhead);

          map.current.flyTo({
            center: targetCenter,
            zoom: cfg.zoom,
            pitch,
            bearing: compassDeg,
            duration: 700,
          });

          if (localMarkerRef.current) {
            localMarkerRef.current.setLngLat([pLng, pLat]);
          }

          setTimeout(() => {
            isTeleportingRef.current = false;
            if (threeLayer.current && map.current) {
              threeLayer.current.set3DMode(true);
              threeLayer.current.updatePlayerPosition(pLat, pLng, true);
              map.current.triggerRepaint();
            }
          }, 750);
        }
      },
      getWidenLevel: () => widenLevelRef.current,
      getThreeLayer: () => threeLayer.current,
      flyToLocation: (lat: number, lng: number, zoom = 18.2) => {
        if (!map.current) return;
        if (zoom >= 16.2) {
          is3DRef.current = true;
          threeLayer.current?.set3DMode(true);
          syncMarkerVisibility(false);
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

        // Always lock into 2x 3D View when going to a player
        widenLevelRef.current = '2x';
        is3DRef.current = true;
        threeLayer.current.set3DMode(true);
        syncMarkerVisibility(false);
        map.current.dragPan.disable();
        threeLayer.current.setOrigin(lat, lng);
        threeLayer.current.updatePlayerPosition(lat, lng, true);

        const cfg = WIDEN_CONFIG['2x'];
        const heading = threeLayer.current.character.getHeading();
        const compassDeg = Math.round(((Math.atan2(Math.sin(heading), -Math.cos(heading)) * 180 / Math.PI) + 360) % 360);
        const targetCenter = getTargetCenter(lat, lng, compassDeg, cfg.lookAhead);

        map.current.jumpTo({
          center: targetCenter,
          zoom: cfg.zoom,
          pitch: cfg.pitch,
          bearing: compassDeg,
        });

        if (localMarkerRef.current) {
          localMarkerRef.current.setLngLat([lng, lat]);
        }

        threeLayer.current.updatePlayerPosition(lat, lng, true);
        map.current.triggerRepaint();

        setTimeout(() => {
          isTeleportingRef.current = false;
        }, 600);
      },
      moveInDirection: (dirX: number, dirZ: number, isMoving: boolean, dt?: number, sUp?: number, sRight?: number) => {
        if (!threeLayer.current) return;
        if (isMoving) {
          // Cancel tap-to-walk destination if user takes joystick control
          threeLayer.current.isWalking = false;

          const delta = dt && dt > 0 && dt < 0.1 ? dt : 0.016;
          threeLayer.current.moveInDirection(dirX, dirZ, delta);
          const pLat = threeLayer.current.playerLat;
          const pLng = threeLayer.current.playerLng;
          playerCoordsRef.current = { lat: pLat, lng: pLng };

          const heading = threeLayer.current.character.getHeading();
          const compassDeg = Math.round(((Math.atan2(Math.sin(heading), -Math.cos(heading)) * 180 / Math.PI) + 360) % 360);

          if (localMarkerRef.current) {
            localMarkerRef.current.setLngLat([pLng, pLat]);
            const arrowEl = localMarkerRef.current.getElement().querySelector('.heading-arrow') as HTMLElement | null;
            if (arrowEl) {
              arrowEl.style.transform = `rotate(${compassDeg}deg)`;
            }
          }

          // True TPP camera follow locked to character and vehicle
          if (map.current && widenLevelRef.current !== 'map') {
            const currentBearing = map.current.getBearing();
            let newBearing = currentBearing;
            const isDriving = threeLayer.current.isDriving();
            const now = performance.now();

            // Smoothly align camera behind character/vehicle when not actively swiping
            if (!isManualInteractingRef.current && (now - lastManualLookTimeRef.current) > 350) {
              let diff = compassDeg - currentBearing;
              while (diff < -180) diff += 360;
              while (diff > 180) diff -= 360;

              if (isDriving) {
                // Vehicle auto-rickshaw: smooth, weighted turn follow (clamped to prevent rapid spinning)
                const turnSpeed = 1.6;
                const maxTurnPerSec = 50; // max 50 deg/sec
                const maxTurn = maxTurnPerSec * delta;
                const step = Math.sign(diff) * Math.min(Math.abs(diff * delta * turnSpeed), maxTurn);
                newBearing = Math.abs(diff) > 0.05
                  ? (currentBearing + step + 360) % 360
                  : currentBearing;
              } else {
                // Walking mode:
                // Only gently rotate camera when moving primarily forward (sUp > 0.45 and |sRight| < 0.45)
                // When strafing/walking sideways or backwards, keep camera steady so it doesn't spin wildly!
                const isMovingForward = (sUp === undefined) || (sUp > 0.45 && Math.abs(sRight || 0) < 0.45);
                if (isMovingForward) {
                  const turnSpeed = 1.2; // Gentle, slow turning
                  const maxTurnPerSec = 30; // max 30 deg/sec
                  const maxTurn = maxTurnPerSec * delta;
                  const step = Math.sign(diff) * Math.min(Math.abs(diff * delta * turnSpeed), maxTurn);
                  newBearing = Math.abs(diff) > 0.05
                    ? (currentBearing + step + 360) % 360
                    : currentBearing;
                }
              }
            }

            const basePitch = isDriving ? 64 : (is3DRef.current ? WIDEN_CONFIG[widenLevelRef.current].pitch : 0);
            const lookAheadMeters = isDriving ? 7.5 : (WIDEN_CONFIG[widenLevelRef.current]?.lookAhead || 4.5);
            const targetCenter = getTargetCenter(pLat, pLng, newBearing, lookAheadMeters);

            map.current.jumpTo({
              center: targetCenter,
              bearing: newBearing,
              pitch: basePitch,
            });
          }
          if (onPlayerMove) {
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
        // Smoothly adapt camera between walking and driving view
        if (map.current && widenLevelRef.current === '2x') {
          const pLat = threeLayer.current.playerLat;
          const pLng = threeLayer.current.playerLng;
          const heading = threeLayer.current.character.getHeading();
          const compassDeg = Math.round(((Math.atan2(Math.sin(heading), -Math.cos(heading)) * 180 / Math.PI) + 360) % 360);
          const lookAhead = res ? 7.5 : 4.5;
          const pitch = res ? 64 : 66;
          const zoom = res ? 19.8 : 20.2;
          const targetCenter = getTargetCenter(pLat, pLng, compassDeg, lookAhead);
          map.current.easeTo({
            center: targetCenter,
            bearing: compassDeg,
            pitch,
            zoom,
            duration: 600,
          });
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

    // Smooth dedicated camera follow loop for tap-to-walk & settle
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
          const pLng = threeLayer.current.playerLng;
          const pLat = threeLayer.current.playerLat;
          playerCoordsRef.current = { lat: pLat, lng: pLng };

          const heading = threeLayer.current.character.getHeading();
          const compassDeg = Math.round(((Math.atan2(Math.sin(heading), -Math.cos(heading)) * 180 / Math.PI) + 360) % 360);

          if (localMarkerRef.current) {
            localMarkerRef.current.setLngLat([pLng, pLat]);
            const arrowEl = localMarkerRef.current.getElement().querySelector('.heading-arrow') as HTMLElement | null;
            if (arrowEl) {
              arrowEl.style.transform = `rotate(${compassDeg}deg)`;
            }
          }

          if (onPlayerMove) {
            onPlayerMove(
              pLat,
              pLng,
              heading,
              moved,
              threeLayer.current.isDriving()
            );
          }

          if (moved && widenLevelRef.current !== 'map') {
            const currentBearing = map.current.getBearing();
            let newBearing = currentBearing;
            const isDriving = threeLayer.current.isDriving();

            if (!isManualInteractingRef.current && (now - lastManualLookTimeRef.current) > 350) {
              let diff = compassDeg - currentBearing;
              while (diff < -180) diff += 360;
              while (diff > 180) diff -= 360;

              if (isDriving) {
                const turnSpeed = 1.6;
                const maxTurn = 50 * delta;
                const step = Math.sign(diff) * Math.min(Math.abs(diff * delta * turnSpeed), maxTurn);
                newBearing = Math.abs(diff) > 0.05 ? (currentBearing + step + 360) % 360 : currentBearing;
              } else {
                const turnSpeed = 1.2;
                const maxTurn = 30 * delta;
                const step = Math.sign(diff) * Math.min(Math.abs(diff * delta * turnSpeed), maxTurn);
                newBearing = Math.abs(diff) > 0.05 ? (currentBearing + step + 360) % 360 : currentBearing;
              }
            }

            const basePitch = isDriving ? 64 : (is3DRef.current ? WIDEN_CONFIG[widenLevelRef.current].pitch : 0);
            const lookAhead = isDriving ? 7.5 : (WIDEN_CONFIG[widenLevelRef.current]?.lookAhead || 4.5);
            const targetCenter = getTargetCenter(pLat, pLng, newBearing, lookAhead);
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
      let cleanupOrbitListeners: (() => void) | null = null;

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
          dragRotate: false,
          pitchWithRotate: false,
          touchZoomRotate: false,
          touchPitch: false,
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
          if (localPlayer) {
            layer.setLocalProfile(localPlayer.name, localPlayer.district);
          }
          layer.setLocalVoiceState(!!isMuted, !!isSpeaking);
          syncMarkerVisibility(widenLevelRef.current === 'map');
          updateMapRoadsMode(widenLevelRef.current === 'map');
        });

        // Dynamic 2D/3D zoom sync on manual user zoom end
        const checkZoomAndMode = () => {
          if (!map.current || isTeleportingRef.current || isManualInteractingRef.current) return;
          // If the user has an explicit 3D view selected (2x, 5x, 10x), do NOT force pitch to 0 or cancel 3D!
          if (widenLevelRef.current !== 'map') return;

          const currentZoom = map.current.getZoom();
          const isCloseEnoughFor3D = currentZoom >= 16.2;

          if (isCloseEnoughFor3D && !is3DRef.current) {
            is3DRef.current = true;
            threeLayer.current?.set3DMode(true);
            syncMarkerVisibility(false);
            updateMapRoadsMode(false);
          } else if (!isCloseEnoughFor3D && is3DRef.current) {
            is3DRef.current = false;
            threeLayer.current?.set3DMode(false);
            syncMarkerVisibility(true);
            updateMapRoadsMode(true);
          }
        };

        mapInstance.on('zoomend', checkZoomAndMode);

        // Tap or click to walk/move avatar (active only in 3D character mode, disabled in 2D map overview)
        mapInstance.on('click', (e) => {
          if (!mapInstance || !threeLayer.current || isRotateModeRef.current || widenLevelRef.current === 'map') return;

          const { lng, lat } = e.lngLat;
          playerCoordsRef.current = { lat, lng };

          // Tell character to walk towards tapped location
          threeLayer.current.updatePlayerPosition(lat, lng);

          if (onPlayerMove) {
            const heading = threeLayer.current.character.getHeading();
            onPlayerMove(lat, lng, heading, true, threeLayer.current.isDriving());
          }
        });

        // Mobile & Desktop Swipe-to-Rotate Look-Around in 3D (Right-Thumb & Upper screen orbit zone)
        let orbitPointerId: number | null = null;
        let startX = 0;
        let startY = 0;
        let startBearing = 0;
        let startPitch = 75;

        const container = mapContainer.current;

        const onPointerDown = (e: PointerEvent) => {
          if (!map.current || !is3DRef.current) return;
          // If already tracking an orbit finger, ignore additional touches
          if (orbitPointerId !== null) return;

          // Ignore if pointer is on/inside any interactive UI element or joystick
          const target = e.target as HTMLElement | null;
          if (target && target.closest('.virtual-joystick-zone, button, input, [role="button"]')) return;

          // Also check bottom-left virtual joystick zone coordinates
          const isJoystickZone =
            e.clientX < Math.min(window.innerWidth * 0.48, 250) &&
            e.clientY > window.innerHeight - Math.min(window.innerHeight * 0.40, 280);
          if (isJoystickZone) return;

          orbitPointerId = e.pointerId;
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
          // Strictly only process the designated orbit finger (never joystick finger!)
          if (orbitPointerId === null || e.pointerId !== orbitPointerId || !map.current || !is3DRef.current) return;
          const dx = e.clientX - startX;
          const dy = e.clientY - startY;

          // Smooth, comfortable sensitivity for thumb orbit look-around
          const newBearing = (startBearing - dx * 0.22 + 360) % 360;
          const newPitch = Math.max(25, Math.min(78, startPitch - dy * 0.18));

          const pLat = threeLayer.current ? threeLayer.current.playerLat : playerCoordsRef.current.lat;
          const pLng = threeLayer.current ? threeLayer.current.playerLng : playerCoordsRef.current.lng;
          const isDriving = threeLayer.current ? threeLayer.current.isDriving() : false;
          const lookAhead = isDriving ? 7.5 : (WIDEN_CONFIG[widenLevelRef.current]?.lookAhead || 4.5);
          const targetCenter = getTargetCenter(pLat, pLng, newBearing, lookAhead);

          map.current.jumpTo({
            center: targetCenter,
            bearing: newBearing,
            pitch: newPitch,
          });
        };

        const onPointerUp = (e: PointerEvent) => {
          if (orbitPointerId === null || e.pointerId !== orbitPointerId) return;
          try {
            container.releasePointerCapture(e.pointerId);
          } catch (_) {}
          orbitPointerId = null;
          lastManualLookTimeRef.current = performance.now();
          setTimeout(() => {
            setManualInteraction(false);
          }, 350);
        };

        container.addEventListener('pointerdown', onPointerDown);
        container.addEventListener('pointermove', onPointerMove);
        container.addEventListener('pointerup', onPointerUp);
        container.addEventListener('pointercancel', onPointerUp);

        cleanupOrbitListeners = () => {
          container.removeEventListener('pointerdown', onPointerDown);
          container.removeEventListener('pointermove', onPointerMove);
          container.removeEventListener('pointerup', onPointerUp);
          container.removeEventListener('pointercancel', onPointerUp);
        };
      }

      return () => {
        if (cleanupOrbitListeners) {
          cleanupOrbitListeners();
        }
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

          const heading = player.heading || 0;
          const compassDeg = Math.round(((Math.atan2(Math.sin(heading), -Math.cos(heading)) * 180 / Math.PI) + 360) % 360);

          const voiceHtml = player.isMuted
            ? '<span class="p-voice" style="color: #ef4444; font-size: 10px;">🔇</span>'
            : player.isSpeaking
            ? '<span class="p-voice" style="color: #4ade80; font-size: 10px; animation: pulse 0.7s infinite;">🟢</span>'
            : '<span class="p-voice" style="color: #94a3b8; font-size: 10px;">🎤</span>';

          const driveHtml = player.isDriving
            ? '<span class="p-driving" style="font-size: 10px; margin-left: 2px;">🛺</span>'
            : '<span class="p-driving" style="display: none;"></span>';

          let marker = remoteMarkersRef.current.get(player.id);
          if (!marker) {
            const el = document.createElement('div');
            el.className = 'snap-player-marker';
            el.style.cursor = 'pointer';
            el.style.pointerEvents = 'auto';
            el.style.display = widenLevelRef.current === 'map' ? 'block' : 'none';

            el.innerHTML = `
              <div style="display: flex; flex-direction: column; align-items: center; user-select: none; transform: translateY(-4px); transition: transform 0.2s ease;">
                <!-- PUBG Overhead Nameplate Badge -->
                <div style="background: rgba(17, 24, 39, 0.95); backdrop-filter: blur(8px); border: 1.5px solid #38bdf8; border-radius: 9999px; padding: 2px 8px; box-shadow: 0 4px 14px rgba(0,0,0,0.35); display: flex; align-items: center; gap: 5px; margin-bottom: 2px;">
                  <span class="p-voice-wrap">${voiceHtml}</span>
                  <span class="p-name" style="font-weight: 900; font-size: 11px; color: #ffffff; white-space: nowrap;">${escapeHtml(player.name)}</span>
                  <span class="p-district" style="background: rgba(56, 189, 248, 0.25); color: #bae6fd; font-size: 9px; font-weight: 800; padding: 1px 5px; border-radius: 6px; white-space: nowrap;">${escapeHtml(player.district)}</span>
                  <span class="p-drive-wrap">${driveHtml}</span>
                </div>
                <!-- Stem -->
                <div style="width: 2px; height: 4px; background: #38bdf8;"></div>
                <!-- Directional Pin with Heading Cone -->
                <div style="position: relative; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center;">
                  <div class="heading-arrow" style="position: absolute; inset: 0; display: flex; justify-content: center; align-items: flex-start; pointer-events: none; transform: rotate(${compassDeg}deg); transition: transform 0.15s ease-out;">
                    <div style="width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-bottom: 12px solid #0284c7; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));"></div>
                  </div>
                  <div class="p-ping" style="position: absolute; width: 30px; height: 30px; border-radius: 50%; background: ${player.isSpeaking ? 'rgba(34, 197, 94, 0.6)' : 'rgba(2, 132, 199, 0.4)'}; animation: ping ${player.isSpeaking ? '0.9s' : '2s'} cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
                  <div class="p-avatar-circle" style="position: relative; width: 26px; height: 26px; border-radius: 50%; background: ${player.isSpeaking ? 'linear-gradient(135deg, #22c55e, #15803d)' : 'linear-gradient(135deg, #0284c7, #4f46e5)'}; border: 2.5px solid #ffffff; box-shadow: 0 4px 10px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; color: white; font-weight: 900; font-size: 12px;">
                    ${escapeHtml(player.name.charAt(0).toUpperCase())}
                  </div>
                </div>
              </div>
            `;

            el.addEventListener('click', (ev) => {
              ev.stopPropagation();
              if (onSelectPlayer) {
                const latest = (marker as any)?.__playerData || player;
                onSelectPlayer(latest);
              }
            });

            marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
              .setLngLat([player.lng, player.lat])
              .addTo(mapInst);

            (marker as any).__playerData = player;
            remoteMarkersRef.current.set(player.id, marker);
          } else {
            (marker as any).__playerData = player;
            marker.setLngLat([player.lng, player.lat]);
            const el = marker.getElement();
            el.style.display = widenLevelRef.current === 'map' ? 'block' : 'none';
            const nameEl = el.querySelector('.p-name');
            if (nameEl && nameEl.textContent !== player.name) {
              nameEl.textContent = player.name;
            }
            const distEl = el.querySelector('.p-district');
            if (distEl && distEl.textContent !== player.district) {
              distEl.textContent = player.district;
            }
            const voiceWrap = el.querySelector('.p-voice-wrap');
            if (voiceWrap) {
              voiceWrap.innerHTML = voiceHtml;
            }
            const driveWrap = el.querySelector('.p-drive-wrap');
            if (driveWrap) {
              driveWrap.innerHTML = driveHtml;
            }
            const arrowEl = el.querySelector('.heading-arrow') as HTMLElement | null;
            if (arrowEl) {
              arrowEl.style.transform = `rotate(${compassDeg}deg)`;
            }
            const pingEl = el.querySelector('.p-ping') as HTMLElement | null;
            if (pingEl) {
              pingEl.style.background = player.isSpeaking ? 'rgba(34, 197, 94, 0.6)' : 'rgba(2, 132, 199, 0.4)';
              pingEl.style.animationDuration = player.isSpeaking ? '0.9s' : '2s';
            }
            const avatarCircle = el.querySelector('.p-avatar-circle') as HTMLElement | null;
            if (avatarCircle) {
              avatarCircle.style.background = player.isSpeaking ? 'linear-gradient(135deg, #22c55e, #15803d)' : 'linear-gradient(135deg, #0284c7, #4f46e5)';
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
      const heading = threeLayer.current ? threeLayer.current.character.getHeading() : 0;
      const compassDeg = Math.round(((Math.atan2(Math.sin(heading), -Math.cos(heading)) * 180 / Math.PI) + 360) % 360);

      if (!localMarkerRef.current) {
        const el = document.createElement('div');
        el.className = 'snap-local-marker';
        el.style.pointerEvents = 'none';
        el.style.display = widenLevelRef.current === 'map' ? 'block' : 'none';

        el.innerHTML = `
          <div style="display: flex; flex-direction: column; align-items: center; user-select: none; transform: translateY(-4px);">
            <div style="background: rgba(6, 78, 59, 0.95); backdrop-filter: blur(8px); border: 1.5px solid #34d399; border-radius: 9999px; padding: 2px 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); display: flex; align-items: center; gap: 4px; margin-bottom: 2px;">
              <span class="local-p-name" style="font-weight: 900; font-size: 11px; color: #ffffff; white-space: nowrap;">${escapeHtml(localPlayer.name)}</span>
              <span style="background: #047857; color: #a7f3d0; font-size: 9px; font-weight: 800; padding: 1px 5px; border-radius: 6px; white-space: nowrap;">നിങ്ങൾ (You)</span>
            </div>
            <div style="width: 2px; height: 4px; background: #34d399;"></div>
            <div style="position: relative; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center;">
              <div class="heading-arrow" style="position: absolute; inset: 0; display: flex; justify-content: center; align-items: flex-start; pointer-events: none; transform: rotate(${compassDeg}deg); transition: transform 0.1s linear;">
                <div style="width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-bottom: 12px solid #10b981; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));"></div>
              </div>
              <div style="position: absolute; width: 30px; height: 30px; border-radius: 50%; background: rgba(16, 185, 129, 0.45); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
              <div style="position: relative; width: 26px; height: 26px; border-radius: 50%; background: linear-gradient(135deg, #10b981, #047857); border: 2.5px solid #ffffff; box-shadow: 0 4px 10px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; color: white; font-size: 13px;">
                😎
              </div>
            </div>
          </div>
        `;

        localMarkerRef.current = new maplibregl.Marker({ element: el, anchor: 'bottom' })
          .setLngLat([pLng, pLat])
          .addTo(mapInst);
      } else {
        localMarkerRef.current.setLngLat([pLng, pLat]);
        localMarkerRef.current.getElement().style.display = widenLevelRef.current === 'map' ? 'block' : 'none';
        const arrowEl = localMarkerRef.current.getElement().querySelector('.heading-arrow') as HTMLElement | null;
        if (arrowEl) {
          arrowEl.style.transform = `rotate(${compassDeg}deg)`;
        }
        const nameEl = localMarkerRef.current.getElement().querySelector('.local-p-name');
        if (nameEl && nameEl.textContent !== localPlayer.name) {
          nameEl.textContent = localPlayer.name;
        }
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
