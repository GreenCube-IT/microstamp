import { IComponentBorder, IComponentType } from "@interfaces/IStep2/IComponent";
import { IConnectionStyle } from "@interfaces/IStep2/IConnection";
import { IInteractionType } from "@interfaces/IStep2/IInteraction/Enums";
import * as joint from "jointjs";
import { useEffect, useRef, useState } from "react";
import {
	BiPlus as AddIcon,
	BiReset as ResetIcon,
	BiTrash as DeleteIcon,
	BiZoomIn as ZoomInIcon,
	BiZoomOut as ZoomOutIcon
} from "react-icons/bi";
import {
	COMPONENT_TYPE_LABELS,
	COMPONENT_TYPE_OPTIONS,
	ENVIRONMENT_CODE,
	ENVIRONMENT_NAME,
	FIRST_INTERACTION_CODE,
	INTERACTION_TYPE_OPTIONS
} from "./domain/constants";
import type {
	ComponentData,
	ConnectionData,
	DiagramData,
	InteractionData,
	PropertiesDraft
} from "./domain/types";
import {
	ACTIVE_ANCHOR_COLOR,
	ANCHOR_HANDLE_STROKE_COLOR,
	CANVAS_BACKGROUND_COLOR,
	CANVAS_GRID_COLOR,
	COMPONENT_COLORS,
	CONNECTION_COLOR,
	CONNECTION_LABEL_BACKGROUND_COLOR,
	CONNECTION_LABEL_BORDER_COLOR,
	CONNECTION_LABEL_TEXT_COLOR,
	DEFAULT_ANCHOR_COLOR,
	DEFAULT_COMPONENT_SIZE,
	SELECTION_HIGHLIGHT_COLOR
} from "./canvas/visualConstants";
import {
	DEFAULT_INTERACTION_TYPES,
	getAllowedInteractionTypes as getDomainAllowedInteractionTypes,
	getCascadeDeletionPlan,
	getComponentDescendantIds as getDomainComponentDescendantIds,
	getNextCode,
	getNextInteractionCode,
	isValidComponentSize,
	normalizeInteractions
} from "./domain/rules";
import type { ConnectionEndpoints, HierarchyComponent } from "./domain/rules";
import styles from "./VisualControlStructure.module.css";
import "jointjs/dist/joint.min.css";

interface VisualControlStructureProps {
	environmentIncluded: boolean;
	onEnvironmentIncludedChange: (included: boolean) => void;
}

type AnchorSide = "top" | "bottom" | "left" | "right";

interface SideRatioAnchor {
	side: AnchorSide;
	ratio: number;
}

function clamp(value: number) {
	return Math.max(0, Math.min(1, value));
}

