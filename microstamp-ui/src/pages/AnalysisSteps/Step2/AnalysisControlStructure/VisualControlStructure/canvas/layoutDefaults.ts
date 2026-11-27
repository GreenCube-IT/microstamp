import { DEFAULT_COMPONENT_SIZE } from "./visualConstants";

export interface CanvasCenter {
	x: number;
	y: number;
}

export function getDefaultComponentPosition(
	index: number,
	center: CanvasCenter,
	size: { width: number; height: number } = DEFAULT_COMPONENT_SIZE
) {
	const offset = index * 22;
	return {
		x: center.x - size.width / 2 + offset,
		y: center.y - size.height / 2 + offset
	};
}

export const DEFAULT_LINK_ANCHOR = { name: "center" } as const;
