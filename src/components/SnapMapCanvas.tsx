import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import maplibregl from 'maplibre-gl';
import { LocationPreset } from '../config/gameConfig';
import ThreeMapLayer from '../graphics/ThreeMapLayer';

export interface SnapMapCanvasRef {
  toggle3D: () => boolean;
  recenter: () => void;
  rotateBy: (degrees: number) => void;
  resetRotation: () => void;
  toggleRotateMode: () => boolean;
  moveInDirection: (dirX: number, dirZ: number, isMoving: boolean) => void;
  getCameraBearing: () => number;
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
    const playerCoordsRef = useRef<{ lat: number; lng: number }>({
      lat: currentLocation.lat,
      lng: currentLocation.lng,
    });

    useImperativeHandle(ref, () => ({
      toggle3D: () => {
        if (!map.current) return is3DRef.current;
        is3DRef.current = !is3DRef.current;
        map.current.easeTo({
          pitch: is3DRef.current ? 75 : 0,
          duration: 600,
        });
        return is3DRef.current;
      },
      recenter: () => {
        if (!map.current) return;
        const lat = threeLayer.current ? threeLayer.current.playerLat : playerCoordsRef.current.lat;
        const lng = threeLayer.current ? threeLayer.current.playerLng : playerCoordsRef.current.lng;
        map.current.flyTo({
          center: [lng, lat],
          zoom: 17.8,
          pitch: is3DRef.current ? 75 : 0,
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
      moveInDirection: (dirX: number, dirZ: number, isMoving: boolean) => {
        if (!threeLayer.current) return;
        if (isMoving) {
          const delta = 0.018; // smooth step
          threeLayer.current.moveInDirection(dirX, dirZ, delta);
          const pLat = threeLayer.current.playerLat;
          const pLng = threeLayer.current.playerLng;
          playerCoordsRef.current = { lat: pLat, lng: pLng };

          // Buttery-smooth third-person chase camera tracking locked to character's back
          if (map.current && !(window as any).__isManualRotating) {
            const targetBearing = ((Math.atan2(dirX, -dirZ) * 180 / Math.PI) + 360) % 360;
            const currentBearing = map.current.getBearing();
            let diff = targetBearing - currentBearing;
            while (diff < -180) diff += 360;
            while (diff > 180) diff -= 360;

            const newBearing = (currentBearing + diff * 0.1) % 360;
            map.current.jumpTo({
              center: [pLng, pLat],
              bearing: newBearing,
            });
          }
          if (onPlayerMove) {
            onPlayerMove(pLat, pLng);
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

    useEffect(() => {
      if (!mapContainer.current) return;

      if (!map.current) {
        playerCoordsRef.current = { lat: currentLocation.lat, lng: currentLocation.lng };

        const mapInstance = new maplibregl.Map({
          container: mapContainer.current,
          style: '/pastel-style.json',
          center: [currentLocation.lng, currentLocation.lat],
          zoom: 17.8,
          pitch: 75,
          bearing: 0,
          maxPitch: 85,
          minPitch: 0,
          maxZoom: 19.5,
          minZoom: 10,
          dragRotate: true,
          pitchWithRotate: true,
          touchZoomRotate: true,
          touchPitch: true,
        });

        map.current = mapInstance;
        (window as any).__map = mapInstance;

        // Manual rotation / drag listeners to prevent chase camera fighting user gesture
        mapInstance.on('rotatestart', () => { (window as any).__isManualRotating = true; });
        mapInstance.on('rotateend', () => {
          setTimeout(() => { (window as any).__isManualRotating = false; }, 350);
        });
        mapInstance.on('dragstart', () => { (window as any).__isManualRotating = true; });
        mapInstance.on('dragend', () => {
          setTimeout(() => { (window as any).__isManualRotating = false; }, 350);
        });
        mapInstance.on('pitchstart', () => { (window as any).__isManualRotating = true; });
        mapInstance.on('pitchend', () => {
          setTimeout(() => { (window as any).__isManualRotating = false; }, 350);
        });

        mapInstance.on('style.load', () => {
          const layer = new ThreeMapLayer(currentLocation.lat, currentLocation.lng);
          threeLayer.current = layer;
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
          (window as any).__isManualRotating = true;
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
          (window as any).__isManualRotating = false;
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

        map.current.flyTo({
          center: [currentLocation.lng, currentLocation.lat],
          zoom: 17.8,
          pitch: is3DRef.current ? 75 : 0,
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
