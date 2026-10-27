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
import styles from "./VisualControlStructure.module.css";
import "jointjs/dist/joint.min.css";

interface ComponentData {
	kind: "component";
	component: {
		name: string;
		code: string;
		type: IComponentType;
		border: IComponentBorder;
		isVisible: boolean;
	};
}

interface ConnectionData {
	kind: "connection";
	connection: {
		code: string;
		style: IConnectionStyle;
		interactions: {
			code: string;
			name: string;
			interactionType: IInteractionType;
		}[];
	};
}

type DiagramData = ComponentData | ConnectionData;
type ComponentDraft = ComponentData["component"] & { kind: "component" };
type ConnectionDraft = Omit<ConnectionData["connection"], "interactions"> & {
	kind: "connection";
	interactionName: string;
	interactionType: IInteractionType;
};
type PropertiesDraft = ComponentDraft | ConnectionDraft;

const componentTypes: { value: IComponentType; label: string }[] = [
	{ value: IComponentType.CONTROLLER, label: "Controller" },
	{ value: IComponentType.CONTROLLED_PROCESS, label: "Controlled process" },
	{ value: IComponentType.ACTUATOR, label: "Actuator" },
	{ value: IComponentType.SENSOR, label: "Sensor" }
];

const interactionTypes: { value: IInteractionType; label: string }[] = [
	{ value: IInteractionType.CONTROL_ACTION, label: "Control action" },
	{ value: IInteractionType.FEEDBACK, label: "Feedback" },
	{ value: IInteractionType.COMMUNICATION_CHANNEL, label: "Communication channel" },
	{ value: IInteractionType.PROCESS_INPUT, label: "Process input" },
	{ value: IInteractionType.PROCESS_OUTPUT, label: "Process output" },
	{ value: IInteractionType.DISTURBANCE, label: "Disturbance" }
];

const componentTypeLabels: Record<IComponentType, string> = {
	[IComponentType.CONTROLLER]: "Controller",
	[IComponentType.CONTROLLED_PROCESS]: "Controlled process",
	[IComponentType.ACTUATOR]: "Actuator",
	[IComponentType.SENSOR]: "Sensor",
	[IComponentType.ENVIRONMENT]: "Environment"
};

const componentColors: Record<IComponentType, string> = {
	[IComponentType.CONTROLLER]: "#dbeafe",
	[IComponentType.CONTROLLED_PROCESS]: "#dcfce7",
	[IComponentType.ACTUATOR]: "#fef3c7",
	[IComponentType.SENSOR]: "#fce7f3",
	[IComponentType.ENVIRONMENT]: "#e2e8f0"
};

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

function nextCode(graph: joint.dia.Graph, prefix: "C" | "Cn") {
	const pattern = new RegExp(`^${prefix}\\.(\\d+)$`);
	const maxCode = graph.getCells().reduce((max, cell) => {
		const data = getDiagramData(cell);
		const code =
			data?.kind === "component"
				? data.component.code
				: data?.kind === "connection"
					? data.connection.code
					: undefined;
		const match = code?.match(pattern);
		return match ? Math.max(max, Number(match[1])) : max;
	}, 0);
	return `${prefix}.${String(maxCode + 1).padStart(2, "0")}`;
}

function setConnectionLabel(link: joint.dia.Link, name: string) {
	link.labels(
		name.trim()
			? [
					{
						attrs: {
							text: {
								text: name.trim(),
								fontSize: 11,
								fontFamily: "sans-serif",
								fill: "#1e293b"
							},
							rect: {
								fill: "#ffffff",
								stroke: "#cbd5e1",
								strokeWidth: 1,
								rx: 3,
								ry: 3
							}
						},
						position: { distance: 0.5 }
					}
				]
			: []
	);
}

