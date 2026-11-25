import { IComponentType } from "@interfaces/IStep2/IComponent";
import { IInteractionType } from "@interfaces/IStep2/IInteraction/Enums";
import { useEffect, useRef, useState } from "react";
import type {
	ComponentData,
	ComponentDraft,
	ConnectionData,
	ConnectionDraft,
	DiagramData,
	InteractionData,
	PropertiesDraft
} from "../domain/types";
import {
	DEFAULT_INTERACTION_TYPES,
	getAllowedInteractionTypes,
	getComponentDescendantIds,
	getNextInteractionCode,
	isReservedComponentCode,
	isReservedComponentName,
	isUniqueCode,
	isValidComponentSize
} from "../domain/rules";
import type { HierarchyComponent } from "../domain/rules";
import { createJointCanvas } from "../canvas/JointCanvas";
import type { CanvasSnapshotItem, JointCanvasApi, JointCanvasCallbacks } from "../canvas/JointCanvas";

interface UseVisualControlStructureOptions {
	environmentIncluded: boolean;
	onEnvironmentIncludedChange: (included: boolean) => void;
	paperHostClassName: string;
}

function cloneDraft(data: DiagramData): PropertiesDraft {
	return data.kind === "component"
		? { kind: "component", ...data.component }
		: {
				kind: "connection",
				...data.connection,
				interactions: data.connection.interactions.map(interaction => ({ ...interaction }))
			};
}

function toComponentData(snapshot: CanvasSnapshotItem[]): ComponentData[] {
	return snapshot.flatMap(item => item.data.kind === "component" ? [item.data] : []);
}

function toConnectionData(snapshot: CanvasSnapshotItem[]): ConnectionData[] {
	return snapshot.flatMap(item => item.data.kind === "connection" ? [item.data] : []);
}

