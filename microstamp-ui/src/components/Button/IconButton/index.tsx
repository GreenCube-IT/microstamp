import { IconType } from "react-icons";
import { Link } from "react-router-dom";
import styles from "./IconButton.module.css";

interface IconButtonProps {
	onClick?: () => void;
	to?: string;
	icon: IconType;
	"aria-label"?: string;
	title?: string;
}
function IconButton({ onClick, to, icon: Icon, "aria-label": ariaLabel, title }: IconButtonProps) {
	if (to) {
		<Link to={to}>
			<button
				type="button"
				onClick={onClick}
				className={styles.icon_button}
				aria-label={ariaLabel}
				title={title}
			>
				<Icon />
			</button>
		</Link>;
	}
	return (
		<button
			type="button"
			onClick={onClick}
			className={styles.icon_button}
			aria-label={ariaLabel}
			title={title}
		>
			<Icon />
		</button>
	);
}

export default IconButton;
