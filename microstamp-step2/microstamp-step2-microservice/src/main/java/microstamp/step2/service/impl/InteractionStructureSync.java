package microstamp.step2.service.impl;

import microstamp.step2.dto.connection.FacadeConnectionInsertDto;
import microstamp.step2.dto.interaction.FacadeInteractionInsertDto;
import microstamp.step2.dto.interaction.InteractionInsertDto;
import microstamp.step2.dto.interaction.InteractionReadDto;
import microstamp.step2.dto.interaction.InteractionUpdateDto;
import microstamp.step2.exception.Step2NotFoundException;
import microstamp.step2.mapper.ControlStructureMapper;
import microstamp.step2.service.InteractionService;

import java.util.Map;
import java.util.Objects;
import java.util.UUID;

public class InteractionStructureSync {

    private final InteractionService interactionService;

    public InteractionStructureSync(InteractionService interactionService) {
        this.interactionService = interactionService;
    }

    public void syncForConnection(ControlStructureContext context, FacadeConnectionInsertDto connection) {
        Map<UUID, InteractionReadDto> dbInteractionsMap = context.getDbInteractionsByIdMap();
        for (FacadeInteractionInsertDto interactionDto : connection.getInteractions()) {
            if (interactionDto.getId() == null) {
                saveInteraction(connection, interactionDto);
            } else {
                updateInteraction(interactionDto, dbInteractionsMap);
            }
        }
    }

    private void saveInteraction(FacadeConnectionInsertDto connection, FacadeInteractionInsertDto interaction) {
        InteractionInsertDto insertDto = ControlStructureMapper.toInteractionInsertDto(
                interaction, connection.getId());
        interactionService.insert(insertDto);
    }

    private void updateInteraction(FacadeInteractionInsertDto interaction, Map<UUID, InteractionReadDto> dbInteractionsMap) {
        InteractionReadDto dbInteraction = dbInteractionsMap.get(interaction.getId());

        if(dbInteraction == null)
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
        for (InteractionReadDto interaction : context.getDbInteractions()) {
            if (!context.getIncomingExistingInteractionIds().contains(interaction.getId())) {
                interactionService.deleteDirectlyById(interaction.getId());
            }
        }
    }
}
