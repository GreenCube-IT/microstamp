import { IComponentBorder } from "@interfaces/IStep2/IComponent";
import { IConnectionStyle } from "@interfaces/IStep2/IConnection";
import * as joint from "jointjs";
import {
	ACTIVE_ANCHOR_COLOR,
	ANCHOR_HANDLE_STROKE_COLOR,
	COMPONENT_COLORS,
	COMPONENT_OUTLINE_COLOR,
	COMPONENT_TEXT_COLOR,
	CONNECTION_COLOR,
	CONNECTION_LABEL_BACKGROUND_COLOR,
	CONNECTION_LABEL_BORDER_COLOR,
	CONNECTION_LABEL_TEXT_COLOR,
	DEFAULT_ANCHOR_COLOR,
	DEFAULT_COMPONENT_SIZE,
	getThemeColor,
	SELECTION_HIGHLIGHT_COLOR
} from "./visualConstants";
import type { ComponentData, InteractionData } from "../domain/types";
import type { ConnectionData } from "../domain/types";

export interface SideRatioAnchor {
	side: "top" | "bottom" | "left" | "right";
	ratio: number;
}

function clamp(value: number) {
	return Math.max(0, Math.min(1, value));
}

export function sideRatioToPoint(
	bbox: { x: number; y: number; width: number; height: number },
	{ side, ratio }: SideRatioAnchor
) {
	const relativePosition = clamp(ratio);
	switch (side) {
		case "top":
			return { x: bbox.x + bbox.width * relativePosition, y: bbox.y };
		case "bottom":
			return { x: bbox.x + bbox.width * relativePosition, y: bbox.y + bbox.height };
		case "left":
			return { x: bbox.x, y: bbox.y + bbox.height * relativePosition };
		case "right":
			return { x: bbox.x + bbox.width, y: bbox.y + bbox.height * relativePosition };
	}
}

export function pointToSideRatio(
	bbox: { x: number; y: number; width: number; height: number },
	point: { x: number; y: number }
): SideRatioAnchor {
	const distances = {
		top: Math.abs(point.y - bbox.y),
		bottom: Math.abs(point.y - (bbox.y + bbox.height)),
		left: Math.abs(point.x - bbox.x),
		right: Math.abs(point.x - (bbox.x + bbox.width))
	};
	const side = (Object.keys(distances) as SideRatioAnchor["side"][]).reduce((nearest, current) =>
		distances[current] < distances[nearest] ? current : nearest
	);
	const ratio =
		side === "top" || side === "bottom"
			? (point.x - bbox.x) / bbox.width
			: (point.y - bbox.y) / bbox.height;
	return { side, ratio: clamp(ratio) };
}

export function getSideRatioAnchor(
	endView: joint.dia.CellView,
	_magnet: SVGElement,
	_reference: joint.g.Point | SVGElement,
	args: SideRatioAnchor
) {
	const bbox = endView.model.getBBox();
	const point = sideRatioToPoint(bbox, args);
	return new joint.g.Point(point.x, point.y);
}

export function createComponentShape(
	component: ComponentData["component"],
	position: { x: number; y: number }
) {
	const size = {
		width: component.width ?? DEFAULT_COMPONENT_SIZE.width,
		height: component.height ?? DEFAULT_COMPONENT_SIZE.height
	};
	const name = component.name;

	return new joint.shapes.standard.Rectangle({
		position,
		size,
		z: 1,
		data: { kind: "component", component },
		attrs: {
			body: {
				fill: COMPONENT_COLORS[component.type],
				stroke: getThemeColor(COMPONENT_OUTLINE_COLOR),
				strokeWidth: 1.5,
				strokeDasharray: getBorderDashArray(component.border),
				rx: 4,
				ry: 4,
				magnet: true
			},
			label: {
				text: name,
				fontSize: 13,
				fontFamily: "sans-serif",
				fontWeight: "500",
				fill: getThemeColor(COMPONENT_TEXT_COLOR),
				textWrap: { width: -16, height: -10, ellipsis: true }
			}
		}
	});
}

export function createConnectionShape(
	connection: ConnectionData["connection"]
) {
	return new joint.shapes.standard.Link({
		z: 2,
		data: { kind: "connection", connection },
		attrs: {
			line: {
				stroke: getThemeColor(CONNECTION_COLOR),
				strokeWidth: 1.5,
				strokeDasharray: getConnectionDashArray(connection.style),
				targetMarker: {
					type: "path",
					d: "M 8 -4 0 0 8 4 z",
					fill: getThemeColor(CONNECTION_COLOR),
					stroke: "none"
				},
				sourceMarker: { type: "none" }
			}
		}
	});
}

