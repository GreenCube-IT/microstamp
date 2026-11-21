import { interactionTypesSelectOptions } from "@interfaces/IStep2/IInteraction/Enums";
import type { IInteractionType } from "@interfaces/IStep2/IInteraction/Enums";
import { Input, InteractionTypeSelect } from "@components/FormField";
import Button from "@components/Button";
import IconButton from "@components/Button/IconButton";
import { BiPlus as AddIcon, BiTrash as DeleteIcon } from "react-icons/bi";
import type { InteractionData } from "../../domain/types";
import styles from "./InteractionEditor.module.css";

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
						<IconButton
							onClick={() => onRemove(index)}
							aria-label={`Remove interaction ${interaction.code}`}
							icon={DeleteIcon}
						/>
					</div>
					<Input
						label="Name"
						value={interaction.name}
						onChange={name => onNameChange(index, name)}
					/>
					<InteractionTypeSelect
						value={
							interactionTypesSelectOptions.find(
								type => type.value === interaction.interactionType
							) ?? null
						}
						allowedTypes={allowedTypes}
						onChange={type => type && onTypeChange(index, type.value)}
					/>
				</div>
			))}
			<Button icon={AddIcon} size="small" variant="dark" onClick={onAdd}>
				Add interaction
			</Button>
		</>
	);
}

export default InteractionEditor;
