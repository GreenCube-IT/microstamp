import { createServer } from "vite";

const server = await createServer({
	configFile: "vite.config.ts",
	server: { middlewareMode: true },
	appType: "custom"
});

try {
	await server.ssrLoadModule(
		"/src/pages/AnalysisSteps/Step2/AnalysisControlStructure/VisualControlStructure/domain/rules.test.ts"
	);
} finally {
	await server.close();
}
