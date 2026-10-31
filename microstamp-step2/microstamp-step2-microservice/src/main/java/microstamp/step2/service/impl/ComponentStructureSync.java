package microstamp.step2.service.impl;

import microstamp.step2.dto.component.ComponentInsertDto;
import microstamp.step2.dto.component.ComponentReadDto;
import microstamp.step2.dto.component.ComponentUpdateDto;
import microstamp.step2.dto.component.FacadeComponentInsertDto;
import microstamp.step2.mapper.ControlStructureMapper;
import microstamp.step2.service.ComponentService;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

public class ComponentStructureSync {

    private final ComponentService componentService;

    public ComponentStructureSync(ComponentService componentService) {
        this.componentService = componentService;
    }

    public void createComponentCodeToIdMap(ControlStructureContext context) {
        for (FacadeComponentInsertDto component : context.getIncomingExistingComponents()) {
            context.getComponentCodeToId().put(component.getCode(), component.getId());
        }
    }

    public void saveNewComponents(ControlStructureContext context) {
        List<FacadeComponentInsertDto> componentsContainingFather = new ArrayList<>();

        for (FacadeComponentInsertDto component : context.getIncomingNewComponents()) {
            ComponentInsertDto insertDto = ControlStructureMapper.toComponentInsertDto(
                    component, context.getAnalysisId());

            if (component.getFatherCode() != null && !component.getFatherCode().isBlank()) {
                componentsContainingFather.add(component);
            }

            ComponentReadDto savedComponent = componentService.insert(insertDto);
            context.getComponentCodeToId().put(savedComponent.getCode(), savedComponent.getId());
        }

        for (FacadeComponentInsertDto component : componentsContainingFather) {
            UUID childId = context.getComponentCodeToId().get(component.getCode());
            UUID fatherId = context.getComponentCodeToId().get(component.getFatherCode());

            if (childId != null && fatherId != null) {
                ComponentUpdateDto updateDto = ControlStructureMapper.toComponentUpdateDto(component, fatherId);
                componentService.update(childId, updateDto);
            }
        }
    }

    public void updateExistingComponents(ControlStructureContext context) {
        for (FacadeComponentInsertDto component : context.getIncomingExistingComponents()) {
            ComponentReadDto dbComponent = context.getDbComponentsByIdMap().get(component.getId());
            if (hasComponentChanged(component, dbComponent)) {
                UUID fatherId = null;
                if (component.getFatherCode() != null && !component.getFatherCode().isBlank()) {
                    fatherId = context.getComponentCodeToId().get(component.getFatherCode());
                }

                ComponentUpdateDto updateDto = ControlStructureMapper.toComponentUpdateDto(component, fatherId);
                componentService.update(component.getId(), updateDto);
            }
        }
    }

    public void cleanUpRemoved(ControlStructureContext context) {
        for (ComponentReadDto component : context.getDbComponents()) {
            if (!context.getIncomingExistingComponentIds().contains(component.getId())) {
                componentService.delete(component.getId());
            }
        }
    }

    private boolean hasComponentChanged(FacadeComponentInsertDto incomingDto, ComponentReadDto dbDto) {
        String fatherCode = null;
        if (dbDto.getFather() != null) {
            fatherCode = dbDto.getFather().getCode();
        }

        return !Objects.equals(incomingDto.getCode(), dbDto.getCode())
                || !Objects.equals(incomingDto.getBorder(), dbDto.getBorder())
                || !Objects.equals(incomingDto.getFatherCode(), fatherCode)
                || !Objects.equals(incomingDto.getIsVisible(), dbDto.getIsVisible())
                || !Objects.equals(incomingDto.getName(), dbDto.getName())
                || !Objects.equals(incomingDto.getType().getFormattedName(), dbDto.getType());
    }
}
