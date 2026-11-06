export interface FleetPhoto { src: string; alt: string; caption: string; width: number; height: number }
export const FLEET_PHOTOS: FleetPhoto[];
export const FLEET_HEADING: string;
export const FLEET_CSS: string;
export function fleetFiguresHtml(count?: number): string;
export function fleetBlockHtml(count?: number): string;
export function fleetImageObjects(site: string, count?: number): object[];
export function fleetImageUrls(site: string, count?: number): string[];
