import { IComponentBorder, IComponentType } from "@interfaces/IStep2/IComponent";
import { IConnectionStyle } from "@interfaces/IStep2/IConnection";
import { IInteractionType } from "@interfaces/IStep2/IInteraction/Enums";
import * as joint from "jointjs";
import { useEffect, useRef, useState } from "react";
import CanvasToolbar from "./components/CanvasToolbar";
import ComponentPalette from "./components/ComponentPalette";
import PropertiesPanel from "./components/PropertiesPanel";
import {
	createConnectionCell,
	createDiagramCell,
	extractDiagramSnapshot,
	getAllowedInteractionTypesForConnection,
	getDiagramData,
	getEndpointComponentClientId,
	normalizeConnectionInteractions,
	updateDiagramCell
} from "./canvas/diagramData";
import {
	createAnchorToolsView,
	highlightCell,
	getSideRatioAnchor,
	setSideRatioAnchor,
	unhighlightCell
} from "./canvas/shapes";
import {
	COMPONENT_TYPE_LABELS,
	ENVIRONMENT_CODE,
	ENVIRONMENT_NAME,
	FIRST_INTERACTION_CODE
} from "./domain/constants";
import type {
	ComponentData,
	ConnectionData,
	InteractionData,
	PropertiesDraft
} from "./domain/types";
import {
	CANVAS_BACKGROUND_COLOR,
	CANVAS_GRID_COLOR,
	DEFAULT_COMPONENT_SIZE
} from "./canvas/visualConstants";
import {
	DEFAULT_INTERACTION_TYPES,
	getCascadeDeletionPlan,
	getComponentDescendantIds as getDomainComponentDescendantIds,
	getNextCode,
	getNextInteractionCode,
	isValidComponentSize
} from "./domain/rules";
import type { ConnectionEndpoints, HierarchyComponent } from "./domain/rules";
import type { SideRatioAnchor } from "./canvas/shapes";
import styles from "./VisualControlStructure.module.css";
import "jointjs/dist/joint.min.css";

interface VisualControlStructureProps {
	environmentIncluded: boolean;
	onEnvironmentIncludedChange: (included: boolean) => void;
}

function getComponentDescendantIds(graph: joint.dia.Graph, componentClientId: string) {
	const components: HierarchyComponent[] = graph.getCells().flatMap(cell => {
		const data = extractDiagramSnapshot(cell)?.data;
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
				magnet: SVGElement,
				reference: joint.g.Point | SVGElement,
				args: SideRatioAnchor
			) => getSideRatioAnchor(endView, magnet, reference, args)
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
				const data: ConnectionData = {
					kind: "connection",
					connection: {
						clientId: createClientId(),
						code: nextCode(graph, "Cn"),
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
		paperRef.current = paper;

		const deselect = () => {
			const current = selectedCellRef.current;
			if (current) {
				unhighlightCell(paper.findViewByModel(current));
				if (current.isLink()) paper.findViewByModel(current)?.removeTools();
			}
			selectedCellRef.current = null;
			setSelectedId(null);
			setDraft(null);
		};

		const selectCell = (cell: joint.dia.Cell) => {
			const previous = selectedCellRef.current;
			if (previous) {
				unhighlightCell(paper.findViewByModel(previous));
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
			highlightCell(paper.findViewByModel(cell));
			if (cell.isLink()) addAnchorTools(cell);
		};

		const addAnchorTools = (link: joint.dia.Link) => {
			const linkView = paper.findViewByModel(link);
			if (!linkView) return;
			linkView.removeTools();
			linkView.addTools(createAnchorToolsView());
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
		if (isEnvironment) onEnvironmentIncludedChange(true);
		selectCellById(component);
		highlightCell(paper.findViewByModel(component));
	};

	const selectCellById = (cell: joint.dia.Cell) => {
		const previous = selectedCellRef.current;
		if (previous) {
			unhighlightCell(paperRef.current?.findViewByModel(previous));
			if (previous.isLink()) paperRef.current?.findViewByModel(previous)?.removeTools();
		}
		if (cell.isLink() && graphRef.current) {
			normalizeConnectionInteractions(graphRef.current, cell);
		}
		selectedCellRef.current = cell;
		setSelectedId(cell.id.toString());
		const data = extractDiagramSnapshot(cell)?.data;
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
			updateDiagramCell(cell, nextData);
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
			updateDiagramCell(cell, nextData);
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
			? getAllowedInteractionTypesForConnection(graphRef.current, selectedCellRef.current)
			: DEFAULT_INTERACTION_TYPES;

	return (
		<div className={styles.editor}>
			<ComponentPalette
				environmentIncluded={environmentIncluded}
				onAddComponent={addComponent}
			/>

			<section className={styles.canvas_section} aria-label="Control structure diagram editor">
				<CanvasToolbar
					zoom={zoom}
					hasSelection={Boolean(selectedId)}
					onReset={resetView}
					onZoomOut={() => updateZoom(scaleRef.current - 0.1)}
					onZoomIn={() => updateZoom(scaleRef.current + 0.1)}
					onDelete={deleteSelected}
					onClear={clearDiagram}
				/>
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

			<PropertiesPanel
				draft={draft}
				fatherOptions={fatherOptions}
				allowedInteractionTypes={allowedDraftInteractionTypes}
				onComponentChange={changes =>
					setDraft(current =>
						current?.kind === "component" ? { ...current, ...changes } : current
					)
				}
				onConnectionChange={changes =>
					setDraft(current =>
						current?.kind === "connection" ? { ...current, ...changes } : current
					)
				}
				onInteractionNameChange={(index, name) =>
					setDraft(current =>
						current?.kind === "connection"
							? {
									...current,
									interactions: current.interactions.map((interaction, interactionIndex) =>
										interactionIndex === index ? { ...interaction, name } : interaction
									)
								}
							: current
					)
				}
				onInteractionTypeChange={(index, interactionType) =>
					setDraft(current =>
						current?.kind === "connection"
							? {
									...current,
									interactions: current.interactions.map((interaction, interactionIndex) =>
										interactionIndex === index
											? { ...interaction, interactionType }
											: interaction
									)
								}
							: current
					)
				}
				onInteractionRemove={index =>
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
				onInteractionAdd={() =>
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
				onApply={applyDraft}
			/>
		</div>
	);
}

export default VisualControlStructure;
