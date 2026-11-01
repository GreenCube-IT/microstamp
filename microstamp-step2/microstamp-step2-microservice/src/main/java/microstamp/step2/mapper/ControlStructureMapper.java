package microstamp.step2.mapper;

import microstamp.step2.dto.component.ComponentInsertDto;
import microstamp.step2.dto.component.ComponentUpdateDto;
import microstamp.step2.dto.component.FacadeComponentInsertDto;
import microstamp.step2.dto.connection.ConnectionInsertDto;
import microstamp.step2.dto.connection.ConnectionUpdateDto;
import microstamp.step2.dto.connection.FacadeConnectionInsertDto;
import microstamp.step2.dto.interaction.FacadeInteractionInsertDto;
import microstamp.step2.dto.interaction.InteractionInsertDto;
import microstamp.step2.dto.interaction.InteractionUpdateDto;

import java.util.UUID;

public class ControlStructureMapper {

    public static ComponentInsertDto toComponentInsertDto(FacadeComponentInsertDto facadeComponentInsertDto, UUID analysisId) {
        ComponentInsertDto componentInsertDto = new ComponentInsertDto();

        componentInsertDto.setName(facadeComponentInsertDto.getName());
        componentInsertDto.setCode(facadeComponentInsertDto.getCode());
        componentInsertDto.setBorder(facadeComponentInsertDto.getBorder());
        componentInsertDto.setIsVisible(facadeComponentInsertDto.getIsVisible());
        componentInsertDto.setAnalysisId(analysisId);
        componentInsertDto.setType(facadeComponentInsertDto.getType());

        return componentInsertDto;
    }

    public static ComponentUpdateDto toComponentUpdateDto(FacadeComponentInsertDto facadeComponentInsertDto, UUID fatherId) {
        return ComponentUpdateDto.builder()
                .name(facadeComponentInsertDto.getName())
                .code(facadeComponentInsertDto.getCode())
                .isVisible(facadeComponentInsertDto.getIsVisible())
                .fatherId(fatherId)
                .border(facadeComponentInsertDto.getBorder())
                .type(facadeComponentInsertDto.getType())
                .build();
    }

    public static ConnectionInsertDto toConnectionInsertDto(FacadeConnectionInsertDto facadeConnectionInsertDto, UUID sourceId, UUID targetId, UUID analysisID) {
        return ConnectionInsertDto.builder()
                .code(facadeConnectionInsertDto.getCode())
                .sourceId(sourceId)
                .targetId(targetId)
                .style(facadeConnectionInsertDto.getStyle())
                .analysisId(analysisID)
                .build();
    }

    public static ConnectionUpdateDto toConnectionUpdateDto(FacadeConnectionInsertDto facadeConnectionInsertDto, UUID sourceId, UUID targetId) {
        return ConnectionUpdateDto.builder()
                .code(facadeConnectionInsertDto.getCode())
                .sourceId(sourceId)
                .targetId(targetId)
                .style(facadeConnectionInsertDto.getStyle())
                .build();
    }

    public static InteractionInsertDto toInteractionInsertDto(FacadeInteractionInsertDto facadeInteractionInsertDto, UUID connectionId){
        return InteractionInsertDto.builder()
                .name(facadeInteractionInsertDto.getName())
                .code(facadeInteractionInsertDto.getCode())
                .interactionType(facadeInteractionInsertDto.getInteractionType())
                .connectionId(connectionId)
                .build();
    }

    public static InteractionUpdateDto toInteractionUpdateDto(FacadeInteractionInsertDto facadeInteractionInsertDto){
        return InteractionUpdateDto.builder()
                .name(facadeInteractionInsertDto.getName())
                .code(facadeInteractionInsertDto.getCode())
                .interactionType(facadeInteractionInsertDto.getInteractionType())
                .build();
    }
}
