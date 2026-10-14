/**
 * Geometric capacity of a rectangular aquarium, NOT usable water volume or a
 * livestock / equipment compatibility assessment.
 */
export interface TankDimensions {
  lengthCm: number;
  widthCm: number;
  heightCm: number;
}

export function geometricTankLiters(dimensions: TankDimensions): number | null {
  const { lengthCm, widthCm, heightCm } = dimensions;
  const values = [lengthCm, widthCm, heightCm];
  if (values.some((value) => !Number.isFinite(value) || value <= 0 || value > 500)) {
    return null;
  }
  const liters = (lengthCm * widthCm * heightCm) / 1000;
  if (liters > 2000) return null;
  return Math.round(liters * 10) / 10;
}
