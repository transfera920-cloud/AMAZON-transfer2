export const HOME_MARKER_START: string;
export const HOME_MARKER_END: string;
export const LINK_CLASS: string;

export type InlinePart = string | { text: string; href: string };
export interface HomeFaqEntry { q: string; a: string }
export interface RoadItem { tone: 'amber' | 'blue' | 'red'; tag: string; title: string; highlight: string; desc: string }
export type HomeBlock =
  | { id: string; kind: 'text'; title: string; body: string }
  | { id: string; kind: 'routes'; title: string; group: 'popular' | 'more'; collapsed: boolean }
  | { id: string; kind: 'roadguide'; title: string; items: RoadItem[] }
  | { id: string; kind: 'faq'; title: string };
export interface HomeContent { blocks: HomeBlock[]; faq: HomeFaqEntry[]; permitFaq: HomeFaqEntry[] }
export interface HomeRouteItem { slug: string; url: string; name: string; desc: string; navName: string }
export interface HomeRoutes { popular: HomeRouteItem[]; more: HomeRouteItem[] }

export const DEFAULT_HOME_ROUTE_TEXT: Record<string, { name: string; desc: string }>;
export const DEFAULT_ROAD_ITEMS: RoadItem[];
export const DEFAULT_HOME_FAQ: HomeFaqEntry[];
export const DEFAULT_PERMIT_FAQ: HomeFaqEntry[];
export function defaultHomeBlocks(popularTitle?: string): HomeBlock[];

export function safeHref(u: string): string;
export function parseInline(md?: string): InlinePart[];
export function parseBlocks(body?: string): { type: 'p' | 'ul' | 'ol'; items: InlinePart[][] }[];
export function plainText(md?: string): string;
export function resolveHomeContent(raw: any): HomeContent;
export function buildHomeRoutes(routes: any[]): HomeRoutes;
export function bodyHtml(body: string): string;
export function renderBlockHtml(block: HomeBlock, ctx: { routes: HomeRoutes; faq: HomeFaqEntry[] }): string;
export function renderHomeBlocksHtml(content: HomeContent, routes: HomeRoutes): string;
export function applyHomeToIndexHtml(html: string, content: HomeContent, routes: HomeRoutes, allPublished?: any[]): string;
