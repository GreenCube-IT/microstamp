import type { IComponentBorder } from "./IComponent";
import type { IConnectionStyle } from "./IConnection";
import type { IInteractionType } from "./IInteraction/Enums";

interface IControlStructureComponentDto {
	id: string;
	name: string;
	code: string;
	isVisible: boolean;
	father: { id: string } | null;
	border: IComponentBorder;
	type: string;
}

interface IControlStructureInteractionDto {
	id: string;
	name: string;
	code: string;
	interactionType: IInteractionType;
}

interface IControlStructureConnectionDto {
	id: string;
	code: string;
	source: { id: string };
	target: { id: string };
	style: IConnectionStyle;
	interactions: IControlStructureInteractionDto[] | null;
}

interface IControlStructureReadDto {
	analysisId: string;
	components: IControlStructureComponentDto[];
	connections: IControlStructureConnectionDto[];
}

export type {
	IControlStructureComponentDto,
	IControlStructureConnectionDto,
	IControlStructureInteractionDto,
	IControlStructureReadDto
};
