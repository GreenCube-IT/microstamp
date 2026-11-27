package microstamp.step2.service;


import microstamp.step2.dto.controlstructure.ControlStructureInsertDto;
import microstamp.step2.dto.controlstructure.ControlStructureReadDto;

import java.util.UUID;

public interface ControlStructureService {
    void saveControlStructure(ControlStructureInsertDto dto);

    ControlStructureReadDto findByAnalysisId(UUID analysisId);
}
