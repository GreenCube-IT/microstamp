package microstamp.step2.service.impl;

import lombok.Getter;
import lombok.Setter;
import microstamp.step2.dto.component.ComponentReadDto;
import microstamp.step2.dto.component.FacadeComponentInsertDto;
import microstamp.step2.dto.connection.ConnectionReadDto;
import microstamp.step2.dto.connection.FacadeConnectionInsertDto;
import microstamp.step2.dto.controlstructure.ControlStructureInsertDto;
import microstamp.step2.dto.interaction.FacadeInteractionInsertDto;
import microstamp.step2.dto.interaction.InteractionReadDto;

import java.util.*;

@Getter
public class ControlStructureContext {

    private final UUID analysisId;
    private final boolean environmentIncluded;
    @Setter
    private UUID environmentId;
    private final List<InteractionReadDto> dbInteractions;
    private final List<ConnectionReadDto> dbConnections;
    private final List<ComponentReadDto> dbComponents;
    private final Map<UUID, ConnectionReadDto> dbConnectionsByIdMap = new HashMap<>();
    private final Map<UUID, ComponentReadDto> dbComponentsByIdMap = new HashMap<>();
    private final Map<UUID, InteractionReadDto> dbInteractionsByIdMap = new HashMap<>();
    private final List<FacadeComponentInsertDto> incomingNewComponents = new LinkedList<>();
    private final List<FacadeComponentInsertDto> incomingExistingComponents = new LinkedList<>();
    private final List<FacadeConnectionInsertDto> incomingNewConnections = new LinkedList<>();
    private final List<FacadeConnectionInsertDto> incomingExistingConnections = new LinkedList<>();
    private final Set<UUID> incomingExistingComponentIds = new HashSet<>();
    private final Set<UUID> incomingExistingConnectionIds = new HashSet<>();
    private final Set<UUID> incomingExistingInteractionIds = new HashSet<>();
    private final Map<String, UUID> componentCodeToIdMap = new HashMap<>();
    private final Map<String, UUID> connectionCodeToIdMap = new HashMap<>();

    public ControlStructureContext(
            ControlStructureInsertDto dto,
            List<ComponentReadDto> dbComponents,
            List<ConnectionReadDto> dbConnections,
            List<InteractionReadDto> dbInteractions) {
        this.analysisId = dto.getAnalysisId();

        this.environmentIncluded = dto.isEnvironmentIncluded();

        this.dbInteractions = dbInteractions;
        this.dbConnections = dbConnections;
        this.dbComponents = dbComponents;

        fillConnectionByIdMap();
        fillComponentByIdMap();

        fillDbInteractionsMap();

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

    private void fillDbInteractionsMap() {
        for (InteractionReadDto interaction : dbInteractions) {
            dbInteractionsByIdMap.put(interaction.getId(), interaction);
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
                getPayloadInteractionsForConnection(connection);
            }
        }
    }

    private void getPayloadInteractionsForConnection(FacadeConnectionInsertDto connectionDto) {
        for (FacadeInteractionInsertDto interaction : connectionDto.getInteractions()) {
            if (interaction.getId() != null) {
                incomingExistingInteractionIds.add(interaction.getId());
            }
        }
    }
}
