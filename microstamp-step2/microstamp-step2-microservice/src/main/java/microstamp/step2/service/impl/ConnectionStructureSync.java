package microstamp.step2.service.impl;

import microstamp.step2.dto.connection.ConnectionInsertDto;
import microstamp.step2.dto.connection.ConnectionReadDto;
import microstamp.step2.dto.connection.ConnectionUpdateDto;
import microstamp.step2.dto.connection.FacadeConnectionInsertDto;
import microstamp.step2.exception.Step2NotFoundException;
import microstamp.step2.mapper.ControlStructureMapper;
import microstamp.step2.service.ConnectionService;

import java.util.Objects;
import java.util.UUID;

public class ConnectionStructureSync {

    private final ConnectionService connectionService;

    public ConnectionStructureSync(ConnectionService connectionService) {
        this.connectionService = connectionService;
    }

    public void saveConnections(ControlStructureContext context, InteractionStructureSync interactionSync) {
        for (FacadeConnectionInsertDto connection : context.getIncomingNewConnections()) {
            UUID connectionId = saveNewConnection(context, connection);
            if (connectionId != null && connection.getInteractions() != null
                    && !connection.getInteractions().isEmpty()) {
                interactionSync.syncForConnection(connection, connectionId);
            }
        }
    }

    public void updateExistingConnections(ControlStructureContext context, InteractionStructureSync interactionSync) {
        for (FacadeConnectionInsertDto connection : context.getIncomingExistingConnections()) {
            updateExistingConnection(context, connection);
            if (connection.getInteractions() != null && !connection.getInteractions().isEmpty()) {
                interactionSync.syncForConnection(connection, connection.getId());
            }
        }
    }

    private UUID saveNewConnection(ControlStructureContext context, FacadeConnectionInsertDto connection) {
        UUID sourceId = context.getComponentCodeToIdMap().get(connection.getSourceCode());
        UUID targetId = context.getComponentCodeToIdMap().get(connection.getTargetCode());

        if (sourceId == null || targetId == null) {
            throw new Step2NotFoundException(
                    "Component Source/Target not found for connection", connection.getCode());
        }

        ConnectionInsertDto insertDto = ControlStructureMapper.toConnectionInsertDto(
                connection, sourceId, targetId, context.getAnalysisId());
        return connectionService.insert(insertDto).getId();
    }

    private void updateExistingConnection(ControlStructureContext context, FacadeConnectionInsertDto connection) {
        UUID sourceId = context.getComponentCodeToIdMap().get(connection.getSourceCode());
        UUID targetId = context.getComponentCodeToIdMap().get(connection.getTargetCode());

        if (sourceId == null || targetId == null) {
            throw new Step2NotFoundException(
                    "Component Source/Target not found for connection", connection.getCode());
        }

        ConnectionReadDto dbConnection = context.getDbConnectionsByIdMap().get(connection.getId());
        if (hasConnectionChanged(connection, dbConnection)) {
            ConnectionUpdateDto updateDto = ControlStructureMapper.toConnectionUpdateDto(
                    connection, sourceId, targetId);
            connectionService.update(connection.getId(), updateDto);
        }
    }

    public void cleanUpRemoved(ControlStructureContext context) {
        for (ConnectionReadDto connection : context.getDbConnections()) {
            if (!context.getIncomingExistingConnectionIds().contains(connection.getId())) {
                connectionService.delete(connection.getId());
            }
        }
    }

    private boolean hasConnectionChanged(FacadeConnectionInsertDto incomingDto, ConnectionReadDto dbDto) {
        if (dbDto == null)
            throw new Step2NotFoundException("Connection", incomingDto.getCode());

        return !Objects.equals(incomingDto.getCode(), dbDto.getCode())
                || !Objects.equals(incomingDto.getSourceCode(), dbDto.getSource().getCode())
                || !Objects.equals(incomingDto.getTargetCode(), dbDto.getTarget().getCode())
                || !Objects.equals(incomingDto.getStyle(), dbDto.getStyle());
    }
}
