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
          pitch: is3DRef.current ? 48 : 0,
          duration: 600,
        });
        return is3DRef.current;
      },
      recenter: () => {
        if (!map.current) return;
        map.current.flyTo({
          center: [playerCoordsRef.current.lng, playerCoordsRef.current.lat],
          zoom: 17,
          pitch: is3DRef.current ? 48 : 0,
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
          zoom: 17,
          pitch: 48,
          bearing: 0,
          maxPitch: 65,
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

          threeLayer.current.updatePlayerPosition(lat, lng);

          mapInstance.easeTo({
            center: [lng, lat],
            duration: 800,
            easing: (t) => t * (2 - t),
          });

          if (onPlayerMove) {
            onPlayerMove(lat, lng);
          }
        });

        // 3D Rotate gesture handling when Rotate Mode is active
        let isRotating = false;
        let startX = 0;
        let startY = 0;
        let startBearing = 0;
        let startPitch = 48;

        const container = mapContainer.current;

        const onPointerDown = (e: PointerEvent) => {
          if (!isRotateModeRef.current || !map.current) return;
          isRotating = true;
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
          const newPitch = Math.max(0, Math.min(65, startPitch - dy * 0.35));
          map.current.jumpTo({
            bearing: newBearing,
            pitch: newPitch,
          });
          e.stopPropagation();
        };

        const onPointerUp = (e: PointerEvent) => {
          if (!isRotating) return;
          isRotating = false;
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
          zoom: 17,
          pitch: is3DRef.current ? 48 : 0,
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
