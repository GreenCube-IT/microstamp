import type { IComponentBorder, IComponentType } from "@interfaces/IStep2/IComponent";
import type { IConnectionStyle } from "@interfaces/IStep2/IConnection";
import type { IInteractionType } from "@interfaces/IStep2/IInteraction/Enums";

export interface ComponentData {
	kind: "component";
	component: {
		backendId?: string;
		clientId: string;
		name: string;
		code: string;
		type: IComponentType;
		border: IComponentBorder;
		fatherClientId: string | null;
		isVisible: boolean;
		width: number;
		height: number;
	};
}

export interface ConnectionData {
	kind: "connection";
	connection: {
		backendId?: string;
		clientId: string;
		code: string;
		style: IConnectionStyle;
		interactions: InteractionData[];
	};
}

export interface InteractionData {
	backendId?: string;
	clientId: string;
	code: string;
	name: string;
	interactionType: IInteractionType;
}

export type DiagramData = ComponentData | ConnectionData;
export type ComponentDraft = ComponentData["component"] & { kind: "component" };
export type ConnectionDraft = Omit<ConnectionData["connection"], "interactions"> & {
	kind: "connection";
	interactions: InteractionData[];
};
export type PropertiesDraft = ComponentDraft | ConnectionDraft;
