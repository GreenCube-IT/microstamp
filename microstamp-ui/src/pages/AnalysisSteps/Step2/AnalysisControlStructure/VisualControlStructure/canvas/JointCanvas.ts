import { IComponentBorder, IComponentType } from "@interfaces/IStep2/IComponent";
import { IConnectionStyle } from "@interfaces/IStep2/IConnection";
import { IInteractionType } from "@interfaces/IStep2/IInteraction/Enums";
import * as joint from "jointjs";
import {
	createConnectionCell,
	createDiagramCell,
	extractDiagramSnapshot,
	getDiagramData,
	getEndpointComponentClientId,
	normalizeConnectionInteractions,
	updateDiagramCell
} from "./diagramData";
import {
	createAnchorToolsView,
	highlightCell,
	getSideRatioAnchor,
	setSideRatioAnchor,
	unhighlightCell
} from "./shapes";
import type { ComponentData, ConnectionData, DiagramData, InteractionData } from "../domain/types";
import {
	CANVAS_BACKGROUND_COLOR,
	CANVAS_GRID_COLOR,
	DEFAULT_COMPONENT_SIZE
} from "./visualConstants";
import {
	COMPONENT_TYPE_LABELS,
	ENVIRONMENT_CODE,
	ENVIRONMENT_NAME,
	FIRST_INTERACTION_CODE
} from "../domain/constants";
import { getCascadeDeletionPlan, getNextCode } from "../domain/rules";
import type { ConnectionEndpoints, HierarchyComponent } from "../domain/rules";
import type { SideRatioAnchor } from "./shapes";

export interface CanvasSnapshotItem {
	data: DiagramData;
	position?: { x: number; y: number };
	size?: { width: number; height: number };
	sourceClientId?: string | null;
	targetClientId?: string | null;
}

export interface JointCanvasCallbacks {
	onSelectElement: (data: ComponentData) => void;
	onSelectLink: (data: ConnectionData) => void;
	onConnect: (connection: ConnectionData["connection"]) => void;
	onNodeMove: (snapshot: CanvasSnapshotItem[]) => void;
	onClearSelection: () => void;
	onDiagramChange: (snapshot: CanvasSnapshotItem[]) => void;
	onEnvironmentIncludedChange: (included: boolean) => void;
	onZoomChange: (zoom: number) => void;
}

export interface JointCanvasApi {
	addComponent: (type: IComponentType, environmentIncluded: boolean) => void;
	applySelected: (data: DiagramData) => void;
	deleteSelected: () => void;
	clear: () => void;
	setZoom: (scale: number) => void;
	zoomBy: (delta: number) => void;
	resetView: () => void;
	getSnapshot: () => CanvasSnapshotItem[];
	dispose: () => void;
}

function createClientId() {
	return crypto.randomUUID();
}

function getComponentRecords(graph: joint.dia.Graph): HierarchyComponent[] {
	return graph.getCells().flatMap(cell => {
		const data = getDiagramData(cell);
		return data?.kind === "component"
			? [{
					clientId: data.component.clientId,
					fatherClientId: data.component.fatherClientId,
					type: data.component.type
				}]
			: [];
	});
}

function getConnectionRecords(graph: joint.dia.Graph): ConnectionEndpoints[] {
	return graph.getCells().flatMap(cell => {
		const data = getDiagramData(cell);
		return data?.kind === "connection"
			? [{
					clientId: data.connection.clientId,
					sourceClientId: getEndpointComponentClientId(graph, cell, "source"),
					targetClientId: getEndpointComponentClientId(graph, cell, "target")
				}]
			: [];
	});
}

