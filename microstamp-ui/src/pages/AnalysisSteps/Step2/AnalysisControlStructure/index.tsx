import AnalysisHeader from "@components/AnalysisHeader";
import Button from "@components/Button";
import { ModalPDFPreview } from "@components/Modal";
import PageActions from "@components/PageActions";
import { getStep2PDF } from "@http/Export";
import { IAnalysisReadDto } from "@interfaces/IAnalysis";
import { ISteps } from "@interfaces/ISteps";
import { useState } from "react";
import { BiExport as PdfIcon } from "react-icons/bi";
import { useOutletContext } from "react-router-dom";
import ControlStructureModeSwitch from "../ControlStructureModeSwitch";
import canvasStyles from "./ControlStructureCanvas.module.css";
import ComponentsContainer from "./ComponentsContainer";
import ConnectionsContainer from "./ConnectionsContainer";
import ControlStructureImage from "./ControlStructureImage";

function AnalysisControlStructure() {
	/* - - - - - - - - - - - - - - - - - - - - - - */
	// * Handle Get Analysis

	const analysis: IAnalysisReadDto = useOutletContext();
	const [mode, setMode] = useState<"forms" | "visual">("forms");

	/* - - - - - - - - - - - - - - - - - - - - - - */
	// * Handle Get Step 2 PDF

	const [modalStep2PdfOpen, setModalStep2PdfOpen] = useState(false);
	const toggleModalStep2Pdf = () => setModalStep2PdfOpen(!modalStep2PdfOpen);

	/* - - - - - - - - - - - - - - - - - - - - - - */

	return (
		<>
			<AnalysisHeader analysis={analysis} step={ISteps.STEP_2} />
			<ControlStructureModeSwitch mode={mode} onModeChange={setMode} />

			{mode === "forms" ? (
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
			) : (
				<main className={canvasStyles.workspace} aria-labelledby="visual-workspace-title">
					<div className={canvasStyles.workspace_header}>
						<h1 id="visual-workspace-title">Visual control structure</h1>
						<p>Build and navigate the control structure in a visual workspace.</p>
					</div>
					<div
						className={canvasStyles.canvas_host}
						role="region"
						aria-label="Visual control structure canvas"
					>
						<div className={canvasStyles.placeholder}>
							<span className={canvasStyles.placeholder_title}>Canvas workspace</span>
						</div>
					</div>
				</main>
			)}
		</>
	);
}

export default AnalysisControlStructure;
