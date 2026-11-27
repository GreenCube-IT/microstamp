import { ModalConfirm } from "@components/Modal";
import { getControlStructure, controlStructureQueryKey } from "@http/Step2/ControlStructures";
import type { IComponentType } from "@interfaces/IStep2/IComponent";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import CanvasToolbar from "./components/CanvasToolbar";
import ComponentPalette from "./components/ComponentPalette";
import PropertiesPanel from "./components/PropertiesPanel";
import { mapControlStructureToCanvasData } from "./adapters/controlStructureAdapter";
import useVisualControlStructure from "./hooks/useVisualControlStructure";
import styles from "./VisualControlStructure.module.css";
import "jointjs/dist/joint.min.css";

interface VisualControlStructureProps {
	analysisId: string;
	environmentIncluded: boolean;
	onEnvironmentIncludedChange: (included: boolean) => void;
}

function VisualControlStructure({
	analysisId,
	environmentIncluded,
	onEnvironmentIncludedChange
}: VisualControlStructureProps) {
	const structureQuery = useQuery({
		queryKey: controlStructureQueryKey(analysisId),
		queryFn: async () =>
			mapControlStructureToCanvasData(await getControlStructure(analysisId)),
		refetchOnWindowFocus: false
	});

	if (structureQuery.isPending || structureQuery.isFetching) {
		return <p role="status">Loading control structure...</p>;
	}

	if (structureQuery.isError) {
		const message = structureQuery.error instanceof Error
			? structureQuery.error.message
			: "Unknown error";
		return <p role="alert">Could not load control structure: {message}</p>;
	}

	return (
		<LoadedVisualControlStructure
			initialData={structureQuery.data}
			environmentIncluded={environmentIncluded}
			onEnvironmentIncludedChange={onEnvironmentIncludedChange}
		/>
	);
}

interface LoadedVisualControlStructureProps extends Pick<
	VisualControlStructureProps,
	"environmentIncluded" | "onEnvironmentIncludedChange"
> {
	initialData: ReturnType<typeof mapControlStructureToCanvasData>;
}

function LoadedVisualControlStructure({
	initialData,
	environmentIncluded,
	onEnvironmentIncludedChange
}: LoadedVisualControlStructureProps) {
	const [clearConfirmationOpen, setClearConfirmationOpen] = useState(false);
	const editor = useVisualControlStructure({
		environmentIncluded,
		onEnvironmentIncludedChange,
		paperHostClassName: styles.paper_host,
		initialData
	});
	const clearDiagram = () => {
		editor.clearDiagram();
		setClearConfirmationOpen(false);
	};

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
					onClear={() => setClearConfirmationOpen(true)}
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
				validationMessage={editor.validationMessage}
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
			<ModalConfirm
				open={clearConfirmationOpen}
				onClose={() => setClearConfirmationOpen(false)}
				onConfirm={clearDiagram}
				message="Do you want to clear all components and connections?"
				title="Clear Diagram"
				btnText="Clear"
			/>
		</div>
	);
}

export default VisualControlStructure;
