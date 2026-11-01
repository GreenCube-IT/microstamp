package microstamp.step2.service.impl;

import microstamp.step2.dto.connection.FacadeConnectionInsertDto;
import microstamp.step2.dto.interaction.FacadeInteractionInsertDto;
import microstamp.step2.dto.interaction.InteractionInsertDto;
import microstamp.step2.dto.interaction.InteractionReadDto;
import microstamp.step2.dto.interaction.InteractionUpdateDto;
import microstamp.step2.mapper.ControlStructureMapper;
import microstamp.step2.service.InteractionService;

import java.util.UUID;

public class InteractionStructureSync {

    private final InteractionService interactionService;

    public InteractionStructureSync(InteractionService interactionService) {
        this.interactionService = interactionService;
    }

    public void syncForConnection(FacadeConnectionInsertDto connection, UUID connectionId) {
        for (FacadeInteractionInsertDto interaction : connection.getInteractions()) {
            if (interaction.getId() == null) {
                InteractionInsertDto insertDto = ControlStructureMapper.toInteractionInsertDto(
                        interaction, connectionId);
                interactionService.insert(insertDto);
            } else {
                InteractionUpdateDto updateDto = ControlStructureMapper.toInteractionUpdateDto(interaction);
                interactionService.update(interaction.getId(), updateDto);
            }
        }
    }

    public void cleanUpRemoved(ControlStructureContext context) {
        for (InteractionReadDto interaction : context.getDbInteractions()) {
            if (!context.getIncomingExistingInteractionIds().contains(interaction.getId())) {
                interactionService.deleteDirectlyById(interaction.getId());
            }
        }
    }
}
