import styles from "./ControlStructureModeSwitch.module.css";

interface ControlStructureModeSwitchProps {
	mode: "forms" | "visual";
	onModeChange: (mode: "forms" | "visual") => void;
}

function ControlStructureModeSwitch({ mode, onModeChange }: ControlStructureModeSwitchProps) {
	return (
		<nav className={styles.mode_switch} aria-label="Control structure modeling method">
			<span className={styles.label}>Modeling method</span>
			<button
				type="button"
				onClick={() => onModeChange("forms")}
				className={`${styles.option} ${mode === "forms" ? styles.active : ""}`}
				aria-pressed={mode === "forms"}
			>
				Forms
			</button>
			<button
				type="button"
				onClick={() => onModeChange("visual")}
				className={`${styles.option} ${mode === "visual" ? styles.active : ""}`}
				aria-pressed={mode === "visual"}
			>
				Visual canvas
			</button>
		</nav>
	);
}

export default ControlStructureModeSwitch;
