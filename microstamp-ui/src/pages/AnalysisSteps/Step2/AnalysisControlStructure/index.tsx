import AnalysisHeader from "@components/AnalysisHeader";
import Button from "@components/Button";
import { ModalPDFPreview } from "@components/Modal";
import PageActions from "@components/PageActions";
import { getStep2PDF } from "@http/Export";
import { IAnalysisReadDto } from "@interfaces/IAnalysis";
import { ISteps } from "@interfaces/ISteps";
import { lazy, Suspense, useState } from "react";
import { BiExport as PdfIcon } from "react-icons/bi";
import { useOutletContext } from "react-router-dom";
import ControlStructureModeSwitch from "../ControlStructureModeSwitch";
import canvasStyles from "./ControlStructureCanvas.module.css";
import ComponentsContainer from "./ComponentsContainer";
import ConnectionsContainer from "./ConnectionsContainer";
import ControlStructureImage from "./ControlStructureImage";

const VisualControlStructure = lazy(() => import("./VisualControlStructure"));

function AnalysisControlStructure() {
	/* - - - - - - - - - - - - - - - - - - - - - - */
	// * Handle Get Analysis

	const analysis: IAnalysisReadDto = useOutletContext();
	const [mode, setMode] = useState<"forms" | "visual">("forms");
	const [visualEditorStarted, setVisualEditorStarted] = useState(false);
	const handleModeChange = (nextMode: "forms" | "visual") => {
		setMode(nextMode);
		if (nextMode === "visual") setVisualEditorStarted(true);
	};

	/* - - - - - - - - - - - - - - - - - - - - - - */
	// * Handle Get Step 2 PDF

	const [modalStep2PdfOpen, setModalStep2PdfOpen] = useState(false);
	const toggleModalStep2Pdf = () => setModalStep2PdfOpen(!modalStep2PdfOpen);

	/* - - - - - - - - - - - - - - - - - - - - - - */

	return (
		<>
			<AnalysisHeader analysis={analysis} step={ISteps.STEP_2} />
			<ControlStructureModeSwitch mode={mode} onModeChange={handleModeChange} />

			{mode === "forms" && (
				<>
					<ComponentsContainer analysisId={analysis.id} />
					<ConnectionsContainer analysisId={analysis.id} />
					<ControlStructureImage analysisId={analysis.id} />

					<PageActions>
						<Button variant="dark" icon={PdfIcon} onClick={toggleModalStep2Pdf}>
							Export Step 2
						</Button>
						<ModalPDFPreview
							open={modalStep2PdfOpen}
							onClose={toggleModalStep2Pdf}
							fetchPDF={getStep2PDF}
							analysisId={analysis.id}
							title={"Export Step 2"}
						/>
					</PageActions>
				</>
			)}
			<main
				className={`${canvasStyles.workspace} ${
					mode === "visual" ? "" : canvasStyles.workspace_hidden
				}`}
				aria-labelledby="visual-workspace-title"
				aria-hidden={mode !== "visual"}
			>
				<div className={canvasStyles.workspace_header}>
					<h1 id="visual-workspace-title">Visual control structure</h1>
					<p>Model components and their control or feedback interactions.</p>
				</div>
				{visualEditorStarted && (
					<Suspense fallback={<p className={canvasStyles.editor_loading}>Loading visual editor…</p>}>
						<VisualControlStructure />
					</Suspense>
				)}
			</main>
		</>
	);
}

export default AnalysisControlStructure;