function removeDiagramCell(graph: joint.dia.Graph, cell: joint.dia.Cell): boolean {
	const data = getDiagramData(cell);
	if (data?.kind !== "component") {
		cell.remove();
		return false;
	}

	const plan = getCascadeDeletionPlan(
		getComponentRecords(graph),
		getConnectionRecords(graph),
		data.component.clientId
	);
	graph.getCells().forEach(candidate => {
		const candidateData = getDiagramData(candidate);
		if (
			(candidateData?.kind === "component" &&
				plan.componentIds.has(candidateData.component.clientId)) ||
			(candidateData?.kind === "connection" &&
				plan.connectionIds.has(candidateData.connection.clientId))
		) {
			candidate.remove();
		}
	});

	return plan.environmentIncluded;
}

function getNextDiagramCode(graph: joint.dia.Graph, prefix: "C" | "Cn") {
	const existingCodes = graph.getCells().flatMap(cell => {
		const data = getDiagramData(cell);
		return data?.kind === "component"
			? [data.component.code]
			: data?.kind === "connection"
				? [data.connection.code]
				: [];
	});
	return getNextCode(existingCodes, prefix);
}

export function createJointCanvas(
	host: HTMLElement,
	callbacks: JointCanvasCallbacks,
	paperHostClassName: string
): JointCanvasApi {
	const paperContainer = document.createElement("div");
	paperContainer.className = paperHostClassName;
	host.appendChild(paperContainer);

	const graph = new joint.dia.Graph({}, { cellNamespace: joint.shapes });
	Object.assign(joint.anchors, {
		sideRatio: (
			endView: joint.dia.CellView,
			magnet: SVGElement,
			reference: joint.g.Point | SVGElement,
			args: SideRatioAnchor
		) => getSideRatioAnchor(endView, magnet, reference, args)
	});

	const paper = new joint.dia.Paper({
		el: paperContainer,
		model: graph,
		width: host.clientWidth,
		height: host.clientHeight,
		gridSize: 10,
		drawGrid: { name: "dot", args: { color: CANVAS_GRID_COLOR, gap: 10 } },
		background: { color: CANVAS_BACKGROUND_COLOR },
		defaultConnectionPoint: { name: "boundary", args: { perpendicular: false } },
		defaultAnchor: { name: "center" },
		linkPinning: false,
		defaultRouter: { name: "normal" },
		defaultConnector: { name: "rounded", args: { radius: 8 } },
		validateConnection: (sourceView, _sourceMagnet, targetView) =>
			sourceView !== targetView &&
			sourceView.model.isElement() &&
			targetView.model.isElement(),
		defaultLink: () => {
			const interactions: InteractionData[] = [{
				clientId: createClientId(),
				code: FIRST_INTERACTION_CODE,
				name: "",
				interactionType: IInteractionType.COMMUNICATION_CHANNEL
			}];
			const data: ConnectionData = {
				kind: "connection",
				connection: {
					clientId: createClientId(),
					code: getNextDiagramCode(graph, "Cn"),
					style: IConnectionStyle.SOLID,
					interactions
				}
			};
			return createConnectionCell(data.connection);
		},
		cellViewNamespace: joint.shapes,
		interactive: cellView =>
			cellView.model.isLink() ? { vertexAdd: true, labelMove: true } : true
	});

	let selectedCell: joint.dia.Cell | null = null;
	let scale = 1;
	let panning = false;
	let panStartX = 0;
	let panStartY = 0;
	let translateX = 0;
	let translateY = 0;

	const getSnapshot = (): CanvasSnapshotItem[] =>
		graph.getCells().flatMap(cell => {
			const item = extractDiagramSnapshot(cell);
			if (!item) return [];
			return [{
				...item,
				sourceClientId: item.data.kind === "connection"
					? getEndpointComponentClientId(graph, cell, "source")
					: undefined,
				targetClientId: item.data.kind === "connection"
					? getEndpointComponentClientId(graph, cell, "target")
					: undefined
			}];
		});
	const notifyDiagramChange = () => callbacks.onDiagramChange(getSnapshot());
	const clearSelection = () => {
		if (selectedCell) {
			unhighlightCell(paper.findViewByModel(selectedCell));
			if (selectedCell.isLink()) paper.findViewByModel(selectedCell)?.removeTools();
		}
		selectedCell = null;
		callbacks.onClearSelection();
	};
	const addAnchorTools = (link: joint.dia.Link) => {
		const linkView = paper.findViewByModel(link);
		if (!linkView) return;
		linkView.removeTools();
		linkView.addTools(createAnchorToolsView());
	};
	const selectCell = (cell: joint.dia.Cell) => {
		if (selectedCell) {
			unhighlightCell(paper.findViewByModel(selectedCell));
			if (selectedCell.isLink()) paper.findViewByModel(selectedCell)?.removeTools();
		}
		if (cell.isLink()) normalizeConnectionInteractions(graph, cell);
		selectedCell = cell;
		const data = getDiagramData(cell);
		if (data?.kind === "component") callbacks.onSelectElement(data);
		else if (data?.kind === "connection") callbacks.onSelectLink(data);
		highlightCell(paper.findViewByModel(cell));
		if (cell.isLink()) addAnchorTools(cell);
	};

	paper.on("blank:pointerdown", clearSelection);
	paper.on("element:pointerclick", view => selectCell(view.model));
	paper.on("link:pointerclick", view => selectCell(view.model));
	paper.on("element:pointerup", () => callbacks.onNodeMove(getSnapshot()));
	paper.on("link:connect", (linkView, _event, _elementView, _magnet, arrowhead) => {
		setSideRatioAnchor(linkView, arrowhead);
		setSideRatioAnchor(linkView, arrowhead === "source" ? "target" : "source");
		normalizeConnectionInteractions(graph, linkView.model);
		const data = getDiagramData(linkView.model);
		if (data?.kind === "connection") callbacks.onConnect(data.connection);
		selectCell(linkView.model);
		notifyDiagramChange();
	});
	paper.on("link:disconnect", linkView => {
		normalizeConnectionInteractions(graph, linkView.model);
		selectCell(linkView.model);
		notifyDiagramChange();
	});

	graph.on(
		"add remove change:data change:source change:target change:vertices change:size",
		notifyDiagramChange
	);

	const resizeObserver = new ResizeObserver(() => {
		paper.setDimensions(host.clientWidth, host.clientHeight);
	});
	resizeObserver.observe(host);

	const onMouseDown = (event: MouseEvent) => {
		if ((event.target as HTMLElement).closest(".joint-cell")) return;
		if ((event.target as HTMLElement).closest("button")) return;
		panning = true;
		panStartX = event.clientX;
		panStartY = event.clientY;
		const translation = paper.translate();
		translateX = translation.tx;
		translateY = translation.ty;
		host.style.cursor = "grabbing";
		event.preventDefault();
	};
	const onMouseMove = (event: MouseEvent) => {
		if (!panning) return;
		paper.translate(
			translateX + event.clientX - panStartX,
			translateY + event.clientY - panStartY
		);
	};
	const onMouseUp = () => {
		panning = false;
		host.style.cursor = "";
	};
	const onWheel = (event: WheelEvent) => {
		event.preventDefault();
		const nextScale = Math.max(0.2, Math.min(3, scale + (event.deltaY < 0 ? 0.08 : -0.08)));
		const bounds = host.getBoundingClientRect();
		const mouseX = event.clientX - bounds.left;
		const mouseY = event.clientY - bounds.top;
		const translation = paper.translate();
		paper.scale(nextScale);
		paper.translate(
			mouseX - (mouseX - translation.tx) * (nextScale / scale),
			mouseY - (mouseY - translation.ty) * (nextScale / scale)
		);
		scale = nextScale;
		callbacks.onZoomChange(Math.round(nextScale * 100));
	};
	const onKeyDown = (event: KeyboardEvent) => {
		const target = event.target as HTMLElement;
		if (target.matches("input, select, textarea")) return;
		if (event.key === "Escape") clearSelection();
		if ((event.key === "Delete" || event.key === "Backspace") && selectedCell) {
			const environmentRemoved = removeDiagramCell(graph, selectedCell);
			if (environmentRemoved) callbacks.onEnvironmentIncludedChange(false);
			clearSelection();
		}
	};

	host.addEventListener("mousedown", onMouseDown);
	host.addEventListener("wheel", onWheel, { passive: false });
	host.addEventListener("keydown", onKeyDown);
	document.addEventListener("mousemove", onMouseMove);
	document.addEventListener("mouseup", onMouseUp);

	return {
		addComponent: (type, environmentIncluded) => {
			const isEnvironment = type === IComponentType.ENVIRONMENT;
			if (
				isEnvironment &&
				(environmentIncluded ||
					graph.getCells().some(cell => {
						const data = getDiagramData(cell);
						return data?.kind === "component" &&
							data.component.type === IComponentType.ENVIRONMENT;
					}))
			) return;

			const code = isEnvironment ? ENVIRONMENT_CODE : getNextDiagramCode(graph, "C");
			const name = isEnvironment
				? ENVIRONMENT_NAME
				: `${COMPONENT_TYPE_LABELS[type]} ${code.split(".")[1]}`;
			const size = DEFAULT_COMPONENT_SIZE;
			const translation = paper.translate();
			const centerX = (host.clientWidth / 2 - translation.tx) / scale;
			const centerY = (host.clientHeight / 2 - translation.ty) / scale;
			const offset = graph.getCells().filter(cell => cell.isElement()).length * 22;
			const componentData: ComponentData = {
				kind: "component",
				component: {
					clientId: createClientId(),
					name,
					code,
					type,
					border: IComponentBorder.SOLID,
					fatherClientId: null,
					isVisible: true,
					width: size.width,
					height: size.height
				}
			};
			const component = createDiagramCell(componentData, {
				x: centerX - size.width / 2 + offset,
				y: centerY - size.height / 2 + offset
			});
			graph.addCell(component);
			if (isEnvironment) callbacks.onEnvironmentIncludedChange(true);
			selectCell(component);
			notifyDiagramChange();
		},
		applySelected: data => {
			if (!selectedCell) return;
			if (
				(data.kind === "component" && selectedCell.isElement()) ||
				(data.kind === "connection" && selectedCell.isLink())
			) {
				updateDiagramCell(selectedCell, data);
				selectCell(selectedCell);
				notifyDiagramChange();
			}
		},
		deleteSelected: () => {
			if (!selectedCell) return;
			if (removeDiagramCell(graph, selectedCell)) callbacks.onEnvironmentIncludedChange(false);
			clearSelection();
			notifyDiagramChange();
		},
		clear: () => {
			graph.clear();
			callbacks.onEnvironmentIncludedChange(false);
			clearSelection();
			notifyDiagramChange();
		},
		setZoom: nextScale => {
			scale = Math.max(0.2, Math.min(3, nextScale));
			paper.scale(scale);
			callbacks.onZoomChange(Math.round(scale * 100));
		},
		zoomBy: delta => {
			scale = Math.max(0.2, Math.min(3, scale + delta));
			paper.scale(scale);
			callbacks.onZoomChange(Math.round(scale * 100));
		},
		resetView: () => {
			scale = 1;
			paper.scale(scale);
			paper.translate(0, 0);
			callbacks.onZoomChange(100);
		},
		getSnapshot,
		dispose: () => {
			resizeObserver.disconnect();
			host.removeEventListener("mousedown", onMouseDown);
			host.removeEventListener("wheel", onWheel);
			host.removeEventListener("keydown", onKeyDown);
			document.removeEventListener("mousemove", onMouseMove);
			document.removeEventListener("mouseup", onMouseUp);
			paper.remove();
			graph.off();
			graph.clear();
		}
	};
}
