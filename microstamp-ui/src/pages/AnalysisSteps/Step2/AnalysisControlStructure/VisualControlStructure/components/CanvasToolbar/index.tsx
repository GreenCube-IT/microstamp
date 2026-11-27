import Button from "@components/Button";
import IconButton from "@components/Button/IconButton";
import {
	BiReset as ResetIcon,
	BiTrash as DeleteIcon,
	BiZoomIn as ZoomInIcon,
	BiZoomOut as ZoomOutIcon
} from "react-icons/bi";
import styles from "./CanvasToolbar.module.css";

interface CanvasToolbarProps {
	zoom: number;
	hasSelection: boolean;
	onReset: () => void;
	onZoomOut: () => void;
	onZoomIn: () => void;
	onDelete: () => void;
	onClear: () => void;
}

function CanvasToolbar({
	zoom,
	hasSelection,
	onReset,
	onZoomOut,
	onZoomIn,
	onDelete,
	onClear
}: CanvasToolbarProps) {
	return (
		<div className={styles.toolbar} aria-label="Canvas controls">
			<IconButton
				onClick={onReset}
				icon={ResetIcon}
				title="Reset view"
				aria-label="Reset view"
			/>
			<span className={styles.separator} />
			<IconButton
				onClick={onZoomOut}
				icon={ZoomOutIcon}
				title="Zoom out"
				aria-label="Zoom out"
			/>
			<span className={styles.zoom_value}>{zoom}%</span>
			<IconButton
				onClick={onZoomIn}
				icon={ZoomInIcon}
				title="Zoom in"
				aria-label="Zoom in"
			/>
			<span className={styles.separator} />
			<IconButton
				onClick={onDelete}
				disabled={!hasSelection}
				icon={DeleteIcon}
				title="Delete selected element"
				aria-label="Delete selected element"
			/>
			<Button size="small" variant="dark" onClick={onClear}>
				Clear
			</Button>
		</div>
	);
}

export default CanvasToolbar;
