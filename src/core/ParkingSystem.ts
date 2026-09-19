import { ParkingSlot, RoadSegment } from './geoTypes';
import { VehicleController } from './VehicleController';

export class ParkingSystem {
  public slots: Map<string, ParkingSlot> = new Map();

  public clear() {
    this.slots.clear();
  }

  /**
   * Generates validated roadside parking slots along road segments.
   */
  public generateSlotsForSegments(segments: RoadSegment[]) {
    for (const seg of segments) {
      if (seg.roadClass === 'path' || seg.roadClass === 'motorway') continue;

      // Place 1 or 2 roadside parking slots if segment is long enough
      const numSlots = Math.floor(seg.length / 28.0);
      for (let s = 0; s < numSlots; s++) {
        const t = (s + 0.5) / (numSlots + 0.2);
        const roadX = seg.p1.x + t * (seg.p2.x - seg.p1.x);
        const roadZ = seg.p1.z + t * (seg.p2.z - seg.p1.z);

        // Curbside offset: near road edge
        const sideOffset = (seg.width / 2.0) * 0.82;
        for (const side of [-1, 1]) {
          const posX = roadX + seg.nx * (side * sideOffset);
          const posZ = roadZ + seg.nz * (side * sideOffset);

          const slotId = `slot-${Math.round(posX)}-${Math.round(posZ)}`;
          if (this.slots.has(slotId)) continue;

          this.slots.set(slotId, {
            id: slotId,
            roadSegmentId: seg.id,
            position: { x: posX, z: posZ },
            rotationY: Math.atan2(seg.ux, seg.uz),
            width: 2.2,
            length: 4.8,
            isOccupied: false,
          });
        }
      }
    }
  }

  /**
   * Finds the nearest unoccupied parking slot within detection radius.
   */
  public findNearestSlot(x: number, z: number, maxRadius = 14.0): ParkingSlot | null {
    let nearest: ParkingSlot | null = null;
    let minDist = maxRadius;

    for (const slot of this.slots.values()) {
      if (slot.isOccupied) continue;
      const d = Math.hypot(slot.position.x - x, slot.position.z - z);
      if (d < minDist) {
        minDist = d;
        nearest = slot;
      }
    }

    return nearest;
  }

  /**
   * Aligns vehicle into the parking slot and marks it parked.
   */
  public parkVehicle(vehicle: VehicleController, slot: ParkingSlot) {
    vehicle.teleportTo(slot.position.x, slot.position.z, slot.rotationY);
    vehicle.isParked = true;
    slot.isOccupied = true;
  }
}