export function getBorderDashArray(border: IComponentBorder) {
	return border === IComponentBorder.SOLID
		? "none"
		: border === IComponentBorder.DASHED
			? "8 4"
			: "2 2";
}

export function getConnectionDashArray(style: IConnectionStyle) {
	return style === IConnectionStyle.SOLID
		? "none"
		: style === IConnectionStyle.DASHED
			? "8 4"
			: "2 2";
}

export function createInteractionLabels(
	interactions: InteractionData[],
	existingPositions: Map<string, joint.dia.Link.Label["position"]>
): joint.dia.Link.Label[] {
	return interactions.map((interaction, index) => {
		const labelCount = interactions.length;
		const distance = (index + 1) / (labelCount + 1);
		const label = interaction.name.trim() || interaction.code;
		return {
			attrs: {
				text: {
					text: label,
					"data-interaction-client-id": interaction.clientId,
					"data-interaction-code": interaction.code,
					fontSize: 11,
					fontFamily: "sans-serif",
					fill: getThemeColor(CONNECTION_LABEL_TEXT_COLOR)
				},
				rect: {
					fill: getThemeColor(CONNECTION_LABEL_BACKGROUND_COLOR),
					stroke: getThemeColor(CONNECTION_LABEL_BORDER_COLOR),
					strokeWidth: 1,
					rx: 3,
					ry: 3
				}
			},
			position: existingPositions.get(interaction.clientId) ?? {
				distance,
				offset: { x: 0, y: index % 2 === 0 ? -12 : 12 }
			}
		};
	});
}

export function createAnchorTool(end: joint.dia.LinkEnd) {
	const options = {
		snap: (point: joint.dia.Point, view: joint.dia.CellView) => {
			const model = view.model;
			if (!model.isElement()) return point;
			return sideRatioToPoint(model.getBBox(), pointToSideRatio(model.getBBox(), point));
		},
		anchor: (point: joint.dia.Point, view: joint.dia.CellView) => {
			const model = view.model;
			return {
				name: "sideRatio",
				args: model.isElement()
					? pointToSideRatio(model.getBBox(), point)
					: { side: "top" as const, ratio: 0.5 }
			};
		},
		customAnchorAttributes: {
			r: 6,
			fill: getThemeColor(ACTIVE_ANCHOR_COLOR),
			stroke: getThemeColor(ANCHOR_HANDLE_STROKE_COLOR),
			"stroke-width": 2,
			cursor: "grab"
		},
		defaultAnchorAttributes: {
			r: 6,
			fill: getThemeColor(DEFAULT_ANCHOR_COLOR),
			stroke: getThemeColor(ANCHOR_HANDLE_STROKE_COLOR),
			"stroke-width": 2,
			cursor: "grab"
		},
		resetAnchor: false,
		restrictArea: false,
		scale: 1
	};
	return end === "source"
		? new joint.linkTools.SourceAnchor(options)
		: new joint.linkTools.TargetAnchor(options);
}

export function createAnchorToolsView() {
	return new joint.dia.ToolsView({
		tools: [createAnchorTool("source"), createAnchorTool("target")]
	});
}

function getSelectionHighlightOptions() {
	return {
		highlighter: {
			name: "stroke",
			options: {
				padding: 4,
				attrs: { stroke: getThemeColor(SELECTION_HIGHLIGHT_COLOR), "stroke-width": 2 }
			}
		}
	};
}

export function highlightCell(view: joint.dia.CellView | undefined) {
	view?.highlight(undefined, getSelectionHighlightOptions());
}

export function unhighlightCell(view: joint.dia.CellView | undefined) {
	view?.unhighlight(undefined, getSelectionHighlightOptions());
}

export function applyComponentAppearance(
	cell: joint.dia.Element,
	component: ComponentData["component"]
) {
	cell.attr({
		body: {
			fill: COMPONENT_COLORS[component.type],
			strokeDasharray: getBorderDashArray(component.border)
		},
		label: { text: component.name, fill: getThemeColor(COMPONENT_TEXT_COLOR) }
	});
}

export function applyConnectionAppearance(
	link: joint.dia.Link,
	style: IConnectionStyle
) {
	link.attr("line/strokeDasharray", getConnectionDashArray(style));
}
