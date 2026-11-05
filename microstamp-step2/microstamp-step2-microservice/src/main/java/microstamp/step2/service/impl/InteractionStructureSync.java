package microstamp.step2.service.impl;

import microstamp.step2.dto.connection.FacadeConnectionInsertDto;
import microstamp.step2.dto.interaction.FacadeInteractionInsertDto;
import microstamp.step2.dto.interaction.InteractionInsertDto;
import microstamp.step2.dto.interaction.InteractionReadDto;
import microstamp.step2.dto.interaction.InteractionUpdateDto;
import microstamp.step2.exception.Step2NotFoundException;
import microstamp.step2.mapper.ControlStructureMapper;
import microstamp.step2.service.InteractionService;

import java.util.*;

public class InteractionStructureSync {

    private final InteractionService interactionService;

    public InteractionStructureSync(InteractionService interactionService) {
        this.interactionService = interactionService;
    }

    public void saveInteractions(ControlStructureContext context) {
        Map<UUID, InteractionReadDto> dbInteractionsMap = context.getDbInteractionsByIdMap();

        for (FacadeConnectionInsertDto facadeConnectionInsertDto : context.getIncomingNewConnections()) {
            UUID connectionId = context.getConnectionCodeToIdMap().get(facadeConnectionInsertDto.getCode());
            if (connectionId == null)
                throw new Step2NotFoundException("Connection", facadeConnectionInsertDto.getCode());

            if (facadeConnectionInsertDto.getInteractions() != null && !facadeConnectionInsertDto.getInteractions().isEmpty()) {
                syncForConnection(dbInteractionsMap, facadeConnectionInsertDto, connectionId);
            }
        }

        for (FacadeConnectionInsertDto facadeConnectionInsertDto : context.getIncomingExistingConnections()) {
            if (facadeConnectionInsertDto.getInteractions() != null && !facadeConnectionInsertDto.getInteractions().isEmpty()) {
                syncForConnection(dbInteractionsMap, facadeConnectionInsertDto, facadeConnectionInsertDto.getId());
            }
        }
    }

    private void syncForConnection(Map<UUID, InteractionReadDto> dbInteractionsMap, FacadeConnectionInsertDto facadeConnDto, UUID connectionId) {
        for (FacadeInteractionInsertDto interactionDto : facadeConnDto.getInteractions()) {
            if (interactionDto.getId() == null) {
                saveInteraction(facadeConnDto, interactionDto, connectionId);
            } else {
                updateInteraction(interactionDto, dbInteractionsMap);
            }
        }
    }

    private void saveInteraction(FacadeConnectionInsertDto connection, FacadeInteractionInsertDto interaction, UUID connectionId) {
        InteractionInsertDto insertDto = ControlStructureMapper.toInteractionInsertDto(
                interaction, connectionId);
        interactionService.insert(insertDto);
    }

    private void updateInteraction(FacadeInteractionInsertDto interaction, Map<UUID, InteractionReadDto> dbInteractionsMap) {
        InteractionReadDto dbInteraction = dbInteractionsMap.get(interaction.getId());

        if (dbInteraction == null)
            throw new Step2NotFoundException("Interaction", interaction.getCode());

        if (hasInteractionChanged(interaction, dbInteraction)) {
            InteractionUpdateDto updateDto = ControlStructureMapper.toInteractionUpdateDto(interaction);
            interactionService.update(interaction.getId(), updateDto);
        }
    }

    private Boolean hasInteractionChanged(FacadeInteractionInsertDto incomingDto, InteractionReadDto dbDto) {
        return !Objects.equals(incomingDto.getCode(), dbDto.getCode())
                || !Objects.equals(incomingDto.getName(), dbDto.getName())
                || !Objects.equals(incomingDto.getInteractionType(), dbDto.getInteractionType());
    }

    public void cleanUpRemoved(ControlStructureContext context) {
        List<UUID> interactionsIdsToRemove = new ArrayList<>();

        for (InteractionReadDto interaction : context.getDbInteractions()) {
            if (!context.getIncomingExistingInteractionIds().contains(interaction.getId())) {
                interactionsIdsToRemove.add(interaction.getId());
            }
        }

        if (!interactionsIdsToRemove.isEmpty())
            interactionService.deleteDirectlyByIds(interactionsIdsToRemove);
    }
}
