import { IComponentBorder } from "@interfaces/IStep2/IComponent";
import { COMPONENT_TYPE_OPTIONS } from "../domain/constants";
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

	return (
		<div className={styles.property_form}>
			<label>
				Name
				<input value={draft.name} onChange={event => onChange({ name: event.target.value })} />
			</label>
			<label>
				Code
				<input value={draft.code} onChange={event => onChange({ code: event.target.value })} />
			</label>
			<div className={styles.dimensions_fields}>
				<label>
					Width (px)
					<input
						type="number"
						min={20}
						step={1}
						value={draft.width}
						onChange={event => onChange({ width: Number(event.target.value) })}
					/>
				</label>
				<label>
					Height (px)
					<input
						type="number"
						min={20}
						step={1}
						value={draft.height}
						onChange={event => onChange({ height: Number(event.target.value) })}
					/>
				</label>
			</div>
			{!validSize && (
				<p className={styles.properties_hint}>
					Width and height must be whole numbers of at least 20 px.
				</p>
			)}
			<label>
				Type
				<select
					value={draft.type}
					onChange={event => onChange({ type: event.target.value as ComponentDraft["type"] })}
				>
					{COMPONENT_TYPE_OPTIONS.map(type => (
						<option key={type.value} value={type.value}>
							{type.label}
						</option>
					))}
				</select>
			</label>
			<label>
				Father (optional)
				<select
					value={draft.fatherClientId ?? ""}
					onChange={event => onChange({ fatherClientId: event.target.value || null })}
				>
					<option value="">None</option>
					{fatherOptions.map(component => (
						<option key={component.clientId} value={component.clientId}>
							{component.name} ({component.code})
						</option>
					))}
				</select>
			</label>
			<label>
				Border
				<select
					value={draft.border}
					onChange={event => onChange({ border: event.target.value as IComponentBorder })}
				>
					<option value={IComponentBorder.SOLID}>Solid</option>
					<option value={IComponentBorder.DASHED}>Dashed</option>
					<option value={IComponentBorder.ETCHED}>Etched</option>
				</select>
			</label>
			<button
				type="button"
				className={styles.apply_button}
				onClick={onApply}
				disabled={!validSize}
			>
				Apply
			</button>
		</div>
	);
}

export default ComponentProperties;