function VisualControlStructure() {
	const canvasRef = useRef<HTMLDivElement>(null);
	const graphRef = useRef<joint.dia.Graph | null>(null);
	const paperRef = useRef<joint.dia.Paper | null>(null);
	const selectedCellRef = useRef<joint.dia.Cell | null>(null);
	const scaleRef = useRef(1);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [draft, setDraft] = useState<PropertiesDraft | null>(null);
	const [zoom, setZoom] = useState(100);

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
			drawGrid: { name: "dot", args: { color: "#c8cdd8", gap: 10 } },
			background: { color: "#f5f5f5" },
			defaultConnectionPoint: { name: "boundary", args: { perpendicular: false } },
			defaultAnchor: { name: "center" },
			linkPinning: false,
			defaultRouter: { name: "normal" },
			defaultConnector: { name: "rounded", args: { radius: 8 } },
			validateConnection: (sourceView, _sourceMagnet, targetView) =>
				sourceView !== targetView &&
				sourceView.model.isElement() &&
				targetView.model.isElement(),
			defaultLink: () =>
				new joint.shapes.standard.Link({
					z: 2,
					data: {
						kind: "connection",
						connection: {
							code: nextCode(graph, "Cn"),
							style: IConnectionStyle.SOLID,
							interactions: [
								{
									code: "In.01",
									name: "",
									interactionType: IInteractionType.COMMUNICATION_CHANNEL
								}
							]
						}
					},
					attrs: {
						line: {
							stroke: "#1e293b",
							strokeWidth: 1.5,
							targetMarker: {
								type: "path",
								d: "M 8 -4 0 0 8 4 z",
								fill: "#1e293b",
								stroke: "none"
							},
							sourceMarker: { type: "none" }
						}
					}
				}),
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

			selectedCellRef.current = cell;
			setSelectedId(cell.id.toString());
			const data = getDiagramData(cell);
			if (data?.kind === "component") {
				setDraft({ kind: "component", ...data.component });
			} else if (data?.kind === "connection") {
				const interaction = data.connection.interactions[0];
				setDraft({
					kind: "connection",
					code: data.connection.code,
					style: data.connection.style,
					interactionName: interaction?.name || "",
					interactionType:
						interaction?.interactionType || IInteractionType.COMMUNICATION_CHANNEL
				});
			} else {
				setDraft(null);
			}
			paper.findViewByModel(cell)?.highlight(undefined, {
				highlighter: {
					name: "stroke",
					options: {
						padding: 4,
						attrs: { stroke: "#d4a056", "stroke-width": 2 }
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
					fill: "#3b82f6",
					stroke: "#ffffff",
					"stroke-width": 2,
					cursor: "grab"
				},
				defaultAnchorAttributes: {
					r: 6,
					fill: "#64748b",
					stroke: "#ffffff",
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
				selectedCellRef.current.remove();
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

		const code = nextCode(graph, "C");
		const name = `${componentTypeLabels[type]} ${code.split(".")[1]}`;
		const size = { width: 190, height: 76 };
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
					name,
					code,
					type,
					border: IComponentBorder.SOLID,
					isVisible: true
				}
			},
			attrs: {
				body: {
					fill: componentColors[type],
					stroke: "#1e293b",
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
					fill: "#1e293b",
					textWrap: { width: -16, height: -10, ellipsis: true }
				}
			}
		});
		graph.addCell(component);
		selectCellById(component);
		paper.findViewByModel(component)?.highlight(undefined, {
			highlighter: {
				name: "stroke",
				options: {
					padding: 4,
					attrs: { stroke: "#d4a056", "stroke-width": 2 }
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
		selectedCellRef.current = cell;
		setSelectedId(cell.id.toString());
		const data = getDiagramData(cell);
		if (data?.kind === "component") {
			setDraft({ kind: "component", ...data.component });
		} else if (data?.kind === "connection") {
			const interaction = data.connection.interactions[0];
			setDraft({
				kind: "connection",
				code: data.connection.code,
				style: data.connection.style,
				interactionName: interaction?.name || "",
				interactionType:
					interaction?.interactionType || IInteractionType.COMMUNICATION_CHANNEL
			});
		}
	};

	const applyDraft = () => {
		const cell = selectedCellRef.current;
		const graph = graphRef.current;
		if (!cell || !draft || !graph) return;

		if (draft.kind === "component" && cell.isElement()) {
			const nextData: ComponentData = {
				kind: "component",
				component: {
					name: draft.name,
					code: draft.code,
					type: draft.type,
					border: draft.border,
					isVisible: draft.isVisible
				}
			};
			cell.set("data", nextData);
			cell.attr({
				body: {
					fill: componentColors[draft.type],
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
					code: draft.code,
					style: draft.style,
					interactions: [
						{
							code: "In.01",
							name: draft.interactionName,
							interactionType: draft.interactionType
						}
					]
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
			setConnectionLabel(cell, draft.interactionName);
		}
	};

	const deleteSelected = () => {
		selectedCellRef.current?.remove();
		selectedCellRef.current = null;
		setSelectedId(null);
		setDraft(null);
	};

	const clearDiagram = () => {
		if (!graphRef.current || !window.confirm("Clear all components and connections?")) return;
		graphRef.current.clear();
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

	return (
		<div className={styles.editor}>
			<aside className={styles.palette} aria-label="Add a component">
				<h2>Components</h2>
				{componentTypes.map(componentType => (
					<button
						key={componentType.value}
						type="button"
						className={styles.palette_item}
						onClick={() => addComponent(componentType.value)}
						title={`Add ${componentType.label}`}
					>
						<span
							className={styles.palette_swatch}
							style={{ backgroundColor: componentColors[componentType.value] }}
							aria-hidden="true"
						/>
						<span>{componentType.label}</span>
						<AddIcon aria-hidden="true" />
					</button>
				))}
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
				{draft?.kind === "component" ? (
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
								{componentTypes.map(type => (
									<option key={type.value} value={type.value}>
										{type.label}
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
						<button type="button" className={styles.apply_button} onClick={applyDraft}>
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
						<div className={styles.section_label}>Interaction</div>
						<label>
							Name
							<input
								value={draft.interactionName}
								onChange={event =>
									setDraft(current =>
										current?.kind === "connection"
											? { ...current, interactionName: event.target.value }
											: current
									)
								}
							/>
						</label>
						<label>
							Type
							<select
								value={draft.interactionType}
								onChange={event =>
									setDraft(current =>
										current?.kind === "connection"
											? {
													...current,
													interactionType: event.target.value as IInteractionType
												}
											: current
									)
								}
							>
								{interactionTypes.map(type => (
									<option key={type.value} value={type.value}>
										{type.label}
									</option>
								))}
							</select>
						</label>
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
