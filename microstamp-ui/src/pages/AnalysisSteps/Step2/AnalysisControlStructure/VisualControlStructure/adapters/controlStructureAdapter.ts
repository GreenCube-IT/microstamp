import { IComponentBorder, IComponentType } from "@interfaces/IStep2/IComponent";
import type { IControlStructureReadDto } from "@interfaces/IStep2";
import type { CanvasInitialData, ComponentData, ConnectionData } from "../domain/types";
import { DEFAULT_COMPONENT_SIZE } from "../canvas/visualConstants";

function mapComponentType(type: string): IComponentType {
	switch (type) {
		case "Controller":
			return IComponentType.CONTROLLER;
		case "ControlledProcess":
			return IComponentType.CONTROLLED_PROCESS;
		case "Actuator":
			return IComponentType.ACTUATOR;
		case "Sensor":
			return IComponentType.SENSOR;
		case "Environment":
			return IComponentType.ENVIRONMENT;
		default:
			throw new Error(`Unsupported component type in control structure: ${type}`);
	}
}

function mapComponentBorder(border: string): IComponentBorder {
	switch (border) {
		case "SOLID":
			return IComponentBorder.SOLID;
		case "DASHED":
			return IComponentBorder.DASHED;
		case "ETCHED":
			return IComponentBorder.ETCHED;
		default:
			throw new Error(`Unsupported component border in control structure: ${border}`);
	}
}

function requireComponentId(componentId: string, componentIds: Set<string>, relationship: string) {
	if (!componentIds.has(componentId)) {
		throw new Error(`Control structure ${relationship} references unknown component ${componentId}.`);
	}
	return componentId;
}

export function mapControlStructureToCanvasData(
	snapshot: IControlStructureReadDto
): CanvasInitialData {
	const componentIds = new Set(snapshot.components.map(component => component.id));
	const components: ComponentData[] = snapshot.components.map(component => ({
		kind: "component",
		component: {
			backendId: component.id,
			clientId: component.id,
			name: component.name,
			code: component.code,
			type: mapComponentType(component.type),
			border: mapComponentBorder(component.border),
			fatherClientId: component.father
				? requireComponentId(component.father.id, componentIds, "parent")
				: null,
			isVisible: component.isVisible,
			width: DEFAULT_COMPONENT_SIZE.width,
			height: DEFAULT_COMPONENT_SIZE.height
		}
	}));

	const connections = snapshot.connections.map(connection => {
		requireComponentId(connection.source.id, componentIds, "source");
		requireComponentId(connection.target.id, componentIds, "target");

		const data: ConnectionData = {
			kind: "connection",
			connection: {
				backendId: connection.id,
				clientId: connection.id,
				code: connection.code,
				style: connection.style,
				interactions: (connection.interactions ?? []).map(interaction => ({
					backendId: interaction.id,
					clientId: interaction.id,
					code: interaction.code,
					name: interaction.name,
					interactionType: interaction.interactionType
				}))
			}
		};

		return {
			data,
			sourceClientId: connection.source.id,
			targetClientId: connection.target.id
		};
	});

	return { components, connections };
}
