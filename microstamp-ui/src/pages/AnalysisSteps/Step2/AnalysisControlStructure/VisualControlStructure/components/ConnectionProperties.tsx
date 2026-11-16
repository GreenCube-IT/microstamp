import { IConnectionStyle } from "@interfaces/IStep2/IConnection";
import { IInteractionType } from "@interfaces/IStep2/IInteraction/Enums";
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
			<label>
				Connection code
				<input value={draft.code} onChange={event => onChange({ code: event.target.value })} />
			</label>
			<label>
				Style
				<select
					value={draft.style}
					onChange={event => onChange({ style: event.target.value as IConnectionStyle })}
				>
					<option value={IConnectionStyle.SOLID}>Solid</option>
					<option value={IConnectionStyle.DASHED}>Dashed</option>
					<option value={IConnectionStyle.ETCHED}>Etched</option>
				</select>
			</label>
			<InteractionEditor
				interactions={draft.interactions}
				allowedTypes={allowedInteractionTypes}
				onNameChange={onInteractionNameChange}
				onTypeChange={onInteractionTypeChange}
				onRemove={onInteractionRemove}
				onAdd={onInteractionAdd}
			/>
			<button type="button" className={styles.apply_button} onClick={onApply}>
				Apply
			</button>
		</div>
	);
}

export default ConnectionProperties;
