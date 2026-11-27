import {
	borderSelectOptions,
	componentTypeSelectOptions,
	IComponentType
} from "@interfaces/IStep2/IComponent/Enums";
import { ComponentBorderSelect, ComponentTypeSelect, Input, Select } from "@components/FormField";
import Button from "@components/Button";
import type { ComponentData, ComponentDraft } from "../../domain/types";
import styles from "./ComponentProperties.module.css";

interface ComponentPropertiesProps {
	draft: ComponentDraft;
	fatherOptions: ComponentData["component"][];
	validationMessage: string | null;
	onChange: (changes: Partial<ComponentDraft>) => void;
	onApply: () => void;
}

function ComponentProperties({
	draft,
	fatherOptions,
	validationMessage,
	onChange,
	onApply
}: ComponentPropertiesProps) {
	const isEnvironment = draft.type === IComponentType.ENVIRONMENT;
	const fatherSelectOptions = fatherOptions.map(component => ({
		label: `${component.name} (${component.code})`,
		value: component.clientId
	}));
	const selectedFather =
		fatherSelectOptions.find(father => father.value === draft.fatherClientId) ?? null;

	return (
		<div className={styles.property_form}>
			{!isEnvironment && (
				<Input label="Name" value={draft.name} onChange={name => onChange({ name })} />
			)}
			{!isEnvironment && (
				<Input label="Code" value={draft.code} onChange={code => onChange({ code })} />
			)}
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
			{validationMessage && (
				<p className={styles.properties_hint}>
					{validationMessage}
				</p>
			)}
			{!isEnvironment && (
				<ComponentTypeSelect
					value={componentTypeSelectOptions.find(type => type.value === draft.type) ?? null}
					onChange={type => type && onChange({ type: type.value })}
				/>
			)}
			{!isEnvironment && (
				<Select
					label="Father (optional)"
					options={fatherSelectOptions}
					value={selectedFather}
					onChange={father => onChange({ fatherClientId: father?.value ?? null })}
					optionsPosition="top"
				/>
			)}
			{!isEnvironment && (
				<ComponentBorderSelect
					value={borderSelectOptions.find(border => border.value === draft.border) ?? null}
					onChange={border => border && onChange({ border: border.value })}
				/>
			)}
			<Button onClick={onApply} disabled={validationMessage !== null}>
				Apply
			</Button>
		</div>
	);
}

export default ComponentProperties;
