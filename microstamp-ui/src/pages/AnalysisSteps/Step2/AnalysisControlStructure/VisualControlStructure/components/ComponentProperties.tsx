import {
	borderSelectOptions,
	componentTypeSelectOptions
} from "@interfaces/IStep2/IComponent/Enums";
import { ComponentBorderSelect, ComponentTypeSelect, Input, Select } from "@components/FormField";
import Button from "@components/Button";
import type { ComponentData, ComponentDraft } from "../domain/types";
import { isValidComponentSize } from "../domain/rules";
import styles from "../VisualControlStructure.module.css";

interface ComponentPropertiesProps {
	draft: ComponentDraft;
	fatherOptions: ComponentData["component"][];
	onChange: (changes: Partial<ComponentDraft>) => void;
	onApply: () => void;
}

function ComponentProperties({
	draft,
	fatherOptions,
	onChange,
	onApply
}: ComponentPropertiesProps) {
	const validSize = isValidComponentSize(draft.width, draft.height);
	const fatherSelectOptions = fatherOptions.map(component => ({
		label: `${component.name} (${component.code})`,
		value: component.clientId
	}));
	const selectedFather =
		fatherSelectOptions.find(father => father.value === draft.fatherClientId) ?? null;

	return (
		<div className={styles.property_form}>
			<Input label="Name" value={draft.name} onChange={name => onChange({ name })} />
			<Input label="Code" value={draft.code} onChange={code => onChange({ code })} />
			<div className={styles.dimensions_fields}>
				<Input
					label="Width (px)"
					type="number"
					min={20}
					step={1}
					value={String(draft.width)}
					onChange={width => onChange({ width: Number(width) })}
				/>
				<Input
					label="Height (px)"
					type="number"
					min={20}
					step={1}
					value={String(draft.height)}
					onChange={height => onChange({ height: Number(height) })}
				/>
			</div>
			{!validSize && (
				<p className={styles.properties_hint}>
					Width and height must be whole numbers of at least 20 px.
				</p>
			)}
			<ComponentTypeSelect
				value={componentTypeSelectOptions.find(type => type.value === draft.type) ?? null}
				onChange={type => type && onChange({ type: type.value })}
			/>
			<Select
				label="Father (optional)"
				options={fatherSelectOptions}
				value={selectedFather}
				onChange={father => onChange({ fatherClientId: father?.value ?? null })}
				optionsPosition="top"
			/>
			<ComponentBorderSelect
				value={borderSelectOptions.find(border => border.value === draft.border) ?? null}
				onChange={border => border && onChange({ border: border.value })}
			/>
			<Button onClick={onApply} disabled={!validSize}>
				Apply
			</Button>
		</div>
	);
}

export default ComponentProperties;
