import type { IComponentType } from "@interfaces/IStep2/IComponent";
import CanvasToolbar from "./components/CanvasToolbar";
import ComponentPalette from "./components/ComponentPalette";
import PropertiesPanel from "./components/PropertiesPanel";
import { useVisualControlStructure } from "./hooks/useVisualControlStructure";
import styles from "./VisualControlStructure.module.css";
import "jointjs/dist/joint.min.css";

interface VisualControlStructureProps {
	environmentIncluded: boolean;
	onEnvironmentIncludedChange: (included: boolean) => void;
}

function VisualControlStructure({
	environmentIncluded,
	onEnvironmentIncludedChange
}: VisualControlStructureProps) {
	const editor = useVisualControlStructure({
		environmentIncluded,
		onEnvironmentIncludedChange,
		paperHostClassName: styles.paper_host
	});

	return (
		<div className={styles.editor}>
			<ComponentPalette
				environmentIncluded={editor.environmentIncluded}
				onAddComponent={(type: IComponentType) => editor.onAddComponent(type)}
			/>

			<section className={styles.canvas_section} aria-label="Control structure diagram editor">
				<CanvasToolbar
					zoom={editor.zoom}
					hasSelection={editor.hasSelection}
					onReset={editor.resetView}
					onZoomOut={editor.zoomOut}
					onZoomIn={editor.zoomIn}
					onDelete={editor.deleteSelected}
					onClear={editor.clearDiagram}
				/>
				<div
					ref={editor.canvasContainerRef}
					className={styles.canvas}
					role="application"
					aria-label="Control structure canvas. Use the component palette to add nodes."
					tabIndex={0}
				/>
				<p className={styles.canvas_hint}>
					Select a component or connection to edit its properties. Drag the background to pan;
					use the wheel to zoom.
				</p>
			</section>

			<PropertiesPanel
				draft={editor.draft}
				fatherOptions={editor.fatherOptions}
				allowedInteractionTypes={editor.allowedInteractionTypes}
				onComponentChange={editor.onComponentChange}
				onConnectionChange={editor.onConnectionChange}
				onInteractionNameChange={editor.onInteractionNameChange}
				onInteractionTypeChange={editor.onInteractionTypeChange}
				onInteractionRemove={editor.onInteractionRemove}
				onInteractionAdd={editor.onInteractionAdd}
				onApply={editor.applyDraft}
			/>
		</div>
	);
}

export default VisualControlStructure;
