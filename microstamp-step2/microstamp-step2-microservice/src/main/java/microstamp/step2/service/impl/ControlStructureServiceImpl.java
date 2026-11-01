package microstamp.step2.service.impl;

import microstamp.step2.client.MicroStampAuthClient;
import microstamp.step2.dto.component.ComponentReadDto;
import microstamp.step2.dto.connection.ConnectionReadDto;
import microstamp.step2.dto.controlstructure.ControlStructureInsertDto;
import microstamp.step2.dto.interaction.InteractionReadDto;
import microstamp.step2.service.ComponentService;
import microstamp.step2.service.ConnectionService;
import microstamp.step2.service.ControlStructureService;
import microstamp.step2.service.InteractionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Component
public class ControlStructureServiceImpl implements ControlStructureService {

    @Autowired
    private ComponentService componentService;

    @Autowired
    private ConnectionService connectionService;

    @Autowired
    private InteractionService interactionService;

    @Autowired
    private MicroStampAuthClient microStampAuthClient;

    @Override
    @Transactional
    public void saveControlStructure(ControlStructureInsertDto dto) {
        UUID analysisId = dto.getAnalysisId();
        microStampAuthClient.getAnalysisById(analysisId);

        List<ComponentReadDto> dbComponents = componentService.findByAnalysisId(analysisId);
        List<ConnectionReadDto> dbConnections = connectionService.findByAnalysisId(analysisId);
        List<InteractionReadDto> dbInteractions = interactionService.findByAnalysisId(analysisId);

        ControlStructureContext context = new ControlStructureContext(
                dto, dbComponents, dbConnections, dbInteractions);

        ComponentStructureSync componentSync = new ComponentStructureSync(componentService);
        ConnectionStructureSync connectionSync = new ConnectionStructureSync(connectionService);
        InteractionStructureSync interactionSync = new InteractionStructureSync(interactionService);

        componentSync.createComponentCodeToIdMap(context);
        componentSync.saveNewComponents(context);
        componentSync.updateExistingComponents(context);

        connectionSync.saveConnections(context, interactionSync);
        connectionSync.updateExistingConnections(context, interactionSync);

        interactionSync.cleanUpRemoved(context);
        connectionSync.cleanUpRemoved(context);
        componentSync.cleanUpRemoved(context);
    }
}