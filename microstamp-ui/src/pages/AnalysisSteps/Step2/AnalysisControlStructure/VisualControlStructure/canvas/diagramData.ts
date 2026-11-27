import * as joint from "jointjs";
import {
	getAllowedInteractionTypes,
	normalizeInteractions
} from "../domain/rules";
import type {
	ComponentData,
	ConnectionData,
	DiagramData,
	InteractionData
} from "../domain/types";
import {
	applyComponentAppearance,
	applyConnectionAppearance,
	createComponentShape,
	createConnectionShape,
	createInteractionLabels
} from "./shapes";

export interface DiagramSnapshot {
	data: DiagramData;
	position?: { x: number; y: number };
	size?: { width: number; height: number };
}

export function getDiagramData(cell: joint.dia.Cell): DiagramData | null {
	const data: unknown = cell.get("data");
	if (!data || typeof data !== "object" || !("kind" in data)) return null;
	const diagramData = data as DiagramData;
	return diagramData.kind === "component" || diagramData.kind === "connection"
		? diagramData
		: null;
}

function getEndpointComponent(
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
	return data?.kind === "component" ? data.component : null;
}

export function getEndpointComponentType(
	graph: joint.dia.Graph,
	link: joint.dia.Cell,
	end: "source" | "target"
) {
	return getEndpointComponent(graph, link, end)?.type ?? null;
}

export function getEndpointComponentClientId(
	graph: joint.dia.Graph,
	link: joint.dia.Cell,
	end: "source" | "target"
) {
	return getEndpointComponent(graph, link, end)?.clientId ?? null;
}

export function createDiagramCell(
	data: DiagramData,
	position: { x: number; y: number } = { x: 0, y: 0 }
) {
	if (data.kind === "component") return createComponentShape(data.component, position);

	return createConnectionCell(data.connection);
}

export function createConnectionCell(connection: ConnectionData["connection"]) {
	const link = createConnectionShape(connection);
	updateConnectionLabels(link, connection.interactions);
	return link;
}

export function getAllowedInteractionTypesForConnection(
	graph: joint.dia.Graph,
	link: joint.dia.Cell
) {
	return getAllowedInteractionTypes(
		getEndpointComponentType(graph, link, "source"),
		getEndpointComponentType(graph, link, "target")
	);
}

export function updateDiagramCell(cell: joint.dia.Cell, data: DiagramData) {
	cell.set("data", data);

	if (data.kind === "component" && cell.isElement()) {
		cell.resize(data.component.width, data.component.height);
		applyComponentAppearance(cell, data.component);
		return;
	}

	if (data.kind === "connection" && cell.isLink()) {
		applyConnectionAppearance(cell, data.connection.style);
		updateConnectionLabels(cell, data.connection.interactions);
	}
}

export function normalizeConnectionInteractions(graph: joint.dia.Graph, link: joint.dia.Link) {
	const data = getDiagramData(link);
	if (data?.kind !== "connection") return;

	const allowedTypes = getAllowedInteractionTypesForConnection(graph, link);
	const connection: ConnectionData = {
		kind: "connection",
		connection: {
			...data.connection,
			interactions: normalizeInteractions(data.connection.interactions, allowedTypes)
		}
	};
	updateDiagramCell(link, connection);
}

export function extractDiagramSnapshot(cell: joint.dia.Cell): DiagramSnapshot | null {
	const data = getDiagramData(cell);
	if (!data) return null;

	if (data.kind === "component" && cell.isElement()) {
		const position = cell.position();
		const size = cell.size();
		const componentData: ComponentData = {
			kind: "component",
			component: {
				...data.component,
				width: size.width,
				height: size.height
			}
		};
		return { data: componentData, position, size };
	}

	if (data.kind === "connection" && cell.isLink()) {
		const connectionData: ConnectionData = {
			kind: "connection",
			connection: {
				...data.connection,
				interactions: data.connection.interactions.map(interaction => ({ ...interaction }))
			}
		};
		return { data: connectionData };
	}

	return null;
}

export function updateConnectionLabels(link: joint.dia.Link, interactions: InteractionData[]) {
	const existingPositions = new Map<string, joint.dia.Link.Label["position"]>();
	link.labels().forEach(label => {
		const clientId = label.attrs?.text?.["data-interaction-client-id"];
		if (typeof clientId === "string" && label.position !== undefined) {
			existingPositions.set(clientId, label.position);
		}
	});

	link.labels(createInteractionLabels(interactions, existingPositions));
}
