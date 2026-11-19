import {
	interactionTypesSelectOptions,
	IInteractionType
} from "@interfaces/IStep2/IInteraction/Enums";
import { BiPlus as AddIcon, BiTrash as DeleteIcon } from "react-icons/bi";
import type { InteractionData } from "../domain/types";
import styles from "../VisualControlStructure.module.css";

interface InteractionEditorProps {
	interactions: InteractionData[];
	allowedTypes: IInteractionType[];
	onNameChange: (index: number, name: string) => void;
	onTypeChange: (index: number, type: IInteractionType) => void;
	onRemove: (index: number) => void;
	onAdd: () => void;
}

function InteractionEditor({
	interactions,
	allowedTypes,
	onNameChange,
	onTypeChange,
	onRemove,
	onAdd
}: InteractionEditorProps) {
	return (
		<>
			<div className={styles.section_label}>Interactions</div>
			{interactions.map((interaction, index) => (
				<div key={interaction.clientId} className={styles.interaction}>
					<div className={styles.interaction_header}>
						<strong>{interaction.code}</strong>
						<button
							type="button"
							className={styles.remove_interaction}
							onClick={() => onRemove(index)}
							aria-label={`Remove interaction ${interaction.code}`}
						>
							<DeleteIcon />
						</button>
					</div>
					<label>
						Name
						<input
							value={interaction.name}
							onChange={event => onNameChange(index, event.target.value)}
						/>
					</label>
					<label>
						Type
						<select
							value={interaction.interactionType}
							onChange={event => onTypeChange(index, event.target.value as IInteractionType)}
						>
							{interactionTypesSelectOptions.filter(type =>
								allowedTypes.includes(type.value)
							).map(type => (
								<option key={type.value} value={type.value}>
									{type.label}
								</option>
							))}
						</select>
					</label>
				</div>
			))}
			<button type="button" className={styles.add_interaction} onClick={onAdd}>
				<AddIcon />
				Add interaction
			</button>
		</>
	);
}

export default InteractionEditor;
