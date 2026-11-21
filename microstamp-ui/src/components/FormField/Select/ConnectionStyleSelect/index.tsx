import Select from "..";
import type { SelectOption } from "@components/FormField/Templates";
import {
	connectionStyleSelectOptions,
	IConnectionStyle
} from "@interfaces/IStep2/IConnection/Enums";

interface ConnectionStyleSelectProps {
	value: SelectOption<IConnectionStyle> | null;
	onChange: (value: SelectOption<IConnectionStyle> | null) => void;
	disabled?: boolean;
	optionsPosition?: "top" | "bottom";
}

function ConnectionStyleSelect({
	value,
	onChange,
	disabled,
	optionsPosition = "bottom"
}: ConnectionStyleSelectProps) {
	return (
		<Select
			label="Style"
			value={value}
			onChange={onChange}
			options={connectionStyleSelectOptions}
			disabled={disabled}
			required
			optionsPosition={optionsPosition}
		/>
	);
}

export default ConnectionStyleSelect;
