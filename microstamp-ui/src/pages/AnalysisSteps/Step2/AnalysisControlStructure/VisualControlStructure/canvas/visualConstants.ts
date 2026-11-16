import { IComponentType } from "@interfaces/IStep2/IComponent";

export const COMPONENT_COLORS: Record<IComponentType, string> = {
	[IComponentType.CONTROLLER]: "#dbeafe",
	[IComponentType.CONTROLLED_PROCESS]: "#dcfce7",
	[IComponentType.ACTUATOR]: "#fef3c7",
	[IComponentType.SENSOR]: "#fce7f3",
	[IComponentType.ENVIRONMENT]: "#e2e8f0"
};

export const DEFAULT_COMPONENT_SIZE = { width: 190, height: 76 };

export const CONNECTION_LABEL_TEXT_COLOR = "#1e293b";
export const CONNECTION_LABEL_BACKGROUND_COLOR = "#ffffff";
export const CONNECTION_LABEL_BORDER_COLOR = "#cbd5e1";

export const CANVAS_GRID_COLOR = "#c8cdd8";
export const CANVAS_BACKGROUND_COLOR = "#f5f5f5";
export const CONNECTION_COLOR = "#1e293b";
export const SELECTION_HIGHLIGHT_COLOR = "#d4a056";
export const ACTIVE_ANCHOR_COLOR = "#3b82f6";
export const DEFAULT_ANCHOR_COLOR = "#64748b";
export const ANCHOR_HANDLE_STROKE_COLOR = "#ffffff";