function sideRatioToPoint(
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

function pointToSideRatio(
	bbox: { x: number; y: number; width: number; height: number },
	point: { x: number; y: number }
): SideRatioAnchor {
	const distances = {
		top: Math.abs(point.y - bbox.y),
		bottom: Math.abs(point.y - (bbox.y + bbox.height)),
		left: Math.abs(point.x - bbox.x),
		right: Math.abs(point.x - (bbox.x + bbox.width))
	};
	const side = (Object.keys(distances) as AnchorSide[]).reduce((nearest, current) =>
		distances[current] < distances[nearest] ? current : nearest
	);
	const ratio =
		side === "top" || side === "bottom"
			? (point.x - bbox.x) / bbox.width
			: (point.y - bbox.y) / bbox.height;
	return { side, ratio: clamp(ratio) };
}

function getDiagramData(cell: joint.dia.Cell): DiagramData | null {
	const data: unknown = cell.get("data");
	if (!data || typeof data !== "object" || !("kind" in data)) return null;
	const diagramData = data as DiagramData;
	return diagramData.kind === "component" || diagramData.kind === "connection"
		? diagramData
		: null;
}

function getEndpointComponentType(
	graph: joint.dia.Graph,
	link: joint.dia.Cell,
	end: "source" | "target"
) {
	const endpoint: unknown = link.get(end);
	if (!endpoint || typeof endpoint !== "object" || !("id" in endpoint)) return null;

	const endpointId = endpoint.id;
	if (typeof endpointId !== "string" && typeof endpointId !== "number") return null;

	const cell = graph.getCell(String(endpointId));
	const data = cell ? getDiagramData(cell) : null;
	return data?.kind === "component" ? data.component.type : null;
}

function getAllowedInteractionTypes(graph: joint.dia.Graph, link: joint.dia.Cell) {
	return getDomainAllowedInteractionTypes(
		getEndpointComponentType(graph, link, "source"),
		getEndpointComponentType(graph, link, "target")
	);
}

function normalizeConnectionInteractions(graph: joint.dia.Graph, link: joint.dia.Link) {
	const data = getDiagramData(link);
	if (data?.kind !== "connection") return;

	const interactions = normalizeInteractions(
		data.connection.interactions,
		getAllowedInteractionTypes(graph, link)
	);
	const nextData: ConnectionData = {
		kind: "connection",
		connection: { ...data.connection, interactions }
	};
	link.set("data", nextData);
	setConnectionLabels(link, interactions);
}

function getComponentDescendantIds(graph: joint.dia.Graph, componentClientId: string) {
	const components: HierarchyComponent[] = graph.getCells().flatMap(cell => {
		const data = getDiagramData(cell);
		return data?.kind === "component"
			? [
					{
						clientId: data.component.clientId,
						fatherClientId: data.component.fatherClientId,
						type: data.component.type
					}
				]
			: [];
	});
	return getDomainComponentDescendantIds(components, componentClientId);
}

function getEndpointComponentClientId(
	graph: joint.dia.Graph,
	cell: joint.dia.Cell,
	end: "source" | "target"
) {
	const endpoint: unknown = cell.get(end);
	if (!endpoint || typeof endpoint !== "object" || !("id" in endpoint)) return null;

	const endpointId = endpoint.id;
	if (typeof endpointId !== "string" && typeof endpointId !== "number") return null;

	const endpointCell = graph.getCell(String(endpointId));
	const data = endpointCell ? getDiagramData(endpointCell) : null;
	return data?.kind === "component" ? data.component.clientId : null;
}

function removeDiagramCell(graph: joint.dia.Graph, cell: joint.dia.Cell): boolean {
	const data = getDiagramData(cell);
	if (data?.kind !== "component") {
		cell.remove();
		return false;
	}

	const cells = graph.getCells();
	const components: HierarchyComponent[] = cells.flatMap(candidate => {
		const candidateData = getDiagramData(candidate);
		return candidateData?.kind === "component"
			? [
					{
						clientId: candidateData.component.clientId,
						fatherClientId: candidateData.component.fatherClientId,
						type: candidateData.component.type
					}
				]
			: [];
	});
	const connections: ConnectionEndpoints[] = cells.flatMap(candidate => {
		const candidateData = getDiagramData(candidate);
		return candidateData?.kind === "connection"
			? [
					{
						clientId: candidateData.connection.clientId,
						sourceClientId: getEndpointComponentClientId(graph, candidate, "source"),
						targetClientId: getEndpointComponentClientId(graph, candidate, "target")
					}
				]
			: [];
	});
	const plan = getCascadeDeletionPlan(components, connections, data.component.clientId);

	cells.forEach(candidate => {
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

function nextCode(graph: joint.dia.Graph, prefix: "C" | "Cn") {
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

function createClientId() {
	return crypto.randomUUID();
}

function setConnectionLabels(link: joint.dia.Link, interactions: InteractionData[]) {
	const existingPositions = new Map<string, joint.dia.Link.Label["position"]>();
	link.labels().forEach(label => {
		const clientId = label.attrs?.text?.["data-interaction-client-id"];
		if (typeof clientId === "string" && label.position !== undefined) {
			existingPositions.set(clientId, label.position);
		}
	});

	link.labels(
		interactions.map((interaction, index) => {
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
						fill: CONNECTION_LABEL_TEXT_COLOR
					},
					rect: {
						fill: CONNECTION_LABEL_BACKGROUND_COLOR,
						stroke: CONNECTION_LABEL_BORDER_COLOR,
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
		})
	);
}

function VisualControlStructure({
	environmentIncluded,
	onEnvironmentIncludedChange
}: VisualControlStructureProps) {
	const canvasRef = useRef<HTMLDivElement>(null);
	const graphRef = useRef<joint.dia.Graph | null>(null);
	const paperRef = useRef<joint.dia.Paper | null>(null);
	const selectedCellRef = useRef<joint.dia.Cell | null>(null);
	const environmentIncludedChangeRef = useRef(onEnvironmentIncludedChange);
	const scaleRef = useRef(1);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [draft, setDraft] = useState<PropertiesDraft | null>(null);
	const [zoom, setZoom] = useState(100);
	environmentIncludedChangeRef.current = onEnvironmentIncludedChange;

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const paperContainer = document.createElement("div");
		paperContainer.className = styles.paper_host;
		canvas.appendChild(paperContainer);

		const graph = new joint.dia.Graph({}, { cellNamespace: joint.shapes });
		graphRef.current = graph;

		Object.assign(joint.anchors, {
			sideRatio: (
				endView: joint.dia.CellView,
				_magnet: SVGElement,
				_reference: joint.g.Point | SVGElement,
				args: SideRatioAnchor
			) => {
				const bbox = endView.model.getBBox();
				const point = sideRatioToPoint(bbox, args);
				return new joint.g.Point(point.x, point.y);
			}
		});

		const paper = new joint.dia.Paper({
			el: paperContainer,
			model: graph,
			width: canvas.clientWidth,
			height: canvas.clientHeight,
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
				const interactions: InteractionData[] = [
					{
						clientId: createClientId(),
						code: FIRST_INTERACTION_CODE,
						name: "",
						interactionType: IInteractionType.COMMUNICATION_CHANNEL
					}
				];
				const link = new joint.shapes.standard.Link({
					z: 2,
					data: {
						kind: "connection",
						connection: {
							clientId: createClientId(),
							code: nextCode(graph, "Cn"),
							style: IConnectionStyle.SOLID,
							interactions
						}
					},
					attrs: {
						line: {
							stroke: CONNECTION_COLOR,
							strokeWidth: 1.5,
							targetMarker: {
								type: "path",
								d: "M 8 -4 0 0 8 4 z",
								fill: CONNECTION_COLOR,
								stroke: "none"
							},
							sourceMarker: { type: "none" }
						}
					}
				});
				setConnectionLabels(link, interactions);
				return link;
			},
			cellViewNamespace: joint.shapes,
			interactive: cellView =>
				cellView.model.isLink() ? { vertexAdd: true, labelMove: true } : true
		});
		paperRef.current = paper;

		const deselect = () => {
			const current = selectedCellRef.current;
			if (current) {
				paper.findViewByModel(current)?.unhighlight();
				if (current.isLink()) paper.findViewByModel(current)?.removeTools();
			}
			selectedCellRef.current = null;
			setSelectedId(null);
			setDraft(null);
		};

		const selectCell = (cell: joint.dia.Cell) => {
			const previous = selectedCellRef.current;
			if (previous) {
				paper.findViewByModel(previous)?.unhighlight();
				if (previous.isLink()) paper.findViewByModel(previous)?.removeTools();
			}

			if (cell.isLink()) normalizeConnectionInteractions(graph, cell);
			selectedCellRef.current = cell;
			setSelectedId(cell.id.toString());
			const data = getDiagramData(cell);
			if (data?.kind === "component") {
				setDraft({ kind: "component", ...data.component });
			} else if (data?.kind === "connection") {
				setDraft({
					kind: "connection",
					backendId: data.connection.backendId,
					clientId: data.connection.clientId,
					code: data.connection.code,
					style: data.connection.style,
					interactions: data.connection.interactions.map(interaction => ({ ...interaction }))
				});
			} else {
				setDraft(null);
			}
			paper.findViewByModel(cell)?.highlight(undefined, {
				highlighter: {
					name: "stroke",
					options: {
						padding: 4,
						attrs: { stroke: SELECTION_HIGHLIGHT_COLOR, "stroke-width": 2 }
					}
				}
			});
			if (cell.isLink()) addAnchorTools(cell);
		};

		const setSideRatioAnchor = (linkView: joint.dia.LinkView, end: joint.dia.LinkEnd) => {
			const endView = linkView.getEndView(end);
			if (!endView || !endView.model.isElement()) return;

			const bbox = endView.model.getBBox();
			const point = linkView.getEndAnchor(end);
			const anchor = pointToSideRatio(bbox, point);
			linkView.model.prop(`${end}/anchor`, {
				name: "sideRatio",
				args: anchor
			});
		};

		const createAnchorTool = (end: joint.dia.LinkEnd) => {
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
							: { side: "top", ratio: 0.5 }
					};
				},
				customAnchorAttributes: {
					r: 6,
					fill: ACTIVE_ANCHOR_COLOR,
					stroke: ANCHOR_HANDLE_STROKE_COLOR,
					"stroke-width": 2,
					cursor: "grab"
				},
				defaultAnchorAttributes: {
					r: 6,
					fill: DEFAULT_ANCHOR_COLOR,
					stroke: ANCHOR_HANDLE_STROKE_COLOR,
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
		};

		const addAnchorTools = (link: joint.dia.Link) => {
			const linkView = paper.findViewByModel(link);
			if (!linkView) return;
			linkView.removeTools();
			linkView.addTools(
				new joint.dia.ToolsView({
					tools: [createAnchorTool("source"), createAnchorTool("target")]
				})
			);
		};

		paper.on("blank:pointerdown", deselect);
		paper.on("element:pointerclick", view => selectCell(view.model));
		paper.on("link:pointerclick", view => selectCell(view.model));
		paper.on("link:connect", (linkView, _event, _elementView, _magnet, arrowhead) => {
			setSideRatioAnchor(linkView, arrowhead);
			setSideRatioAnchor(linkView, arrowhead === "source" ? "target" : "source");
			normalizeConnectionInteractions(graph, linkView.model);
			selectCell(linkView.model);
		});
		paper.on("link:disconnect", linkView => {
			normalizeConnectionInteractions(graph, linkView.model);
			selectCell(linkView.model);
		});

		const resizeObserver = new ResizeObserver(() => {
			paper.setDimensions(canvas.clientWidth, canvas.clientHeight);
		});
		resizeObserver.observe(canvas);

		let panning = false;
		let panStartX = 0;
		let panStartY = 0;
		let translateX = 0;
		let translateY = 0;
		const onMouseDown = (event: MouseEvent) => {
			if ((event.target as HTMLElement).closest(".joint-cell")) return;
			if ((event.target as HTMLElement).closest("button")) return;

			panning = true;
			panStartX = event.clientX;
			panStartY = event.clientY;
			const translation = paper.translate();
			translateX = translation.tx;
			translateY = translation.ty;
			canvas.style.cursor = "grabbing";
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
			canvas.style.cursor = "";
		};
		const onWheel = (event: WheelEvent) => {
			event.preventDefault();
			const nextScale = Math.max(
				0.2,
				Math.min(3, scaleRef.current + (event.deltaY < 0 ? 0.08 : -0.08))
			);
			const bounds = canvas.getBoundingClientRect();
			const mouseX = event.clientX - bounds.left;
			const mouseY = event.clientY - bounds.top;
			const translation = paper.translate();
			paper.scale(nextScale);
			paper.translate(
				mouseX - (mouseX - translation.tx) * (nextScale / scaleRef.current),
				mouseY - (mouseY - translation.ty) * (nextScale / scaleRef.current)
			);
			scaleRef.current = nextScale;
			setZoom(Math.round(nextScale * 100));
		};
		const onKeyDown = (event: KeyboardEvent) => {
			const target = event.target as HTMLElement;
			if (target.matches("input, select, textarea")) return;
			if (event.key === "Escape") deselect();
			if ((event.key === "Delete" || event.key === "Backspace") && selectedCellRef.current) {
				const environmentRemoved = removeDiagramCell(graph, selectedCellRef.current);
				if (environmentRemoved) environmentIncludedChangeRef.current(false);
				deselect();
			}
		};

		canvas.addEventListener("mousedown", onMouseDown);
		canvas.addEventListener("wheel", onWheel, { passive: false });
		canvas.addEventListener("keydown", onKeyDown);
		document.addEventListener("mousemove", onMouseMove);
		document.addEventListener("mouseup", onMouseUp);

		return () => {
			resizeObserver.disconnect();
			canvas.removeEventListener("mousedown", onMouseDown);
			canvas.removeEventListener("wheel", onWheel);
			canvas.removeEventListener("keydown", onKeyDown);
			document.removeEventListener("mousemove", onMouseMove);
			document.removeEventListener("mouseup", onMouseUp);
			paper.remove();
			paperRef.current = null;
			graphRef.current = null;
		};
	}, []);

	const addComponent = (type: IComponentType) => {
		const graph = graphRef.current;
		const paper = paperRef.current;
		const canvas = canvasRef.current;
		if (!graph || !paper || !canvas) return;

		const isEnvironment = type === IComponentType.ENVIRONMENT;
		if (
			isEnvironment &&
			(environmentIncluded ||
				graph.getCells().some(cell => {
					const data = getDiagramData(cell);
					return (
						data?.kind === "component" &&
						data.component.type === IComponentType.ENVIRONMENT
					);
				}))
		) {
			return;
		}

		const code = isEnvironment ? ENVIRONMENT_CODE : nextCode(graph, "C");
		const name = isEnvironment
			? ENVIRONMENT_NAME
			: `${COMPONENT_TYPE_LABELS[type]} ${code.split(".")[1]}`;
		const size = DEFAULT_COMPONENT_SIZE;
		const translation = paper.translate();
		const scale = paper.scale().sx;
		const centerX = (canvas.clientWidth / 2 - translation.tx) / scale;
		const centerY = (canvas.clientHeight / 2 - translation.ty) / scale;
		const offset = graph.getCells().filter(cell => cell.isElement()).length * 22;

		const component = new joint.shapes.standard.Rectangle({
			position: {
				x: centerX - size.width / 2 + offset,
				y: centerY - size.height / 2 + offset
			},
			size,
			z: 1,
			data: {
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
			},
			attrs: {
				body: {
					fill: COMPONENT_COLORS[type],
					stroke: CONNECTION_COLOR,
					strokeWidth: 1.5,
					rx: 4,
					ry: 4,
					magnet: true
				},
				label: {
					text: name,
					fontSize: 13,
					fontFamily: "sans-serif",
					fontWeight: "500",
					fill: CONNECTION_COLOR,
					textWrap: { width: -16, height: -10, ellipsis: true }
				}
			}
		});
		graph.addCell(component);
		if (isEnvironment) onEnvironmentIncludedChange(true);
		selectCellById(component);
		paper.findViewByModel(component)?.highlight(undefined, {
			highlighter: {
				name: "stroke",
				options: {
					padding: 4,
					attrs: { stroke: SELECTION_HIGHLIGHT_COLOR, "stroke-width": 2 }
				}
			}
		});
	};

	const selectCellById = (cell: joint.dia.Cell) => {
		const previous = selectedCellRef.current;
		if (previous) {
			paperRef.current?.findViewByModel(previous)?.unhighlight();
			if (previous.isLink()) paperRef.current?.findViewByModel(previous)?.removeTools();
		}
		if (cell.isLink() && graphRef.current) {
			normalizeConnectionInteractions(graphRef.current, cell);
		}
		selectedCellRef.current = cell;
		setSelectedId(cell.id.toString());
		const data = getDiagramData(cell);
		if (data?.kind === "component") {
			setDraft({ kind: "component", ...data.component });
		} else if (data?.kind === "connection") {
			setDraft({
				kind: "connection",
				backendId: data.connection.backendId,
				clientId: data.connection.clientId,
				code: data.connection.code,
				style: data.connection.style,
				interactions: data.connection.interactions.map(interaction => ({ ...interaction }))
			});
		}
	};

	const applyDraft = () => {
		const cell = selectedCellRef.current;
		const graph = graphRef.current;
		if (!cell || !draft || !graph) return;

		if (draft.kind === "component" && cell.isElement()) {
			if (!isValidComponentSize(draft.width, draft.height)) return;

			const nextData: ComponentData = {
				kind: "component",
				component: {
					backendId: draft.backendId,
					clientId: draft.clientId,
					name: draft.name,
					code: draft.code,
					type: draft.type,
					border: draft.border,
					fatherClientId: draft.fatherClientId,
					isVisible: draft.isVisible,
					width: draft.width,
					height: draft.height
				}
			};
			cell.set("data", nextData);
			cell.resize(draft.width, draft.height);
			cell.attr({
				body: {
					fill: COMPONENT_COLORS[draft.type],
					strokeDasharray:
						draft.border === IComponentBorder.SOLID
							? "none"
							: draft.border === IComponentBorder.DASHED
								? "8 4"
								: "2 2"
				},
				label: { text: draft.name }
			});
		} else if (draft.kind === "connection" && cell.isLink()) {
			const nextData: ConnectionData = {
				kind: "connection",
				connection: {
					backendId: draft.backendId,
					clientId: draft.clientId,
					code: draft.code,
					style: draft.style,
					interactions: draft.interactions.map(interaction => ({ ...interaction }))
				}
			};
			cell.set("data", nextData);
			cell.attr(
				"line/strokeDasharray",
				draft.style === IConnectionStyle.SOLID
					? "none"
					: draft.style === IConnectionStyle.DASHED
						? "8 4"
						: "2 2"
			);
			setConnectionLabels(cell, draft.interactions);
		}
	};

	const deleteSelected = () => {
		const graph = graphRef.current;
		const cell = selectedCellRef.current;
		if (graph && cell && removeDiagramCell(graph, cell)) {
			onEnvironmentIncludedChange(false);
		}
		selectedCellRef.current = null;
		setSelectedId(null);
		setDraft(null);
	};

	const clearDiagram = () => {
		const graph = graphRef.current;
		if (!graph || !window.confirm("Clear all components and connections?")) return;
		graph.clear();
		onEnvironmentIncludedChange(false);
		selectedCellRef.current = null;
		setSelectedId(null);
		setDraft(null);
	};

	const updateZoom = (nextScale: number) => {
		const paper = paperRef.current;
		if (!paper) return;
		scaleRef.current = Math.max(0.2, Math.min(3, nextScale));
		paper.scale(scaleRef.current);
		setZoom(Math.round(scaleRef.current * 100));
	};

	const resetView = () => {
		updateZoom(1);
		paperRef.current?.translate(0, 0);
	};

	const fatherOptions =
		draft?.kind === "component"
			? (() => {
					const graph = graphRef.current;
					if (!graph) return [];
					const descendantIds = getComponentDescendantIds(graph, draft.clientId);
					return graph.getCells().flatMap(cell => {
						const data = getDiagramData(cell);
						return data?.kind === "component" &&
							data.component.clientId !== draft.clientId &&
							data.component.type !== IComponentType.ENVIRONMENT &&
							!descendantIds.has(data.component.clientId)
							? [data.component]
							: [];
					});
				})()
			: [];
	const allowedDraftInteractionTypes =
		draft?.kind === "connection" && graphRef.current && selectedCellRef.current?.isLink()
			? getAllowedInteractionTypes(graphRef.current, selectedCellRef.current)
			: DEFAULT_INTERACTION_TYPES;

	return (
		<div className={styles.editor}>
			<aside className={styles.palette} aria-label="Add a component">
				<h2>Components</h2>
				{COMPONENT_TYPE_OPTIONS.map(componentType => (
					<button
						key={componentType.value}
						type="button"
						className={styles.palette_item}
						onClick={() => addComponent(componentType.value)}
						title={`Add ${componentType.label}`}
					>
						<span
							className={styles.palette_swatch}
							data-component-type={componentType.value}
							aria-hidden="true"
						/>
						<span>{componentType.label}</span>
						<AddIcon aria-hidden="true" />
					</button>
				))}
				<button
					type="button"
					className={styles.palette_item}
					onClick={() => addComponent(IComponentType.ENVIRONMENT)}
					disabled={environmentIncluded}
					title={environmentIncluded ? "Environment already included" : "Add Environment"}
				>
					<span
						className={styles.palette_swatch}
						data-component-type={IComponentType.ENVIRONMENT}
						aria-hidden="true"
					/>
					<span>Environment</span>
					<AddIcon aria-hidden="true" />
				</button>
				<p className={styles.palette_hint}>Drag from a component edge to create a connection.</p>
			</aside>

			<section className={styles.canvas_section} aria-label="Control structure diagram editor">
				<div className={styles.toolbar} aria-label="Canvas controls">
					<button type="button" onClick={resetView} title="Reset view" aria-label="Reset view">
						<ResetIcon />
					</button>
					<span className={styles.separator} />
					<button
						type="button"
						onClick={() => updateZoom(scaleRef.current - 0.1)}
						title="Zoom out"
						aria-label="Zoom out"
					>
						<ZoomOutIcon />
					</button>
					<span className={styles.zoom_value}>{zoom}%</span>
					<button
						type="button"
						onClick={() => updateZoom(scaleRef.current + 0.1)}
						title="Zoom in"
						aria-label="Zoom in"
					>
						<ZoomInIcon />
					</button>
					<span className={styles.separator} />
					<button
						type="button"
						onClick={deleteSelected}
						disabled={!selectedId}
						title="Delete selected element"
						aria-label="Delete selected element"
					>
						<DeleteIcon />
					</button>
					<button type="button" onClick={clearDiagram} title="Clear diagram">
						Clear
					</button>
				</div>
				<div
					ref={canvasRef}
					className={styles.canvas}
					role="application"
					aria-label="Control structure canvas. Use the component palette to add nodes."
					tabIndex={0}
				/>
				<p className={styles.canvas_hint}>
					Select a component or connection to edit its properties. Drag the background to pan;
					use the wheel to zoom.
				</p>
			</section>

			<aside className={styles.properties} aria-label="Selected element properties">
				<h2>Properties</h2>
				{draft?.kind === "component" && draft.type === IComponentType.ENVIRONMENT ? (
					<p className={styles.properties_hint}>
						The Environment has a fixed identity and cannot be edited.
					</p>
				) : draft?.kind === "component" ? (
					<div className={styles.property_form}>
						<label>
							Name
							<input
								value={draft.name}
								onChange={event =>
									setDraft(current =>
										current?.kind === "component"
											? { ...current, name: event.target.value }
											: current
									)
								}
							/>
						</label>
						<label>
							Code
							<input
								value={draft.code}
								onChange={event =>
									setDraft(current =>
										current?.kind === "component"
											? { ...current, code: event.target.value }
											: current
									)
								}
							/>
						</label>
						<div className={styles.dimensions_fields}>
							<label>
								Width (px)
								<input
									type="number"
									min={20}
									step={1}
									value={draft.width}
									onChange={event =>
										setDraft(current =>
											current?.kind === "component"
												? { ...current, width: Number(event.target.value) }
												: current
										)
									}
								/>
							</label>
							<label>
								Height (px)
								<input
									type="number"
									min={20}
									step={1}
									value={draft.height}
									onChange={event =>
										setDraft(current =>
											current?.kind === "component"
												? { ...current, height: Number(event.target.value) }
												: current
										)
									}
								/>
							</label>
						</div>
						{!isValidComponentSize(draft.width, draft.height) && (
							<p className={styles.properties_hint}>
								Width and height must be whole numbers of at least 20 px.
							</p>
						)}
						<label>
							Type
							<select
								value={draft.type}
								onChange={event =>
									setDraft(current =>
										current?.kind === "component"
											? { ...current, type: event.target.value as IComponentType }
											: current
									)
								}
							>
								{COMPONENT_TYPE_OPTIONS.map(type => (
									<option key={type.value} value={type.value}>
										{type.label}
									</option>
								))}
							</select>
						</label>
						<label>
							Father (optional)
							<select
								value={draft.fatherClientId ?? ""}
								onChange={event =>
									setDraft(current =>
										current?.kind === "component"
											? { ...current, fatherClientId: event.target.value || null }
											: current
									)
								}
							>
								<option value="">None</option>
								{fatherOptions.map(component => (
									<option key={component.clientId} value={component.clientId}>
										{component.name} ({component.code})
									</option>
								))}
							</select>
						</label>
						<label>
							Border
							<select
								value={draft.border}
								onChange={event =>
									setDraft(current =>
										current?.kind === "component"
											? { ...current, border: event.target.value as IComponentBorder }
											: current
									)
								}
							>
								<option value={IComponentBorder.SOLID}>Solid</option>
								<option value={IComponentBorder.DASHED}>Dashed</option>
								<option value={IComponentBorder.ETCHED}>Etched</option>
							</select>
						</label>
						<button
							type="button"
							className={styles.apply_button}
							onClick={applyDraft}
							disabled={!isValidComponentSize(draft.width, draft.height)}
						>
							Apply
						</button>
					</div>
				) : draft?.kind === "connection" ? (
					<div className={styles.property_form}>
						<label>
							Connection code
							<input
								value={draft.code}
								onChange={event =>
									setDraft(current =>
										current?.kind === "connection"
											? { ...current, code: event.target.value }
											: current
									)
								}
							/>
						</label>
						<label>
							Style
							<select
								value={draft.style}
								onChange={event =>
									setDraft(current =>
										current?.kind === "connection"
											? { ...current, style: event.target.value as IConnectionStyle }
											: current
									)
								}
							>
								<option value={IConnectionStyle.SOLID}>Solid</option>
								<option value={IConnectionStyle.DASHED}>Dashed</option>
								<option value={IConnectionStyle.ETCHED}>Etched</option>
							</select>
						</label>
						<div className={styles.section_label}>Interactions</div>
						{draft.interactions.map((interaction, index) => (
							<div key={interaction.clientId} className={styles.interaction}>
								<div className={styles.interaction_header}>
									<strong>{interaction.code}</strong>
									<button
										type="button"
										className={styles.remove_interaction}
										onClick={() =>
											setDraft(current =>
												current?.kind === "connection"
													? {
															...current,
															interactions: current.interactions.filter(
																(_, interactionIndex) => interactionIndex !== index
															)
														}
													: current
											)
										}
										aria-label={`Remove interaction ${interaction.code}`}
									>
										<DeleteIcon />
									</button>
								</div>
								<label>
									Name
									<input
										value={interaction.name}
										onChange={event =>
											setDraft(current =>
												current?.kind === "connection"
													? {
															...current,
															interactions: current.interactions.map((item, itemIndex) =>
																itemIndex === index
																	? { ...item, name: event.target.value }
																	: item
															)
														}
													: current
											)
										}
									/>
								</label>
								<label>
									Type
									<select
										value={interaction.interactionType}
										onChange={event =>
											setDraft(current =>
												current?.kind === "connection"
													? {
															...current,
															interactions: current.interactions.map((item, itemIndex) =>
																itemIndex === index
																	? {
																			...item,
																			interactionType: event.target
																				.value as IInteractionType
																		}
																	: item
															)
														}
													: current
											)
										}
									>
										{INTERACTION_TYPE_OPTIONS
											.filter(type =>
												allowedDraftInteractionTypes.includes(type.value)
											)
											.map(type => (
												<option key={type.value} value={type.value}>
													{type.label}
												</option>
											))}
									</select>
								</label>
							</div>
						))}
						<button
							type="button"
							className={styles.add_interaction}
							onClick={() =>
								setDraft(current =>
									current?.kind === "connection"
										? {
												...current,
												interactions: [
													...current.interactions,
													{
														clientId: createClientId(),
														code: getNextInteractionCode(current.interactions),
														name: "",
														interactionType: allowedDraftInteractionTypes[0]
													}
												]
											}
										: current
								)
							}
						>
							<AddIcon />
							Add interaction
						</button>
						<button type="button" className={styles.apply_button} onClick={applyDraft}>
							Apply
						</button>
					</div>
				) : (
					<p className={styles.properties_hint}>Select a component or connection to edit it.</p>
				)}
			</aside>
		</div>
	);
}

export default VisualControlStructure;
