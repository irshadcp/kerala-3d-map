import React, { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Zap,
  ArrowBigUp,
  Move,
  RotateCw,
  Car,
  LogOut,
  ParkingSquare,
} from 'lucide-react';
import { LocationPreset, GAME_CONFIG, KERALA_BOUNDS } from '../config/gameConfig';
import { IMapProvider } from '../providers/MapProvider';
import { ThreeMapLayer } from '../graphics/ThreeMapLayer';
import { InputManager } from '../core/InputManager';
import { PlayerState } from '../core/CharacterController';
import { GeoCoords } from '../core/geoCoords';
import { Compass } from './Compass';
import { DataDebugInspector } from './DataDebugInspector';
import { WorldValidationInspector } from './WorldValidationInspector';
import { NormalizedBuilding, ValidationReport, WorldCompileReport } from '../core/geoTypes';
import { SoundManager } from '../core/SoundManager';
import { GTAMinimap } from './GTAMinimap';

export type CameraMode = 'tpp' | 'fpp' | '2d';

interface MapGameCanvasProps {
  currentLocation: LocationPreset;
  activeProvider: IMapProvider;
  is3DMode?: boolean;
  cameraMode?: CameraMode;
  onCycleCameraMode?: () => void;
  onPlayerStateChange: (state: PlayerState) => void;
  resetTrigger: number;
}

