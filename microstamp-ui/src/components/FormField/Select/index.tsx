import { SelectOption } from "@components/FormField/Templates";
import { useEffect, useState } from "react";
import { BiChevronDown as ArrowDown, BiChevronUp as ArrowUp } from "react-icons/bi";
import styles from "./Select.module.css";

interface SelectProps<TValue extends string = string> {
	label: string;
	options: SelectOption<TValue>[];
	value: SelectOption<TValue> | null;
	onChange: (value: SelectOption<TValue> | null) => void;
	optionsPosition?: "top" | "bottom";
	disabled?: boolean;
	required?: boolean;
}
function Select<TValue extends string>({
	label,
	options,
	value,
	onChange,
	optionsPosition = "bottom",
	disabled = false,
	required = false
}: SelectProps<TValue>) {
	const [isOpen, setIsOpen] = useState(false);

	useEffect(() => {
		if (required && !value) {
			onChange(options[0]);
			value = options[0];
		}
	}, [required, value, options]);

	const options_class = `${styles.options} ${
		optionsPosition === "top" ? styles.options_top : ""
	}`;
	const select_class = `${styles.select} ${
		isOpen ? (optionsPosition === "top" ? styles.open_top : styles.open_bottom) : ""
	}`;
	return (
		<label className={styles.select_label}>
			<span className={styles.name}>{label}:</span>
			<div className={styles.select_container}>
				<button
					type="button"
					onClick={() => setIsOpen(!isOpen)}
					className={select_class}
					disabled={disabled}
				>
					{value ? (
						<span>{value.label}</span>
					) : (
						<span style={{ color: "var(--color-dark)" }}>None</span>
					)}
					{isOpen ? (
						<ArrowUp className={styles.icon} />
					) : (
						<ArrowDown className={styles.icon} />
					)}
				</button>
				{isOpen && !disabled && (
					<ul className={options_class}>
						{!required && (
							<li
								style={{ color: "var(--color-dark-gray)" }}
								className={styles.option}
								onClick={() => onChange(null)}
							>
								None
							</li>
						)}
						{options.map(op => (
							<li
								className={styles.option}
								key={op.value}
								onClick={() => onChange(op)}
							>
								{op.label}
							</li>
						))}
					</ul>
				)}
			</div>
		</label>
	);
}

export default Select;
