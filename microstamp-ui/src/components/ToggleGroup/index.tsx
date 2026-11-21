import styles from "./ToggleGroup.module.css";

interface ToggleOption<T extends string> {
	value: T;
	label: string;
}

interface ToggleGroupProps<T extends string> {
	options: ToggleOption<T>[];
	value: T;
	onChange: (value: T) => void;
	ariaLabel: string;
}

function ToggleGroup<T extends string>({
	options,
	value,
	onChange,
	ariaLabel
}: ToggleGroupProps<T>) {
	return (
		<div className={styles.toggle_group} role="group" aria-label={ariaLabel}>
			{options.map(option => (
				<button
					key={option.value}
					type="button"
					className={`${styles.toggle_button} ${value === option.value ? styles.active : ""}`}
					onClick={() => onChange(option.value)}
					aria-pressed={value === option.value}
				>
					{option.label}
				</button>
			))}
		</div>
	);
}

export default ToggleGroup;