export const MapGameCanvas: React.FC<MapGameCanvasProps> = ({
  currentLocation,
  activeProvider,
  is3DMode = true,
  cameraMode,
  onCycleCameraMode,
  onPlayerStateChange,
  resetTrigger,
}) => {
  const activeCameraMode: CameraMode = cameraMode || (is3DMode ? 'tpp' : '2d');
  const cameraModeRef = useRef<CameraMode>(activeCameraMode);
  cameraModeRef.current = activeCameraMode;

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const threeLayerRef = useRef<ThreeMapLayer | null>(null);
  const inputManagerRef = useRef<InputManager | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const isTeleportingRef = useRef<boolean>(false);

  // Interaction Mode: 'pan' (Move Map) or 'rotate' (360° Orbit Camera)
  const [interactionMode, setInteractionMode] = useState<'pan' | 'rotate'>('rotate');
  const [isDraggingUI, setIsDraggingUI] = useState<boolean>(false);

  // Vehicle & Driving State
  const [isDriving, setIsDriving] = useState<boolean>(false);
  const [canEnterVehicle, setCanEnterVehicle] = useState<boolean>(false);
  const [canPark, setCanPark] = useState<boolean>(false);
  const [vehicleSpeedKmh, setVehicleSpeedKmh] = useState<number>(0);

  // Data Debug Inspector & World Reconstruction State
  const [isDebugModeActive, setIsDebugModeActive] = useState<boolean>(false);
  const [selectedBuilding, setSelectedBuilding] = useState<NormalizedBuilding | null>(null);
  const [validationReport, setValidationReport] = useState<ValidationReport | null>(null);
  const [compileReport, setCompileReport] = useState<WorldCompileReport | null>(null);

  // Pointer & Drag tracking
  const isDraggingRef = useRef(false);
  const dragDistanceRef = useRef(0);
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const dragInfoRef = useRef<{
    mode: 'pan' | 'rotate';
    startX: number;
    startY: number;
    lastX: number;
    lastY: number;
    bearing: number;
    pitch: number;
  }>({
    mode: 'pan',
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    bearing: 0,
    pitch: 78,
  });

  // Virtual touch controls
  const [touchControls, setTouchControls] = useState<{ forward: number; strafe: number; sprint: boolean; jump: boolean }>({
    forward: 0,
    strafe: 0,
    sprint: false,
    jump: false,
  });

  const [currentBearing, setCurrentBearing] = useState(0);
  const lastUIUpdateTimeRef = useRef<number>(0);

  const [radioStation, setRadioStation] = useState<string>('Radio Off');
  const [livePlayerState, setLivePlayerState] = useState<PlayerState>({
    lat: currentLocation.lat,
    lng: currentLocation.lng,
    x: 0,
    z: 0,
    speed: 0,
    speedKmh: 0,
    headingDeg: 0,
    isMoving: false,
    isSprinting: false,
  });

  // Handle Vehicle Actions
  const handleEnterVehicle = useCallback(() => {
    if (!threeLayerRef.current) return;
    threeLayerRef.current.isDriving = true;
    threeLayerRef.current.characterController.model.group.visible = false;
    threeLayerRef.current.vehicleController.enter();
    SoundManager.getInstance().startEngine();
    SoundManager.getInstance().playBlip();
    setIsDriving(true);
  }, []);

  const handleExitVehicle = useCallback(() => {
    if (!threeLayerRef.current) return;
    const exitPos = threeLayerRef.current.vehicleController.exit();
    threeLayerRef.current.characterController.setPositionFromMap(exitPos.x, exitPos.z, 0.016);
    threeLayerRef.current.characterController.model.group.visible = true;
    threeLayerRef.current.isDriving = false;
    SoundManager.getInstance().stopEngine();
    SoundManager.getInstance().playBlip();
    setIsDriving(false);
  }, []);

  const handleParkVehicle = useCallback(() => {
    if (!threeLayerRef.current) return;
    const vPos = threeLayerRef.current.vehicleController.getPosition();
    const slot = threeLayerRef.current.parkingSystem.findNearestSlot(vPos.x, vPos.z, 14.0);
    if (slot) {
      threeLayerRef.current.parkingSystem.parkVehicle(threeLayerRef.current.vehicleController, slot);
      handleExitVehicle();
    }
  }, [handleExitVehicle]);

  const handleToggleRadio = useCallback(() => {
    const station = SoundManager.getInstance().toggleRadio();
    setRadioStation(station);
  }, []);

  const handleHonk = useCallback(() => {
    SoundManager.getInstance().playHorn();
  }, []);

  // Global Hotkey listeners for Driving, Parking, Radio, Horn, and Debug
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'e' || e.key === 'E') {
        if (isDriving) {
          handleExitVehicle();
        } else if (canEnterVehicle) {
          handleEnterVehicle();
        }
      } else if (e.key === 'p' || e.key === 'P') {
        if (isDriving) {
          handleParkVehicle();
        }
      } else if (e.key === 'h' || e.key === 'H') {
        if (isDriving) {
          handleHonk();
        }
      } else if (e.key === 'r' || e.key === 'R') {
        if (isDriving) {
          handleToggleRadio();
        }
      } else if (e.key === 'F2') {
        setIsDebugModeActive((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDriving, canEnterVehicle, handleEnterVehicle, handleExitVehicle, handleParkVehicle, handleHonk, handleToggleRadio]);

  // Initialize Map and Three.js Layer
  useEffect(() => {
    if (!mapContainerRef.current) return;

    let isDisposed = false;

    const initMap = async () => {
      const style = await activeProvider.getStyle();
      if (isDisposed) return;

      const initialPitch = activeCameraMode === '2d' ? 0 : GAME_CONFIG.tppPitch;
      const initialZoom = activeCameraMode === 'tpp' ? GAME_CONFIG.tppZoom : (currentLocation.zoom || GAME_CONFIG.initialZoom);

      const map = new maplibregl.Map({
        container: mapContainerRef.current!,
        style: style as any,
        center: [currentLocation.lng, currentLocation.lat],
        zoom: initialZoom,
        pitch: initialPitch,
        bearing: currentLocation.bearing || GAME_CONFIG.initialBearing,
        maxPitch: GAME_CONFIG.maxPitch,
        minZoom: GAME_CONFIG.minZoom,
        maxZoom: GAME_CONFIG.maxZoom,
        maxBounds: KERALA_BOUNDS,
        attributionControl: false,
        dragPan: false,
        dragRotate: false,
        pitchWithRotate: false,
        scrollZoom: true,
      });

      mapRef.current = map;

      map.on('rotate', () => {
        setCurrentBearing(map.getBearing());
      });

      // Google Maps / GTA dynamic pitch flattening when zooming out into Overview mode
      map.on('zoom', () => {
        const currentZoom = map.getZoom();
        if (cameraModeRef.current === 'tpp' && !isDraggingRef.current) {
          if (currentZoom <= 15.0) {
            if (map.getPitch() > 0) {
              map.setPitch(0);
            }
          } else if (currentZoom < 20.2) {
            // Smooth transition from GAME_CONFIG.tppPitch (79°) down to 20° at zoom 15.0
            const t = (currentZoom - 15.0) / (20.2 - 15.0);
            const targetPitch = Math.round(20 + t * (GAME_CONFIG.tppPitch - 20));
            map.setPitch(targetPitch);
          }
        }
      });

      const threeLayer = new ThreeMapLayer(currentLocation.lat, currentLocation.lng);
      threeLayerRef.current = threeLayer;

      const onReady = () => {
        if (isDisposed) return;
        if (!map.getLayer(threeLayer.id)) {
          map.addLayer(threeLayer);
        }

        try {
          if (typeof (map as any).setFog === 'function') {
            (map as any).setFog({
              range: [1.2, 9.0],
              color: '#d8edf7',
              'horizon-blend': 0.18,
              'high-color': '#bae6fd',
              'space-color': '#e0f2fe',
            });
          }
        } catch (_e) {}

        if (!inputManagerRef.current) {
          inputManagerRef.current = new InputManager();
          inputManagerRef.current.onTogglePerspective = () => {
            if (onCycleCameraMode) {
              onCycleCameraMode();
            }
          };
          lastTimeRef.current = performance.now();
          startGameLoop();
        }
      };

      map.on('load', onReady);
      map.on('error', (e) => {
        console.error('MapLibre GL error:', e.error || e);
      });
      map.on('style.load', () => {
        if (isDisposed) return;
        if (!map.getLayer(threeLayer.id)) {
          map.addLayer(threeLayer);
        }
      });
    };

    initMap();

    return () => {
      isDisposed = true;
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (inputManagerRef.current) inputManagerRef.current.destroy();
      if (threeLayerRef.current) threeLayerRef.current.destroy();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [activeProvider]);

  // Teleportation
  useEffect(() => {
    if (!mapRef.current || !threeLayerRef.current) return;
    const map = mapRef.current;
    const threeLayer = threeLayerRef.current;

    isTeleportingRef.current = true;
    threeLayer.teleport(currentLocation.lat, currentLocation.lng);
    setIsDriving(false);

    const bearing = currentLocation.bearing || 0;
    const bearingRad = (bearing * Math.PI) / 180;
    const lookAhead =
      activeCameraMode === 'fpp' ? 8.0 : activeCameraMode === 'tpp' ? GAME_CONFIG.tppLookAhead : 0.0;
    const shoulderOffset = activeCameraMode === 'tpp' ? GAME_CONFIG.tppShoulderOffset : 0.0;
    const fwdX = Math.sin(bearingRad);
    const fwdZ = -Math.cos(bearingRad);
    const rightX = Math.cos(bearingRad);
    const rightZ = Math.sin(bearingRad);

    const targetCoords = GeoCoords.toLatLng(
      fwdX * lookAhead + rightX * shoulderOffset,
      fwdZ * lookAhead + rightZ * shoulderOffset,
      currentLocation.lat,
      currentLocation.lng
    );

    map.flyTo({
      center: [targetCoords.lng, targetCoords.lat],
      zoom: activeCameraMode === 'tpp' ? GAME_CONFIG.tppZoom : (currentLocation.zoom || 19.8),
      pitch: activeCameraMode === '2d' ? 0 : (currentLocation.pitch || GAME_CONFIG.tppPitch),
      bearing: bearing,
      essential: true,
      duration: 1200,
    });

    map.once('moveend', () => {
      isTeleportingRef.current = false;
    });
  }, [currentLocation]);

  // Handle Camera Mode Perspective Switching (TPP / FPP / 2D)
  useEffect(() => {
    if (!mapRef.current || !threeLayerRef.current) return;
    const map = mapRef.current;
    const threeLayer = threeLayerRef.current;

    if (activeCameraMode === 'tpp') {
      threeLayer.setCharacterVisible(true);
      map.easeTo({
        pitch: GAME_CONFIG.tppPitch,
        zoom: Math.max(map.getZoom(), GAME_CONFIG.tppZoom),
        duration: 500,
      });
    } else if (activeCameraMode === 'fpp') {
      threeLayer.setCharacterVisible(false);
      map.easeTo({
        pitch: 76,
        zoom: Math.max(map.getZoom(), 21.2),
        duration: 500,
      });
    } else {
      // '2d'
      threeLayer.setCharacterVisible(true);
      map.easeTo({
        pitch: 0,
        duration: 500,
      });
    }
  }, [activeCameraMode]);

  // Handle Reset Position to Center
  useEffect(() => {
    if (resetTrigger === 0 || !threeLayerRef.current || !mapRef.current) return;
    threeLayerRef.current.teleport(currentLocation.lat, currentLocation.lng);
    setIsDriving(false);

    const bearingRad = (currentLocation.bearing * Math.PI) / 180;
    const lookAhead =
      activeCameraMode === 'fpp' ? 8.0 : activeCameraMode === 'tpp' ? GAME_CONFIG.tppLookAhead : 0.0;
    const shoulderOffset = activeCameraMode === 'tpp' ? GAME_CONFIG.tppShoulderOffset : 0.0;
    const fwdX = Math.sin(bearingRad);
    const fwdZ = -Math.cos(bearingRad);
    const rightX = Math.cos(bearingRad);
    const rightZ = Math.sin(bearingRad);

    const targetCoords = GeoCoords.toLatLng(
      fwdX * lookAhead + rightX * shoulderOffset,
      fwdZ * lookAhead + rightZ * shoulderOffset,
      currentLocation.lat,
      currentLocation.lng
    );
    mapRef.current.easeTo({
      center: [targetCoords.lng, targetCoords.lat],
      duration: 400,
    });
  }, [resetTrigger, activeCameraMode]);

  // Update virtual input
  useEffect(() => {
    if (inputManagerRef.current) {
      inputManagerRef.current.setVirtualInput(
        touchControls.forward,
        touchControls.strafe,
        touchControls.sprint,
        touchControls.jump
      );
    }
  }, [touchControls]);

  // Pointer Handlers for Pan, Orbit & Raycasting Inspection
  const handlePointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('.controls-help-container, .compass-container, button, select, input, .interactive-ui')) {
      return;
    }

    const map = mapRef.current;
    if (!map) return;

    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    // In 3D exploration modes (tpp / fpp), dragging orbits & tilts the camera smoothly around the player.
    // In 2D overview mode, dragging pans the map.
    const is3D = cameraModeRef.current !== '2d';
    const isRotate = is3D || interactionMode === 'rotate' || e.button === 2 || e.shiftKey;
    const mode = isRotate ? 'rotate' : 'pan';

    isDraggingRef.current = true;
    setIsDraggingUI(true);

    dragInfoRef.current = {
      mode,
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      bearing: map.getBearing(),
      pitch: map.getPitch(),
    };

    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch (_e) {}
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current || !mapRef.current) return;

    const dx = e.clientX - dragInfoRef.current.lastX;
    const dy = e.clientY - dragInfoRef.current.lastY;
    dragDistanceRef.current += Math.hypot(dx, dy);

    dragInfoRef.current.lastX = e.clientX;
    dragInfoRef.current.lastY = e.clientY;

    const map = mapRef.current;

    if (dragInfoRef.current.mode === 'rotate') {
      const deltaBearing = dx * 0.32;
      const deltaPitch = -dy * 0.20;
      const newBearing = map.getBearing() + deltaBearing;
      const newPitch = Math.max(10, Math.min(84, map.getPitch() + deltaPitch));

      map.setBearing(newBearing);
      map.setPitch(newPitch);
      setCurrentBearing(newBearing);
    }
 else {
      const panFactor = 0.55;
      map.panBy([-dx * panFactor, -dy * panFactor], { duration: 0 });

      // Unrestricted Overview Exploration: dynamically glide/move character with the map!
      if (threeLayerRef.current && !threeLayerRef.current.isDriving) {
        const center = map.getCenter();
        const bearing = map.getBearing();
        const bearingRad = (bearing * Math.PI) / 180;
        const currentZoom = map.getZoom();

        const isClose = currentZoom >= 20.2;
        const lookAhead = isClose ? GAME_CONFIG.tppLookAhead : 0.0;
        const shoulderOffset = isClose ? GAME_CONFIG.tppShoulderOffset : 0.0;
        const fwdX = Math.sin(bearingRad);
        const fwdZ = -Math.cos(bearingRad);
        const rightX = Math.cos(bearingRad);
        const rightZ = Math.sin(bearingRad);

        const origin = threeLayerRef.current.characterController.getOrigin();
        const local = GeoCoords.toLocalMeters(center.lat, center.lng, origin.lat, origin.lng);

        const charX = local.x - fwdX * lookAhead - rightX * shoulderOffset;
        const charZ = local.z - fwdZ * lookAhead - rightZ * shoulderOffset;
        threeLayerRef.current.characterController.setPositionFromMap(charX, charZ, 0.016);
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    activePointersRef.current.delete(e.pointerId);

    // If tap/click without drag, perform Raycasting Inspection
    if (dragDistanceRef.current < 6.0 && threeLayerRef.current && mapContainerRef.current) {
      const rect = mapContainerRef.current.getBoundingClientRect();
      const hit = threeLayerRef.current.raycastBuilding(
        e.clientX - rect.left,
        e.clientY - rect.top,
        rect.width,
        rect.height
      );
      if (hit) {
        setSelectedBuilding(hit);
      }
    }

    if (activePointersRef.current.size === 0) {
      isDraggingRef.current = false;
      setIsDraggingUI(false);

      if (
        dragInfoRef.current.mode === 'pan' &&
        dragDistanceRef.current > 6.0 &&
        threeLayerRef.current &&
        mapRef.current &&
        !threeLayerRef.current.isDriving
      ) {
        const center = mapRef.current.getCenter();
        const bearing = mapRef.current.getBearing();
        const bearingRad = (bearing * Math.PI) / 180;
        const currentZoom = mapRef.current.getZoom();
        const isClose = currentZoom >= 20.2;
        const lookAhead = isClose ? GAME_CONFIG.tppLookAhead : 0.0;
        const shoulderOffset = isClose ? GAME_CONFIG.tppShoulderOffset : 0.0;
        const fwdX = Math.sin(bearingRad);
        const fwdZ = -Math.cos(bearingRad);
        const rightX = Math.cos(bearingRad);
        const rightZ = Math.sin(bearingRad);

        const origin = threeLayerRef.current.characterController.getOrigin();
        const local = GeoCoords.toLocalMeters(center.lat, center.lng, origin.lat, origin.lng);

        const charX = local.x - fwdX * lookAhead - rightX * shoulderOffset;
        const charZ = local.z - fwdZ * lookAhead - rightZ * shoulderOffset;
        threeLayerRef.current.characterController.setPositionFromMap(charX, charZ, 0.016);
        onPlayerStateChange(threeLayerRef.current.characterController.getState());
      }
    }

    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (_e) {}
  };

  // Game Loop
  const startGameLoop = useCallback(() => {
    const loop = () => {
      const now = performance.now();
      const delta = Math.min((now - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = now;

      const map = mapRef.current;
      const threeLayer = threeLayerRef.current;
      const inputManager = inputManagerRef.current;

      if (map && threeLayer && inputManager) {
        const rawInput = inputManager.getRawInput();
        let bearing = map.getBearing();

        if (rawInput.rotateCam !== 0) {
          bearing = bearing + rawInput.rotateCam * 85 * delta;
          map.setBearing(bearing);
          setCurrentBearing(bearing);
        }

        // Throttle UI updates to 10fps to prevent React re-render storm
        const shouldUpdateUI = now - lastUIUpdateTimeRef.current > 100;
        if (shouldUpdateUI) {
          lastUIUpdateTimeRef.current = now;

          // Update Validation & Compile Report state periodically
          if (threeLayer.realBuildingManager.latestReport) {
            setValidationReport(threeLayer.realBuildingManager.latestReport);
          }
          if (threeLayer.realBuildingManager.latestCompileReport) {
            setCompileReport(threeLayer.realBuildingManager.latestCompileReport);
          }
        }

        // --- MODE A: DRIVING VEHICLE ---
        if (threeLayer.isDriving) {
          threeLayer.vehicleController.update(
            delta,
            {
              throttle: rawInput.forward,
              steer: rawInput.strafe,
              handbrake: rawInput.isSprinting,
            },
            {
              isPointInObstacle: (x: number, z: number) => {
                if (threeLayer.realBuildingManager && threeLayer.realBuildingManager.isPointInsideBuilding(x, z)) {
                  return true;
                }
                if (threeLayer.waterSystem && threeLayer.waterSystem.isPointInWater(x, z, 1.0)) {
                  return true;
                }
                return false;
              },
            }
          );

          const vState = threeLayer.vehicleController.getState();
          const speed = Math.round(vState.speedKmh);
          SoundManager.getInstance().updateEngineSpeed(vState.speedKmh);

          // Smoothly adapt camera to vehicle zoom and pitch
          if (!isDraggingRef.current) {
            const curZoom = map.getZoom();
            const curPitch = map.getPitch();
            if (curZoom < GAME_CONFIG.vehicleZoom - 0.05) {
              map.setZoom(curZoom + (GAME_CONFIG.vehicleZoom - curZoom) * Math.min(3.5 * delta, 0.15));
            }
            if (curPitch < GAME_CONFIG.vehiclePitch - 0.5) {
              map.setPitch(curPitch + (GAME_CONFIG.vehiclePitch - curPitch) * Math.min(3.5 * delta, 0.15));
            }

            // GTA Dynamic Vehicle Follow: Smoothly track behind vehicle heading!
            const vHeadingDeg = (vState.headingRad * 180) / Math.PI;
            let diff = vHeadingDeg - bearing;
            diff = ((((diff + 180) % 360) + 360) % 360) - 180;
            const followSpeed = Math.min(Math.abs(vState.speedKmh) * 0.12 + 2.4, 6.0);
            bearing = bearing + diff * Math.min(followSpeed * delta, 0.3);
            map.setBearing(bearing);
            setCurrentBearing(bearing);
          }

          if (shouldUpdateUI) {
            setVehicleSpeedKmh(speed);
            setLivePlayerState({
              lat: currentLocation.lat,
              lng: currentLocation.lng,
              x: vState.x,
              z: vState.z,
              speed: vState.speedKmh / 3.6,
              speedKmh: vState.speedKmh,
              headingDeg: (vState.headingRad * 180) / Math.PI,
              isMoving: Math.abs(vState.speedKmh) > 1.0,
              isSprinting: false,
            });

            // Check if vehicle is near a parking slot
            const slot = threeLayer.parkingSystem.findNearestSlot(vState.x, vState.z, 10.0);
            setCanPark(slot !== null);
          }

          // Smooth camera lock on vehicle
          const isOrbiting = isDraggingRef.current && dragInfoRef.current?.mode === 'rotate';
          const canFollow = !isTeleportingRef.current && (!isDraggingRef.current || isOrbiting);

          if (canFollow) {
            const currentBearing = map.getBearing();
            const bearingRad = (currentBearing * Math.PI) / 180;
            const lookAhead =
              cameraModeRef.current === '2d' ? 0.0 : cameraModeRef.current === 'fpp' ? 8.0 : GAME_CONFIG.vehicleLookAhead;
            const origin = threeLayer.characterController.getOrigin();
            const targetCoords = GeoCoords.toLatLng(
              vState.x + Math.sin(bearingRad) * lookAhead,
              vState.z - Math.cos(bearingRad) * lookAhead,
              origin.lat,
              origin.lng
            );
            map.jumpTo({ center: [targetCoords.lng, targetCoords.lat] });
          }
        }
        // --- MODE B: WALKING CHARACTER ---
        else {
          const moveDir = inputManager.getCameraRelativeDirection(bearing);
          const isWalking = moveDir.isMoving;

          // When user moves with WASD, gently restore 3D perspective if pitched flat
          if (isWalking && cameraModeRef.current === 'tpp' && !isDraggingRef.current) {
            const curZoom = map.getZoom();
            const curPitch = map.getPitch();
            if (curZoom < GAME_CONFIG.tppZoom - 0.05) {
              const newZoom = curZoom + (GAME_CONFIG.tppZoom - curZoom) * Math.min(3.0 * delta, 0.15);
              map.setZoom(newZoom);
            }
            if (curPitch < GAME_CONFIG.tppPitch - 0.5) {
              const newPitch = curPitch + (GAME_CONFIG.tppPitch - curPitch) * Math.min(3.0 * delta, 0.15);
              map.setPitch(newPitch);
            }
          }

          threeLayer.characterController.update(delta, moveDir);
          const playerState = threeLayer.characterController.getState();
          
          if (shouldUpdateUI) {
            setLivePlayerState(playerState);
            onPlayerStateChange(playerState);

            // Check distance to Auto Rickshaw
            const pPos = threeLayer.characterController.getPosition();
            const vPos = threeLayer.vehicleController.getPosition();
            const distToVeh = Math.hypot(pPos.x - vPos.x, pPos.z - vPos.z);
            setCanEnterVehicle(distToVeh < 5.0);
          }

          // Camera Follow: continuously anchor camera to character smoothly without interrupting orbit
          const isOrbiting = isDraggingRef.current && dragInfoRef.current?.mode === 'rotate';
          const canFollow = !isTeleportingRef.current && (!isDraggingRef.current || isOrbiting) && (cameraModeRef.current !== '2d' || isWalking);

          if (canFollow) {
            const currentBearing = map.getBearing();
            const bearingRad = (currentBearing * Math.PI) / 180;
            const isCloseTPP = cameraModeRef.current === 'tpp';

            const lookAhead =
              cameraModeRef.current === 'fpp'
                ? 8.0
                : isCloseTPP
                ? GAME_CONFIG.tppLookAhead
                : 0.0;
            const shoulderOffset =
              isCloseTPP ? GAME_CONFIG.tppShoulderOffset : 0.0;

            const fwdX = Math.sin(bearingRad);
            const fwdZ = -Math.cos(bearingRad);
            const rightX = Math.cos(bearingRad);
            const rightZ = Math.sin(bearingRad);

            const targetLocalX = playerState.x + fwdX * lookAhead + rightX * shoulderOffset;
            const targetLocalZ = playerState.z + fwdZ * lookAhead + rightZ * shoulderOffset;

            const origin = threeLayer.characterController.getOrigin();
            const targetCoords = GeoCoords.toLatLng(
              targetLocalX,
              targetLocalZ,
              origin.lat,
              origin.lng
            );
            map.jumpTo({ center: [targetCoords.lng, targetCoords.lat] });
          }
        }

      }

      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);
  }, [onPlayerStateChange]);

  const handleResetNorth = () => {
    if (mapRef.current) {
      mapRef.current.easeTo({ bearing: 0, duration: 500 });
    }
  };

  return (
    <div
      className="game-viewport relative w-full h-full overflow-hidden select-none touch-none"
      style={{
        width: '100%',
        height: '100%',
        cursor: interactionMode === 'pan' ? (isDraggingUI ? 'grabbing' : 'grab') : 'crosshair',
      }}
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* GTA-Style Mini-Map Radar & District Banner */}
      <GTAMinimap
        playerState={livePlayerState}
        isDriving={isDriving}
        speedKmh={vehicleSpeedKmh}
        locationName={currentLocation.name}
        subname={currentLocation.subname || `${currentLocation.lat.toFixed(4)}°, ${currentLocation.lng.toFixed(4)}°`}
        bearing={currentBearing}
        radioStation={radioStation}
        onToggleRadio={handleToggleRadio}
        onHonk={handleHonk}
      />

      {/* 3D Map Exploration Mode Switcher */}
      <div className="interactive-ui absolute top-20 left-1/2 -translate-x-1/2 z-20 pointer-events-auto flex items-center bg-white/90 backdrop-blur-md p-1 rounded-full shadow-lg border border-white/70">
        <button
          onClick={() => setInteractionMode('pan')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
            interactionMode === 'pan'
              ? 'bg-sky-500 text-white shadow-sm shadow-sky-500/30'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
          }`}
          title="Drag anywhere on map to pan and move across places (നീക്കാൻ)"
        >
          <Move size={14} />
          <span>Move Map (നീക്കാൻ)</span>
        </button>
        <button
          onClick={() => setInteractionMode('rotate')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
            interactionMode === 'rotate'
              ? 'bg-sky-500 text-white shadow-sm shadow-sky-500/30'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
          }`}
          title="Drag anywhere to rotate 360° and tilt pitch (തിരിക്കാൻ)"
        >
          <RotateCw size={14} />
          <span>Rotate 360° (തിരിക്കാൻ)</span>
        </button>
      </div>

      {/* MapLibre & Three.js Canvas Container */}
      <div
        ref={mapContainerRef}
        className="map-container absolute inset-0 w-full h-full"
        style={{ width: '100%', height: '100%' }}
      />

      {/* Data Debug Inspector Tool */}
      <DataDebugInspector
        selectedBuilding={selectedBuilding}
        onClose={() => setSelectedBuilding(null)}
        validationReport={validationReport}
        isDebugModeActive={isDebugModeActive}
        onToggleDebugMode={() => setIsDebugModeActive((p) => !p)}
      />

      {/* World Reconstruction & Validation Inspector (F3) */}
      <WorldValidationInspector
        selectedBuilding={selectedBuilding}
        onCloseBuilding={() => setSelectedBuilding(null)}
        compileReport={compileReport}
      />

      {/* Floating Action Button: Enter Vehicle */}
      {canEnterVehicle && !isDriving && (
        <div className="interactive-ui absolute bottom-32 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
          <button
            onClick={handleEnterVehicle}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-sm shadow-2xl border border-amber-300 transition-transform active:scale-95 animate-bounce"
          >
            <Car size={20} />
            <span>Drive Auto Rickshaw (E)</span>
          </button>
        </div>
      )}

      {/* Floating Action Bar: Driving Vehicle Active */}
      {isDriving && (
        <div className="interactive-ui absolute bottom-8 left-1/2 -translate-x-1/2 z-30 pointer-events-auto flex items-center gap-3 bg-slate-900/90 backdrop-blur-xl px-5 py-3 rounded-2xl border border-slate-700 shadow-2xl">
          {/* Speedometer */}
          <div className="flex flex-col items-center pr-4 border-r border-slate-700">
            <div className="text-xl font-black text-amber-400 font-mono">{vehicleSpeedKmh}</div>
            <div className="text-[10px] text-slate-400 font-bold uppercase">km/h</div>
          </div>

          {/* Park Curbside */}
          <button
            onClick={handleParkVehicle}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              canPark
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg'
                : 'bg-slate-800 text-slate-400 cursor-not-allowed'
            }`}
            disabled={!canPark}
            title={canPark ? 'Park safely along the curbside slot' : 'Drive closer to roadside curb to park'}
          >
            <ParkingSquare size={16} />
            <span>{canPark ? 'Park Slot (P)' : 'Find Curb'}</span>
          </button>

          {/* Exit Vehicle */}
          <button
            onClick={handleExitVehicle}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all shadow-lg"
            title="Exit the vehicle back to walking mode (E)"
          >
            <LogOut size={16} />
            <span>Exit (E)</span>
          </button>
        </div>
      )}

      {/* Floating 3D Compass Widget in Bottom-Right */}
      <div className="compass-container absolute right-4 bottom-24 z-20 pointer-events-auto">
        <Compass bearing={currentBearing} onResetNorth={handleResetNorth} />
      </div>

      {/* On-Screen Touch / Click Controller for Movement */}
      <div className="interactive-ui absolute left-5 bottom-16 z-20 pointer-events-auto flex flex-col items-center gap-1.5 opacity-85 hover:opacity-100 transition-opacity">
        {/* Up Button (W) */}
        <button
          className="w-12 h-12 rounded-2xl bg-white/85 active:bg-sky-500 active:text-white backdrop-blur-md shadow-lg flex items-center justify-center text-slate-700 font-bold border border-white/60 transition-all active:scale-95"
          onPointerDown={() => setTouchControls((p) => ({ ...p, forward: 1 }))}
          onPointerUp={() => setTouchControls((p) => ({ ...p, forward: 0 }))}
          onPointerLeave={() => setTouchControls((p) => ({ ...p, forward: 0 }))}
          title={isDriving ? 'Throttle / Gas (W)' : 'Forward (W)'}
        >
          <ArrowUp size={22} />
        </button>

        <div className="flex gap-2">
          {/* Left Button (A) */}
          <button
            className="w-12 h-12 rounded-2xl bg-white/85 active:bg-sky-500 active:text-white backdrop-blur-md shadow-lg flex items-center justify-center text-slate-700 font-bold border border-white/60 transition-all active:scale-95"
            onPointerDown={() => setTouchControls((p) => ({ ...p, strafe: -1 }))}
            onPointerUp={() => setTouchControls((p) => ({ ...p, strafe: 0 }))}
            onPointerLeave={() => setTouchControls((p) => ({ ...p, strafe: 0 }))}
            title={isDriving ? 'Steer Left (A)' : 'Left (A)'}
          >
            <ArrowLeft size={22} />
          </button>

          {/* Down Button (S) */}
          <button
            className="w-12 h-12 rounded-2xl bg-white/85 active:bg-sky-500 active:text-white backdrop-blur-md shadow-lg flex items-center justify-center text-slate-700 font-bold border border-white/60 transition-all active:scale-95"
            onPointerDown={() => setTouchControls((p) => ({ ...p, forward: -1 }))}
            onPointerUp={() => setTouchControls((p) => ({ ...p, forward: 0 }))}
            onPointerLeave={() => setTouchControls((p) => ({ ...p, forward: 0 }))}
            title={isDriving ? 'Reverse / Brake (S)' : 'Backward (S)'}
          >
            <ArrowDown size={22} />
          </button>

          {/* Right Button (D) */}
          <button
            className="w-12 h-12 rounded-2xl bg-white/85 active:bg-sky-500 active:text-white backdrop-blur-md shadow-lg flex items-center justify-center text-slate-700 font-bold border border-white/60 transition-all active:scale-95"
            onPointerDown={() => setTouchControls((p) => ({ ...p, strafe: 1 }))}
            onPointerUp={() => setTouchControls((p) => ({ ...p, strafe: 0 }))}
            onPointerLeave={() => setTouchControls((p) => ({ ...p, strafe: 0 }))}
            title={isDriving ? 'Steer Right (D)' : 'Right (D)'}
          >
            <ArrowRight size={22} />
          </button>
        </div>
      </div>

      {/* Action Buttons: Sprint & Jump */}
      {!isDriving && (
        <div className="interactive-ui absolute right-24 bottom-16 z-20 pointer-events-auto flex items-center gap-2">
          <button
            className="w-12 h-12 rounded-2xl bg-amber-500/90 active:bg-amber-600 text-white shadow-lg flex items-center justify-center font-bold border border-amber-300/60 transition-all active:scale-95"
            onPointerDown={() => setTouchControls((p) => ({ ...p, sprint: true }))}
            onPointerUp={() => setTouchControls((p) => ({ ...p, sprint: false }))}
            onPointerLeave={() => setTouchControls((p) => ({ ...p, sprint: false }))}
            title="Sprint (Shift)"
          >
            <Zap size={20} className="fill-white" />
          </button>

          <button
            className="w-12 h-12 rounded-2xl bg-emerald-500/90 active:bg-emerald-600 text-white shadow-lg flex items-center justify-center font-bold border border-emerald-300/60 transition-all active:scale-95"
            onPointerDown={() => setTouchControls((p) => ({ ...p, jump: true }))}
            onPointerUp={() => setTouchControls((p) => ({ ...p, jump: false }))}
            onPointerLeave={() => setTouchControls((p) => ({ ...p, jump: false }))}
            title="Jump (Space)"
          >
            <ArrowBigUp size={22} className="fill-white" />
          </button>
        </div>
      )}
    </div>
  );
};
