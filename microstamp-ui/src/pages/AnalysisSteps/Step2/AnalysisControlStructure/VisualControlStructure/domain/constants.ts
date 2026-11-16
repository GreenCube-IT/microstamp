import { IComponentType } from "@interfaces/IStep2/IComponent";
import { IInteractionType } from "@interfaces/IStep2/IInteraction/Enums";

export const ENVIRONMENT_NAME = "Environment";
export const ENVIRONMENT_CODE = "Env";
export const FIRST_INTERACTION_CODE = "In.01";

export const COMPONENT_TYPE_OPTIONS: { value: IComponentType; label: string }[] = [
	{ value: IComponentType.CONTROLLER, label: "Controller" },
	{ value: IComponentType.CONTROLLED_PROCESS, label: "Controlled process" },
	{ value: IComponentType.ACTUATOR, label: "Actuator" },
	{ value: IComponentType.SENSOR, label: "Sensor" }
];

export const INTERACTION_TYPE_OPTIONS: { value: IInteractionType; label: string }[] = [
	{ value: IInteractionType.CONTROL_ACTION, label: "Control action" },
	{ value: IInteractionType.FEEDBACK, label: "Feedback" },
	{ value: IInteractionType.COMMUNICATION_CHANNEL, label: "Communication channel" },
	{ value: IInteractionType.PROCESS_INPUT, label: "Process input" },
	{ value: IInteractionType.PROCESS_OUTPUT, label: "Process output" },
	{ value: IInteractionType.DISTURBANCE, label: "Disturbance" }
];

export const DEFAULT_INTERACTION_TYPES = [
	IInteractionType.CONTROL_ACTION,
	IInteractionType.FEEDBACK,
	IInteractionType.COMMUNICATION_CHANNEL
];

export const SOURCE_ENVIRONMENT_INTERACTION_TYPES = [
	IInteractionType.PROCESS_INPUT,
	IInteractionType.DISTURBANCE
];

export const TARGET_ENVIRONMENT_INTERACTION_TYPES = [IInteractionType.PROCESS_OUTPUT];

export const COMPONENT_TYPE_LABELS: Record<IComponentType, string> = {
	[IComponentType.CONTROLLER]: "Controller",
	[IComponentType.CONTROLLED_PROCESS]: "Controlled process",
	[IComponentType.ACTUATOR]: "Actuator",
	[IComponentType.SENSOR]: "Sensor",
	[IComponentType.ENVIRONMENT]: ENVIRONMENT_NAME
};
