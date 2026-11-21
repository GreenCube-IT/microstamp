import { IComponentType } from "@interfaces/IStep2/IComponent";
import type { IInteractionType } from "@interfaces/IStep2/IInteraction/Enums";
import type {
	ComponentData,
	ComponentDraft,
	ConnectionDraft,
	PropertiesDraft
} from "../../domain/types";
import ComponentProperties from "../ComponentProperties";
import ConnectionProperties from "../ConnectionProperties";
import styles from "./PropertiesPanel.module.css";

interface PropertiesPanelProps {
	draft: PropertiesDraft | null;
	fatherOptions: ComponentData["component"][];
	allowedInteractionTypes: IInteractionType[];
	onComponentChange: (changes: Partial<ComponentDraft>) => void;
	onConnectionChange: (changes: Partial<Pick<ConnectionDraft, "code" | "style">>) => void;
	onInteractionNameChange: (index: number, name: string) => void;
	onInteractionTypeChange: (index: number, type: IInteractionType) => void;
	onInteractionRemove: (index: number) => void;
	onInteractionAdd: () => void;
	onApply: () => void;
}

function PropertiesPanel({
	draft,
	fatherOptions,
	allowedInteractionTypes,
	onComponentChange,
	onConnectionChange,
	onInteractionNameChange,
	onInteractionTypeChange,
	onInteractionRemove,
	onInteractionAdd,
	onApply
}: PropertiesPanelProps) {
	return (
		<aside className={styles.properties} aria-label="Selected element properties">
			<h2>Properties</h2>
			{draft?.kind === "component" && draft.type === IComponentType.ENVIRONMENT ? (
				<p className={styles.properties_hint}>
					The Environment has a fixed identity and cannot be edited.
				</p>
			) : draft?.kind === "component" ? (
				<ComponentProperties
					draft={draft}
					fatherOptions={fatherOptions}
					onChange={onComponentChange}
					onApply={onApply}
				/>
			) : draft?.kind === "connection" ? (
				<ConnectionProperties
					draft={draft}
					allowedInteractionTypes={allowedInteractionTypes}
					onChange={onConnectionChange}
					onInteractionNameChange={onInteractionNameChange}
					onInteractionTypeChange={onInteractionTypeChange}
					onInteractionRemove={onInteractionRemove}
					onInteractionAdd={onInteractionAdd}
					onApply={onApply}
				/>
			) : (
				<p className={styles.properties_hint}>Select a component or connection to edit it.</p>
			)}
		</aside>
	);
}

export default PropertiesPanel;
