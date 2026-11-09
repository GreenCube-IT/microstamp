package microstamp.step2.service.impl;

import microstamp.step2.dto.environment.EnvironmentReadDto;
import microstamp.step2.service.EnvironmentService;

public class EnvironmentStructureSync {

    private final EnvironmentService environmentService;

    public EnvironmentStructureSync(EnvironmentService environmentService){
        this.environmentService = environmentService;
    }

    public void synchronizeEnvironment(ControlStructureContext context) {
        boolean isEnvironmentIncluded = context.isEnvironmentIncluded();
        EnvironmentReadDto dbEnvironment = environmentService.findByAnalysisId(context.getAnalysisId());

        if (dbEnvironment != null) {
            context.setEnvironmentId(dbEnvironment.getId());
        }

        if (isEnvironmentIncluded) {
            if (dbEnvironment == null) {
                dbEnvironment = environmentService.insert(context.getAnalysisId());
                context.setEnvironmentId(dbEnvironment.getId());
            }

            context.getComponentCodeToIdMap().put(dbEnvironment.getCode(), dbEnvironment.getId());
        }
    }

    public void cleanUpRemoved(ControlStructureContext context) {
        if (!context.isEnvironmentIncluded() && context.getEnvironmentId() != null) {
            environmentService.delete(context.getEnvironmentId());
        }
    }
}
