import Select from "..";
import type { SelectOption } from "@components/FormField/Templates";
import {
	interactionTypesSelectOptions,
	IInteractionType
} from "@interfaces/IStep2/IInteraction/Enums";

interface InteractionTypeSelectProps {
	value: SelectOption<IInteractionType> | null;
	onChange: (value: SelectOption<IInteractionType> | null) => void;
	allowedTypes: IInteractionType[];
	disabled?: boolean;
	optionsPosition?: "top" | "bottom";
}

function InteractionTypeSelect({
	value,
	onChange,
	allowedTypes,
	disabled,
	optionsPosition = "bottom"
}: InteractionTypeSelectProps) {
	const options = interactionTypesSelectOptions.filter(option =>
		allowedTypes.includes(option.value)
	);

	return (
		<Select
			label="Type"
			value={value}
			onChange={onChange}
			options={options}
			disabled={disabled}
			required
			optionsPosition={optionsPosition}
		/>
	);
}

export default InteractionTypeSelect;
