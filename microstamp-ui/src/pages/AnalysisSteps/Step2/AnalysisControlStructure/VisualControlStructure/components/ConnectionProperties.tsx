import { connectionStyleSelectOptions } from "@interfaces/IStep2/IConnection/Enums";
import type { IInteractionType } from "@interfaces/IStep2/IInteraction/Enums";
import { Input, ConnectionStyleSelect } from "@components/FormField";
import Button from "@components/Button";
import type { ConnectionDraft } from "../domain/types";
import InteractionEditor from "./InteractionEditor";
import styles from "../VisualControlStructure.module.css";

interface ConnectionPropertiesProps {
	draft: ConnectionDraft;
	allowedInteractionTypes: IInteractionType[];
	onChange: (changes: Partial<Pick<ConnectionDraft, "code" | "style">>) => void;
	onInteractionNameChange: (index: number, name: string) => void;
	onInteractionTypeChange: (index: number, type: IInteractionType) => void;
	onInteractionRemove: (index: number) => void;
	onInteractionAdd: () => void;
	onApply: () => void;
}

function ConnectionProperties({
	draft,
	allowedInteractionTypes,
	onChange,
	onInteractionNameChange,
	onInteractionTypeChange,
	onInteractionRemove,
	onInteractionAdd,
	onApply
}: ConnectionPropertiesProps) {
	return (
		<div className={styles.property_form}>
			<Input
				label="Connection code"
				value={draft.code}
				onChange={code => onChange({ code })}
			/>
			<ConnectionStyleSelect
				value={
					connectionStyleSelectOptions.find(style => style.value === draft.style) ?? null
				}
				onChange={style => style && onChange({ style: style.value })}
			/>
			<InteractionEditor
				interactions={draft.interactions}
				allowedTypes={allowedInteractionTypes}
				onNameChange={onInteractionNameChange}
				onTypeChange={onInteractionTypeChange}
				onRemove={onInteractionRemove}
				onAdd={onInteractionAdd}
			/>
			<Button onClick={onApply}>
				Apply
			</Button>
		</div>
	);
}

export default ConnectionProperties;
