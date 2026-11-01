package microstamp.step2.service.impl;

import lombok.Getter;
import microstamp.step2.dto.component.ComponentReadDto;
import microstamp.step2.dto.component.FacadeComponentInsertDto;
import microstamp.step2.dto.connection.ConnectionReadDto;
import microstamp.step2.dto.connection.FacadeConnectionInsertDto;
import microstamp.step2.dto.controlstructure.ControlStructureInsertDto;
import microstamp.step2.dto.interaction.FacadeInteractionInsertDto;
import microstamp.step2.dto.interaction.InteractionReadDto;
import microstamp.step2.service.ComponentService;
import microstamp.step2.service.ConnectionService;
import microstamp.step2.service.InteractionService;

import java.util.*;

@Getter
public class ControlStructureContext {

    private final UUID analysisId;
    private final List<InteractionReadDto> dbInteractions;
    private final List<ConnectionReadDto> dbConnections;
    private final List<ComponentReadDto> dbComponents;
    private final Map<UUID, ConnectionReadDto> dbConnectionsByIdMap = new HashMap<>();
    private final Map<UUID, ComponentReadDto> dbComponentsByIdMap = new HashMap<>();
    private final List<FacadeComponentInsertDto> incomingNewComponents = new LinkedList<>();
    private final List<FacadeComponentInsertDto> incomingExistingComponents = new LinkedList<>();
    private final List<FacadeConnectionInsertDto> incomingNewConnections = new LinkedList<>();
    private final List<FacadeConnectionInsertDto> incomingExistingConnections = new LinkedList<>();
    private final Set<UUID> incomingExistingComponentIds = new HashSet<>();
    private final Set<UUID> incomingExistingConnectionIds = new HashSet<>();
    private final Set<UUID> incomingExistingInteractionIds = new HashSet<>();
    private final Map<String, UUID> componentCodeToId = new HashMap<>();

    public ControlStructureContext(
            ControlStructureInsertDto dto,
            List<ComponentReadDto> dbComponents,
            List<ConnectionReadDto> dbConnections,
            List<InteractionReadDto> dbInteractions) {
        this.analysisId = dto.getAnalysisId();

        this.dbInteractions = dbInteractions;
        this.dbConnections = dbConnections;
        this.dbComponents = dbComponents;

        fillConnectionByIdMap();
        fillComponentByIdMap();

        getPayloadComponents(dto);
        getPayloadConnections(dto);

    }

    private void fillConnectionByIdMap() {
        for (ConnectionReadDto connection : dbConnections) {
            dbConnectionsByIdMap.put(connection.getId(), connection);
        }
    }

    private void fillComponentByIdMap() {
        for (ComponentReadDto component : dbComponents) {
            dbComponentsByIdMap.put(component.getId(), component);
        }
    }

    private void getPayloadComponents(ControlStructureInsertDto dto) {
        if (dto.getComponents() == null) {
            return;
        }
        for (FacadeComponentInsertDto component : dto.getComponents()) {
            if (component.getId() == null) {
                incomingNewComponents.add(component);
            } else {
                incomingExistingComponentIds.add(component.getId());
                incomingExistingComponents.add(component);
            }
        }
    }

    private void getPayloadConnections(ControlStructureInsertDto dto) {
        if (dto.getConnections() == null) {
            return;
        }
        for (FacadeConnectionInsertDto connection : dto.getConnections()) {
            if (connection.getId() == null) {
                incomingNewConnections.add(connection);
            } else {
                incomingExistingConnectionIds.add(connection.getId());
                incomingExistingConnections.add(connection);
            }

            if (connection.getInteractions() != null) {
                for (FacadeInteractionInsertDto interaction : connection.getInteractions()) {
                    if (interaction.getId() != null) {
                        incomingExistingInteractionIds.add(interaction.getId());
                    }
                }
            }
        }
    }
}
