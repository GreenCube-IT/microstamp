import Select from "..";
import type { SelectOption } from "@components/FormField/Templates";
import {
	componentTypeSelectOptions,
	IComponentType
} from "@interfaces/IStep2/IComponent/Enums";

interface ComponentTypeSelectProps {
	value: SelectOption<IComponentType> | null;
	onChange: (value: SelectOption<IComponentType> | null) => void;
	disabled?: boolean;
	optionsPosition?: "top" | "bottom";
}

function ComponentTypeSelect({
	value,
	onChange,
	disabled,
	optionsPosition = "bottom"
}: ComponentTypeSelectProps) {
	return (
		<Select
			label="Type"
			value={value}
			onChange={onChange}
			options={componentTypeSelectOptions}
			disabled={disabled}
			required
			optionsPosition={optionsPosition}
		/>
	);
}

export default ComponentTypeSelect;
