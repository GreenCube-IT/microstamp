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

    public void createConnectionCodeToIdMap(ControlStructureContext context) {
        for (FacadeConnectionInsertDto connection : context.getIncomingExistingConnections()) {
            context.getConnectionCodeToIdMap().put(connection.getCode(), connection.getId());
        }
    }

    public void saveConnections(ControlStructureContext context) {
        for (FacadeConnectionInsertDto connection : context.getIncomingNewConnections()) {
            UUID connectionId = persistConnection(context, connection);
            context.getConnectionCodeToIdMap().put(connection.getCode(), connectionId);
        }
    }

    public void updateExistingConnections(ControlStructureContext context) {
        for (FacadeConnectionInsertDto connection : context.getIncomingExistingConnections()) {
            updateConnection(context, connection);
        }
    }

    private UUID persistConnection(ControlStructureContext context, FacadeConnectionInsertDto connection) {
        UUID sourceId = context.getComponentCodeToIdMap().get(connection.getSourceCode());
        UUID targetId = context.getComponentCodeToIdMap().get(connection.getTargetCode());

        if (sourceId == null || targetId == null) {
            throw new Step2NotFoundException(
                    "Component Source/Target not found for connection", connection.getCode());
        }

        ConnectionInsertDto insertDto = ControlStructureMapper.toConnectionInsertDto(
                connection, sourceId, targetId, context.getAnalysisId());
        return connectionService.insertAfterAnalysisValidation(insertDto).getId();
    }

    private void updateConnection(ControlStructureContext context, FacadeConnectionInsertDto connection) {
        UUID sourceId = context.getComponentCodeToIdMap().get(connection.getSourceCode());
        UUID targetId = context.getComponentCodeToIdMap().get(connection.getTargetCode());

        if (sourceId == null || targetId == null) {
            throw new Step2NotFoundException(
                    "Component Source/Target not found for connection", connection.getCode());
        }

        ConnectionReadDto dbConnection = context.getDbConnectionsByIdMap().get(connection.getId());

        if (dbConnection == null)
            throw new Step2NotFoundException("Connection", connection.getCode());

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
        return !Objects.equals(incomingDto.getCode(), dbDto.getCode())
                || !Objects.equals(incomingDto.getSourceCode(), dbDto.getSource().getCode())
                || !Objects.equals(incomingDto.getTargetCode(), dbDto.getTarget().getCode())
                || !Objects.equals(incomingDto.getStyle(), dbDto.getStyle());
    }
}