export default function useVisualControlStructure({
	environmentIncluded: externalEnvironmentIncluded,
	onEnvironmentIncludedChange,
	paperHostClassName
}: UseVisualControlStructureOptions) {
	const canvasContainerRef = useRef<HTMLDivElement>(null);
	const canvasRef = useRef<JointCanvasApi | null>(null);
	const callbacksRef = useRef<JointCanvasCallbacks | null>(null);
	const [components, setComponents] = useState<ComponentData[]>([]);
	const [connections, setConnections] = useState<ConnectionData[]>([]);
	const [selectedItem, setSelectedItem] = useState<DiagramData | null>(null);
	const [draft, setDraft] = useState<PropertiesDraft | null>(null);
	const [environmentIncluded, setEnvironmentIncluded] = useState(externalEnvironmentIncluded);
	const [zoom, setZoom] = useState(100);

	callbacksRef.current = {
		onSelectElement: data => {
			setSelectedItem(data);
			setDraft(cloneDraft(data));
		},
		onSelectLink: data => {
			setSelectedItem(data);
			setDraft(cloneDraft(data));
		},
		onConnect: connection => {
			const data: ConnectionData = { kind: "connection", connection };
			setSelectedItem(data);
			setDraft(cloneDraft(data));
		},
		onNodeMove: snapshot => {
			setComponents(toComponentData(snapshot));
			setConnections(toConnectionData(snapshot));
		},
		onClearSelection: () => {
			setSelectedItem(null);
			setDraft(null);
		},
		onDiagramChange: snapshot => {
			setComponents(toComponentData(snapshot));
			setConnections(toConnectionData(snapshot));
		},
		onEnvironmentIncludedChange: included => {
			setEnvironmentIncluded(included);
			onEnvironmentIncludedChange(included);
		},
		onZoomChange: setZoom
	};

	useEffect(() => {
		setEnvironmentIncluded(externalEnvironmentIncluded);
	}, [externalEnvironmentIncluded]);

	useEffect(() => {
		const host = canvasContainerRef.current;
		if (!host) return;

		const latestCallbacks = (): JointCanvasCallbacks => ({
			onSelectElement: data => callbacksRef.current?.onSelectElement(data),
			onSelectLink: data => callbacksRef.current?.onSelectLink(data),
			onConnect: connection => callbacksRef.current?.onConnect(connection),
			onNodeMove: snapshot => callbacksRef.current?.onNodeMove(snapshot),
			onClearSelection: () => callbacksRef.current?.onClearSelection(),
			onDiagramChange: snapshot => callbacksRef.current?.onDiagramChange(snapshot),
			onEnvironmentIncludedChange: included =>
				callbacksRef.current?.onEnvironmentIncludedChange(included),
			onZoomChange: value => callbacksRef.current?.onZoomChange(value)
		});
		const canvas = createJointCanvas(host, latestCallbacks(), paperHostClassName);
		canvasRef.current = canvas;
		return () => {
			canvas.dispose();
			canvasRef.current = null;
		};
	}, [paperHostClassName]);

	const getValidationMessage = (candidate: PropertiesDraft): string | null => {
		if (candidate.kind === "component") {
			if (!isValidComponentSize(candidate.width, candidate.height)) {
				return "Width and height must be whole numbers of at least 20 px.";
			}
			if (isReservedComponentName(candidate.name)) {
				return "The Environment name is reserved.";
			}
			if (isReservedComponentCode(candidate.code)) {
				return "The Environment code is reserved.";
			}
			const existingCodes = [
				...components
					.filter(({ component }) => component.clientId !== candidate.clientId)
					.map(({ component }) => component.code),
				...connections.map(({ connection }) => connection.code)
			];
			if (!isUniqueCode(candidate.code, existingCodes)) {
				return "Code must be unique across components and connections.";
			}
		} else {
			const existingCodes = [
				...components.map(({ component }) => component.code),
				...connections
					.filter(({ connection }) => connection.clientId !== candidate.clientId)
					.map(({ connection }) => connection.code)
			];
			if (!isUniqueCode(candidate.code, existingCodes)) {
				return "Code must be unique across components and connections.";
			}
		}
		return null;
	};

	const applyDraft = () => {
		if (!draft || !selectedItem || getValidationMessage(draft)) return;
		if (draft.kind === "component") {
			const data: ComponentData = {
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
			canvasRef.current?.applySelected(data);
		} else {
			const data: ConnectionData = {
				kind: "connection",
				connection: {
					backendId: draft.backendId,
					clientId: draft.clientId,
					code: draft.code,
					style: draft.style,
					interactions: draft.interactions.map(interaction => ({ ...interaction }))
				}
			};
			canvasRef.current?.applySelected(data);
		}
	};

	const deleteSelected = () => canvasRef.current?.deleteSelected();
	const clearDiagram = () => canvasRef.current?.clear();
	const resetView = () => canvasRef.current?.resetView();
	const onAddComponent = (type: IComponentType) =>
		canvasRef.current?.addComponent(type, environmentIncluded);

	const fatherOptions = draft?.kind === "component"
		? (() => {
				const hierarchy: HierarchyComponent[] = components.map(({ component }) => ({
					clientId: component.clientId,
					fatherClientId: component.fatherClientId,
					type: component.type
				}));
				const descendantIds = getComponentDescendantIds(hierarchy, draft.clientId);
				return components.flatMap(({ component }) =>
					component.clientId !== draft.clientId &&
					component.type !== IComponentType.ENVIRONMENT &&
					!descendantIds.has(component.clientId)
						? [component]
						: []
				);
			})()
		: [];

	const allowedInteractionTypes = (() => {
		if (draft?.kind !== "connection" || selectedItem?.kind !== "connection") {
			return DEFAULT_INTERACTION_TYPES;
		}
		const snapshot = canvasRef.current?.getSnapshot() ?? [];
		const selectedConnection = snapshot.find(
			item => item.data.kind === "connection" &&
				item.data.connection.clientId === selectedItem.connection.clientId
		);
		const componentTypeById = new Map(
			components.map(({ component }) => [component.clientId, component.type])
		);
		return getAllowedInteractionTypes(
			selectedConnection?.sourceClientId
				? componentTypeById.get(selectedConnection.sourceClientId) ?? null
				: null,
			selectedConnection?.targetClientId
				? componentTypeById.get(selectedConnection.targetClientId) ?? null
				: null
		);
	})();

	const updateDraft = <T extends PropertiesDraft["kind"]>(
		kind: T,
		changes: Partial<Extract<PropertiesDraft, { kind: T }>>
	) => {
		setDraft(current => current?.kind === kind ? { ...current, ...changes } as PropertiesDraft : current);
	};

	const onComponentChange = (changes: Partial<ComponentDraft>) =>
		updateDraft("component", changes);
	const onConnectionChange = (changes: Partial<Pick<ConnectionDraft, "code" | "style">>) =>
		updateDraft("connection", changes);
	const updateInteraction = (
		index: number,
		changes: Partial<InteractionData>,
		filter = false
	) => setDraft(current => current?.kind === "connection"
		? {
				...current,
				interactions: filter
					? current.interactions.filter((_, interactionIndex) => interactionIndex !== index)
					: current.interactions.map((interaction, interactionIndex) =>
							interactionIndex === index ? { ...interaction, ...changes } : interaction
						)
			}
		: current);
	const onInteractionNameChange = (index: number, name: string) =>
		updateInteraction(index, { name });
	const onInteractionTypeChange = (index: number, interactionType: IInteractionType) =>
		updateInteraction(index, { interactionType });
	const onInteractionRemove = (index: number) => updateInteraction(index, {}, true);
	const onInteractionAdd = () => setDraft(current =>
		current?.kind === "connection"
			? {
					...current,
					interactions: [
						...current.interactions,
						{
							clientId: crypto.randomUUID(),
							code: getNextInteractionCode(current.interactions),
							name: "",
							interactionType: allowedInteractionTypes[0]
						}
					]
				}
			: current
	);

	return {
		canvasContainerRef,
		components,
		connections,
		selectedItem,
		draft,
		validationMessage: draft ? getValidationMessage(draft) : null,
		environmentIncluded,
		zoom,
		fatherOptions,
		allowedInteractionTypes,
		onAddComponent,
		resetView,
		zoomOut: () => canvasRef.current?.zoomBy(-0.1),
		zoomIn: () => canvasRef.current?.zoomBy(0.1),
		deleteSelected,
		clearDiagram,
		onComponentChange,
		onConnectionChange,
		onInteractionNameChange,
		onInteractionTypeChange,
		onInteractionRemove,
		onInteractionAdd,
		applyDraft,
		hasSelection: selectedItem !== null
	};
}
