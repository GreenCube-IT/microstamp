import { IComponentType } from "@interfaces/IStep2/IComponent";

export type ThemeColor =
	| "yellow"
	| "background"
	| "gray"
	| "dark"
	| "white"
	| "dark-gray"
	| "dark-yellow"
	| "gray25"
	| "light-gray";

export function getThemeColor(color: ThemeColor): string {
	const value = getComputedStyle(document.documentElement)
		.getPropertyValue(`--color-${color}`)
		.trim();
	if (!value) {
		throw new Error(`Theme color --color-${color} is not defined.`);
	}
	return value;
}

export const COMPONENT_COLORS: Record<IComponentType, string> = {
	[IComponentType.CONTROLLER]: "#60778b",
	[IComponentType.CONTROLLED_PROCESS]: "#577760",
	[IComponentType.ACTUATOR]: "#92886a",
	[IComponentType.SENSOR]: "#98808b",
	[IComponentType.ENVIRONMENT]: "#747474"
};
export const COMPONENT_OUTLINE_COLOR: ThemeColor = "light-gray";
export const COMPONENT_TEXT_COLOR: ThemeColor = "dark";

export const DEFAULT_COMPONENT_SIZE = { width: 190, height: 76 };

export const CONNECTION_LABEL_TEXT_COLOR: ThemeColor = "white";
export const CONNECTION_LABEL_BACKGROUND_COLOR: ThemeColor = "dark-gray";
export const CONNECTION_LABEL_BORDER_COLOR: ThemeColor = "gray";

export const CANVAS_GRID_COLOR: ThemeColor = "gray";
export const CANVAS_BACKGROUND_COLOR: ThemeColor = "dark";
export const CONNECTION_COLOR: ThemeColor = "light-gray";
export const SELECTION_HIGHLIGHT_COLOR: ThemeColor = "yellow";
export const ACTIVE_ANCHOR_COLOR: ThemeColor = "yellow";
export const DEFAULT_ANCHOR_COLOR: ThemeColor = "light-gray";
export const ANCHOR_HANDLE_STROKE_COLOR: ThemeColor = "dark";
