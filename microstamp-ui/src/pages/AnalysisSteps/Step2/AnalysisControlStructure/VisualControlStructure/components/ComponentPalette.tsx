import { IComponentType } from "@interfaces/IStep2/IComponent";
import { BiPlus as AddIcon } from "react-icons/bi";
import { COMPONENT_TYPE_OPTIONS } from "../domain/constants";
import type { IComponentType as ComponentType } from "@interfaces/IStep2/IComponent";
import styles from "../VisualControlStructure.module.css";

interface ComponentPaletteProps {
	environmentIncluded: boolean;
	onAddComponent: (type: ComponentType) => void;
}

function ComponentPalette({ environmentIncluded, onAddComponent }: ComponentPaletteProps) {
	return (
		<aside className={styles.palette} aria-label="Add a component">
			<h2>Components</h2>
			{COMPONENT_TYPE_OPTIONS.map(componentType => (
				<button
					key={componentType.value}
					type="button"
					className={styles.palette_item}
					onClick={() => onAddComponent(componentType.value)}
					title={`Add ${componentType.label}`}
				>
					<span
						className={styles.palette_swatch}
						data-component-type={componentType.value}
						aria-hidden="true"
					/>
					<span>{componentType.label}</span>
					<AddIcon aria-hidden="true" />
				</button>
			))}
			<button
				type="button"
				className={styles.palette_item}
				onClick={() => onAddComponent(IComponentType.ENVIRONMENT)}
				disabled={environmentIncluded}
				title={environmentIncluded ? "Environment already included" : "Add Environment"}
			>
				<span
					className={styles.palette_swatch}
					data-component-type={IComponentType.ENVIRONMENT}
					aria-hidden="true"
				/>
				<span>Environment</span>
				<AddIcon aria-hidden="true" />
			</button>
			<p className={styles.palette_hint}>Drag from a component edge to create a connection.</p>
		</aside>
	);
}

export default ComponentPalette;
