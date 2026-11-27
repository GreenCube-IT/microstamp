import { describe, expect, it } from "vitest";
import { IComponentBorder, IComponentType } from "@interfaces/IStep2/IComponent";
import { IConnectionStyle } from "@interfaces/IStep2/IConnection";
import { IInteractionType } from "@interfaces/IStep2/IInteraction/Enums";
import type { IControlStructureReadDto } from "@interfaces/IStep2";
import {
	DEFAULT_LINK_ANCHOR,
	getDefaultComponentPosition
} from "../canvas/layoutDefaults";
import { mapControlStructureToCanvasData } from "./controlStructureAdapter";

describe("mapControlStructureToCanvasData", () => {
	it("maps component hierarchy, environment, connections, and interactions", () => {
		const snapshot: IControlStructureReadDto = {
			analysisId: "analysis-1",
			components: [
				{
					id: "controller-1",
					name: "Controller",
					code: "C.01",
					isVisible: true,
					father: null,
					border: IComponentBorder.SOLID,
					type: "Controller"
				},
				{
					id: "process-1",
					name: "Process",
					code: "P.01",
					isVisible: false,
					father: { id: "controller-1" },
					border: IComponentBorder.DASHED,
					type: "ControlledProcess"
				},
				{
					id: "environment-1",
					name: "Environment",
					code: "Env",
					isVisible: true,
					father: null,
					border: IComponentBorder.SOLID,
					type: "Environment"
				}
			],
			connections: [
				{
					id: "connection-1",
					code: "Cn.01",
					source: { id: "environment-1" },
					target: { id: "process-1" },
					style: IConnectionStyle.ETCHED,
					interactions: [
						{
							id: "interaction-1",
							name: "Input",
							code: "In.01",
							interactionType: IInteractionType.PROCESS_INPUT
						}
					]
				}
			]
		};

		const result = mapControlStructureToCanvasData(snapshot);

		expect(result.components).toHaveLength(3);
		expect(result.components[0].component).toMatchObject({
			backendId: "controller-1",
			clientId: "controller-1",
			type: IComponentType.CONTROLLER,
			fatherClientId: null
		});
		expect(result.components[1].component).toMatchObject({
			backendId: "process-1",
			clientId: "process-1",
			type: IComponentType.CONTROLLED_PROCESS,
			fatherClientId: "controller-1",
			isVisible: false
		});
		expect(result.components[2].component.type).toBe(IComponentType.ENVIRONMENT);
		expect(result.components[2].component.fatherClientId).toBeNull();
		expect(result.connections[0]).toMatchObject({
			sourceClientId: "environment-1",
			targetClientId: "process-1",
			data: {
				connection: {
					backendId: "connection-1",
					clientId: "connection-1",
					style: IConnectionStyle.ETCHED,
					interactions: [
						{
							backendId: "interaction-1",
							clientId: "interaction-1",
							interactionType: IInteractionType.PROCESS_INPUT
						}
					]
				}
			}
		});
	});

	it("maps a valid empty structure to an empty editor snapshot", () => {
		expect(mapControlStructureToCanvasData({
			analysisId: "analysis-1",
			components: [],
			connections: []
		})).toEqual({ components: [], connections: [] });
	});

	it("rejects relationships that reference components outside the snapshot", () => {
		expect(() => mapControlStructureToCanvasData({
			analysisId: "analysis-1",
			components: [],
			connections: [{
				id: "connection-1",
				code: "Cn.01",
				source: { id: "missing-source" },
				target: { id: "missing-target" },
				style: IConnectionStyle.SOLID,
				interactions: []
			}]
		})).toThrow("references unknown component");
	});
});

describe("default canvas layout", () => {
	it("uses the current sequential offset and centered link anchor", () => {
		expect(getDefaultComponentPosition(0, { x: 500, y: 300 })).toEqual({
			x: 405,
			y: 262
		});
		expect(getDefaultComponentPosition(1, { x: 500, y: 300 })).toEqual({
			x: 427,
			y: 284
		});
		expect(DEFAULT_LINK_ANCHOR).toEqual({ name: "center" });
	});
});
