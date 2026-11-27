import Select from "..";
import type { SelectOption } from "@components/FormField/Templates";
import {
	borderSelectOptions,
	IComponentBorder
} from "@interfaces/IStep2/IComponent/Enums";

interface ComponentBorderSelectProps {
	value: SelectOption<IComponentBorder> | null;
	onChange: (value: SelectOption<IComponentBorder> | null) => void;
	disabled?: boolean;
	optionsPosition?: "top" | "bottom";
}

function ComponentBorderSelect({
	value,
	onChange,
	disabled,
	optionsPosition = "bottom"
}: ComponentBorderSelectProps) {
	return (
		<Select
			label="Border"
			value={value}
			onChange={onChange}
			options={borderSelectOptions}
			disabled={disabled}
			required
			optionsPosition={optionsPosition}
		/>
	);
}

export default ComponentBorderSelect;
