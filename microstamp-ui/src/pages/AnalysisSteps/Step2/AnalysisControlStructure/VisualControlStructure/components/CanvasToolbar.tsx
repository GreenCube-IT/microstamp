import {
	BiReset as ResetIcon,
	BiTrash as DeleteIcon,
	BiZoomIn as ZoomInIcon,
	BiZoomOut as ZoomOutIcon
} from "react-icons/bi";
import styles from "../VisualControlStructure.module.css";

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
			<button type="button" onClick={onReset} title="Reset view" aria-label="Reset view">
				<ResetIcon />
			</button>
			<span className={styles.separator} />
			<button type="button" onClick={onZoomOut} title="Zoom out" aria-label="Zoom out">
				<ZoomOutIcon />
			</button>
			<span className={styles.zoom_value}>{zoom}%</span>
			<button type="button" onClick={onZoomIn} title="Zoom in" aria-label="Zoom in">
				<ZoomInIcon />
			</button>
			<span className={styles.separator} />
			<button
				type="button"
				onClick={onDelete}
				disabled={!hasSelection}
				title="Delete selected element"
				aria-label="Delete selected element"
			>
				<DeleteIcon />
			</button>
			<button type="button" onClick={onClear} title="Clear diagram">
				Clear
			</button>
		</div>
	);
}

export default CanvasToolbar;
