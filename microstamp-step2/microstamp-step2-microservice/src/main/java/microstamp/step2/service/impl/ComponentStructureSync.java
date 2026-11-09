package microstamp.step2.service.impl;

import microstamp.step2.dto.component.ComponentInsertDto;
import microstamp.step2.dto.component.ComponentReadDto;
import microstamp.step2.dto.component.ComponentUpdateDto;
import microstamp.step2.dto.component.FacadeComponentInsertDto;
import microstamp.step2.dto.environment.EnvironmentReadDto;
import microstamp.step2.exception.Step2NotFoundException;
import microstamp.step2.mapper.ControlStructureMapper;
import microstamp.step2.service.ComponentService;
import microstamp.step2.service.EnvironmentService;

import java.util.*;

public class ComponentStructureSync {

    private final ComponentService componentService;

    public ComponentStructureSync(ComponentService componentService) {
        this.componentService = componentService;
    }

    public void putPayloadExistingComponentsInCodeToIdMap(ControlStructureContext context) {
        for (FacadeComponentInsertDto component : context.getIncomingExistingComponents()) {
            context.getComponentCodeToIdMap().put(component.getCode(), component.getId());
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

            ComponentReadDto savedComponent = componentService.insertAfterAnalysisValidation(insertDto);
            context.getComponentCodeToIdMap().put(savedComponent.getCode(), savedComponent.getId());
        }

        relateFathersAfterBatchSave(context, componentsContainingFather);
    }

    private void relateFathersAfterBatchSave(ControlStructureContext context, List<FacadeComponentInsertDto> componentsContainingFather) {
        for (FacadeComponentInsertDto component : componentsContainingFather) {
            UUID childId = context.getComponentCodeToIdMap().get(component.getCode());
            UUID fatherId = context.getComponentCodeToIdMap().get(component.getFatherCode());

            if (childId == null) {
                throw new Step2NotFoundException("Child component", component.getCode());
            }
            if (fatherId == null) {
                throw new Step2NotFoundException("Father component", component.getFatherCode());
            }

            ComponentUpdateDto updateDto = ControlStructureMapper.toComponentUpdateDto(component, fatherId);
            componentService.update(childId, updateDto);
        }
    }

    public void updateExistingComponents(ControlStructureContext context) {
        for (FacadeComponentInsertDto component : context.getIncomingExistingComponents()) {
            ComponentReadDto dbComponent = context.getDbComponentsByIdMap().get(component.getId());

            if (dbComponent == null)
                throw new Step2NotFoundException("Component", component.getCode());

            if (hasComponentChanged(component, dbComponent)) {
                UUID fatherId = null;
                if (component.getFatherCode() != null && !component.getFatherCode().isBlank()) {
                    fatherId = context.getComponentCodeToIdMap().get(component.getFatherCode());
                }

                ComponentUpdateDto updateDto = ControlStructureMapper.toComponentUpdateDto(component, fatherId);
                componentService.update(component.getId(), updateDto);
            }
        }
    }

    public void cleanUpRemoved(ControlStructureContext context) {
        Set<UUID> deletedDescendants = new HashSet<>();

        for (ComponentReadDto component : context.getDbComponents()) {
            if (!Objects.equals(context.getEnvironmentId(), component.getId())
                    && !context.getIncomingExistingComponentIds().contains(component.getId())
                    && !deletedDescendants.contains(component.getId())) {
                recordDescendantIdsToSkip(deletedDescendants, component);
                componentService.delete(component.getId());
            }
        }
    }

    private void recordDescendantIdsToSkip(Set<UUID> deletedDescendants, ComponentReadDto component) {
        List<ComponentReadDto> children = componentService.getComponentChildren(component.getId());

        for (ComponentReadDto child : children) {
            deletedDescendants.add(child.getId());
        }
    }

    private boolean hasComponentChanged(FacadeComponentInsertDto incomingDto, ComponentReadDto dbDto) {
        String fatherCode = null;
        if (dbDto.getFather() != null) {
            fatherCode = dbDto.getFather().getCode();
        }

        String formattedName = null;
        if (incomingDto.getType() != null)
            formattedName = incomingDto.getType().getFormattedName();

        return !Objects.equals(incomingDto.getCode(), dbDto.getCode())
                || !Objects.equals(incomingDto.getBorder(), dbDto.getBorder())
                || !Objects.equals(incomingDto.getFatherCode(), fatherCode)
                || !Objects.equals(incomingDto.getIsVisible(), dbDto.getIsVisible())
                || !Objects.equals(incomingDto.getName(), dbDto.getName())
                || !Objects.equals(formattedName, dbDto.getType());
    }
}
