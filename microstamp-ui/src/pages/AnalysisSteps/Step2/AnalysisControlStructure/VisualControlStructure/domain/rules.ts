import type { IComponentType } from "@interfaces/IStep2/IComponent";
import type { IInteractionType } from "@interfaces/IStep2/IInteraction/Enums";
import type { InteractionData } from "./types";

const RESERVED_COMPONENT_NAMES = ["Environment"] as const;
const RESERVED_COMPONENT_CODES = ["Env"] as const;

export const DEFAULT_INTERACTION_TYPES = [
	"CONTROL_ACTION" as IInteractionType,
	"FEEDBACK" as IInteractionType,
	"COMMUNICATION_CHANNEL" as IInteractionType
];
export const SOURCE_ENVIRONMENT_INTERACTION_TYPES = [
	"PROCESS_INPUT" as IInteractionType,
	"DISTURBANCE" as IInteractionType
];
export const TARGET_ENVIRONMENT_INTERACTION_TYPES = [
	"PROCESS_OUTPUT" as IInteractionType
];

export interface HierarchyComponent {
	clientId: string;
	fatherClientId: string | null;
	type: IComponentType;
}

export interface ConnectionEndpoints {
	clientId: string;
	sourceClientId: string | null;
	targetClientId: string | null;
}

export interface CascadeDeletionPlan {
	componentIds: Set<string>;
	connectionIds: Set<string>;
	environmentIncluded: boolean;
}

export function isReservedComponentName(name: string) {
	return RESERVED_COMPONENT_NAMES.includes(name as (typeof RESERVED_COMPONENT_NAMES)[number]);
}

export function isReservedComponentCode(code: string) {
	return RESERVED_COMPONENT_CODES.includes(code as (typeof RESERVED_COMPONENT_CODES)[number]);
}

export function isUniqueCode(code: string, existingCodes: readonly string[]) {
	return !existingCodes.includes(code);
}

export function isValidComponentSize(width: number, height: number) {
	return Number.isInteger(width) && Number.isInteger(height) && width >= 20 && height >= 20;
}

export function getAllowedInteractionTypes(
	sourceType: IComponentType | null,
	targetType: IComponentType | null
): IInteractionType[] {
	if (sourceType === "ENVIRONMENT") return SOURCE_ENVIRONMENT_INTERACTION_TYPES;
	if (targetType === "ENVIRONMENT") return TARGET_ENVIRONMENT_INTERACTION_TYPES;
	return DEFAULT_INTERACTION_TYPES;
}

export function normalizeInteractions(
	interactions: InteractionData[],
	allowedTypes: readonly IInteractionType[]
): InteractionData[] {
	const fallbackType = allowedTypes[0];
	return interactions.map(interaction =>
		allowedTypes.includes(interaction.interactionType)
			? interaction
			: { ...interaction, interactionType: fallbackType }
	);
}

export function getComponentDescendantIds(
	components: readonly HierarchyComponent[],
	componentClientId: string
) {
	const descendantIds = new Set<string>();
	const pendingIds = [componentClientId];

	while (pendingIds.length > 0) {
		const parentId = pendingIds.pop();
		if (!parentId) continue;

		components.forEach(component => {
			if (
				component.fatherClientId === parentId &&
				!descendantIds.has(component.clientId)
			) {
				descendantIds.add(component.clientId);
				pendingIds.push(component.clientId);
			}
		});
	}

	return descendantIds;
}

export function getCascadeDeletionPlan(
	components: readonly HierarchyComponent[],
	connections: readonly ConnectionEndpoints[],
	componentClientId: string
): CascadeDeletionPlan {
	const componentIds = getComponentDescendantIds(components, componentClientId);
	componentIds.add(componentClientId);
	const connectionIds = new Set(
		connections
			.filter(
				connection =>
					(connection.sourceClientId !== null &&
						componentIds.has(connection.sourceClientId)) ||
					(connection.targetClientId !== null &&
						componentIds.has(connection.targetClientId))
			)
			.map(connection => connection.clientId)
	);
	const environmentIncluded = components.some(
		component =>
			componentIds.has(component.clientId) && component.type === "ENVIRONMENT"
	);

	return { componentIds, connectionIds, environmentIncluded };
}

export function getNextCode(existingCodes: readonly string[], prefix: "C" | "Cn") {
	const pattern = new RegExp(`^${prefix}\\.(\\d+)$`);
	const maxCode = existingCodes.reduce((max, code) => {
		const match = code.match(pattern);
		return match ? Math.max(max, Number(match[1])) : max;
	}, 0);
	return `${prefix}.${String(maxCode + 1).padStart(2, "0")}`;
}

export function getNextInteractionCode(interactions: readonly Pick<InteractionData, "code">[]) {
	const maxCode = interactions.reduce((max, interaction) => {
		const match = interaction.code.match(/^In\.(\d+)$/);
		return match ? Math.max(max, Number(match[1])) : max;
	}, 0);
	return `In.${String(maxCode + 1).padStart(2, "0")}`;
}
