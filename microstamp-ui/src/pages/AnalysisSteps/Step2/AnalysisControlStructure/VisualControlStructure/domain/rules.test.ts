import assert from "node:assert/strict";
import test from "node:test";
import {
	getAllowedInteractionTypes,
	getCascadeDeletionPlan,
	getComponentDescendantIds,
	getNextCode,
	getNextInteractionCode,
	isReservedComponentCode,
	isReservedComponentName,
	isUniqueCode,
	isValidComponentSize,
	normalizeInteractions
} from "./rules.ts";
import type { HierarchyComponent } from "./rules.ts";
import type { InteractionData } from "./types";

const COMPONENT_TYPE = {
	CONTROLLER: "CONTROLLER",
	ACTUATOR: "ACTUATOR",
	SENSOR: "SENSOR",
	ENVIRONMENT: "ENVIRONMENT"
} as const;

test("reserved Environment identity and code are recognized", () => {
	assert.equal(isReservedComponentName("Environment"), true);
	assert.equal(isReservedComponentCode("Env"), true);
	assert.equal(isReservedComponentName("Controller"), false);
	assert.equal(isReservedComponentCode("C.01"), false);
});

test("component and connection codes can be checked for uniqueness", () => {
	assert.equal(isUniqueCode("C.02", ["C.01"]), true);
	assert.equal(isUniqueCode("C.01", ["C.01", "C.02"]), false);
});

test("component size validation preserves integer minimum bounds", () => {
	assert.equal(isValidComponentSize(20, 20), true);
	assert.equal(isValidComponentSize(19, 20), false);
	assert.equal(isValidComponentSize(20.5, 20), false);
});

test("interaction types depend on Environment endpoint roles", () => {
	assert.deepEqual(
		getAllowedInteractionTypes(COMPONENT_TYPE.ENVIRONMENT, COMPONENT_TYPE.CONTROLLER),
		["PROCESS_INPUT", "DISTURBANCE"]
	);
	assert.deepEqual(
		getAllowedInteractionTypes(COMPONENT_TYPE.CONTROLLER, COMPONENT_TYPE.ENVIRONMENT),
		["PROCESS_OUTPUT"]
	);
	assert.deepEqual(
		getAllowedInteractionTypes(COMPONENT_TYPE.CONTROLLER, COMPONENT_TYPE.SENSOR),
		["CONTROL_ACTION", "FEEDBACK", "COMMUNICATION_CHANNEL"]
	);
});

test("interactions that become invalid are normalized to the first allowed type", () => {
	const interactions: InteractionData[] = [
		{
			clientId: "i1",
			code: "In.01",
			name: "",
			interactionType: "CONTROL_ACTION" as InteractionData["interactionType"]
		},
		{
			clientId: "i2",
			code: "In.02",
			name: "Valid",
			interactionType: "PROCESS_INPUT" as InteractionData["interactionType"]
		}
	];

	assert.deepEqual(
		normalizeInteractions(interactions, ["PROCESS_OUTPUT"]),
		interactions.map(interaction => ({
			...interaction,
			interactionType: "PROCESS_OUTPUT"
		}))
	);
});

test("descendant lookup includes every nested level without including the root", () => {
	const components: HierarchyComponent[] = [
		{
			clientId: "root",
			fatherClientId: null,
			type: COMPONENT_TYPE.CONTROLLER as HierarchyComponent["type"]
		},
		{
			clientId: "child",
			fatherClientId: "root",
			type: COMPONENT_TYPE.ACTUATOR as HierarchyComponent["type"]
		},
		{
			clientId: "grandchild",
			fatherClientId: "child",
			type: COMPONENT_TYPE.SENSOR as HierarchyComponent["type"]
		},
		{
			clientId: "other",
			fatherClientId: null,
			type: COMPONENT_TYPE.CONTROLLER as HierarchyComponent["type"]
		}
	];

	assert.deepEqual(
		[...getComponentDescendantIds(components, "root")].sort(),
		["child", "grandchild"]
	);
});

test("cascade plan removes descendants and connections that become orphaned", () => {
	const components: HierarchyComponent[] = [
		{
			clientId: "root",
			fatherClientId: null,
			type: COMPONENT_TYPE.CONTROLLER as HierarchyComponent["type"]
		},
		{
			clientId: "child",
			fatherClientId: "root",
			type: COMPONENT_TYPE.ENVIRONMENT as HierarchyComponent["type"]
		},
		{
			clientId: "other",
			fatherClientId: null,
			type: COMPONENT_TYPE.SENSOR as HierarchyComponent["type"]
		}
	];
	const connections = [
		{ clientId: "from-root", sourceClientId: "root", targetClientId: "other" },
		{ clientId: "to-child", sourceClientId: "other", targetClientId: "child" },
		{ clientId: "unrelated", sourceClientId: "other", targetClientId: "other" },
		{ clientId: "already-orphaned", sourceClientId: null, targetClientId: "other" }
	];

	assert.deepEqual(
		getCascadeDeletionPlan(components, connections, "root"),
		{
			componentIds: new Set(["root", "child"]),
			connectionIds: new Set(["from-root", "to-child"]),
			environmentIncluded: true
		}
	);
});

test("code generation uses the largest existing numeric suffix", () => {
	assert.equal(getNextCode(["C.01", "C.04", "other"], "C"), "C.05");
	assert.equal(getNextCode(["Cn.02", "Cn.09"], "Cn"), "Cn.10");
	assert.equal(getNextInteractionCode([{ code: "In.01" }, { code: "In.03" }]), "In.04");
});
