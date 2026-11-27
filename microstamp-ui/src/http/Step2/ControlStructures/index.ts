import { http } from "@http/AxiosConfig";
import type { IControlStructureReadDto } from "@interfaces/IStep2";

const CONTROL_STRUCTURES_ENDPOINT = "step2/control-structures";
const controlStructureQueryKey = (analysisId: string) =>
	["control-structure", analysisId] as const;

const getControlStructure = async (analysisId: string) => {
	try {
		const response = await http.get<IControlStructureReadDto>(
			`${CONTROL_STRUCTURES_ENDPOINT}/${analysisId}`
		);
		return response.data;
	} catch (error) {
		console.error(error);
		throw error;
	}
};

export { controlStructureQueryKey, getControlStructure };
