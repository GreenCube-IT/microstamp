package microstamp.step2.unit;

import microstamp.step2.client.MicroStampAuthClient;
import microstamp.step2.dto.component.ComponentReadDto;
import microstamp.step2.dto.connection.ConnectionReadDto;
import microstamp.step2.dto.controlstructure.ControlStructureReadDto;
import microstamp.step2.dto.interaction.InteractionReadDto;
import microstamp.step2.exception.Step2NotFoundException;
import microstamp.step2.service.ComponentService;
import microstamp.step2.service.ConnectionService;
import microstamp.step2.service.EnvironmentService;
import microstamp.step2.service.InteractionService;
import microstamp.step2.service.impl.ControlStructureServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.UUID;

import static microstamp.step2.enumeration.InteractionType.CONTROL_ACTION;
import static microstamp.step2.enumeration.Style.SOLID;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ControlStructureReadServiceUnitTest {

    @InjectMocks
    private ControlStructureServiceImpl service;

    @Mock
    private ComponentService componentService;

    @Mock
    private ConnectionService connectionService;

    @Mock
    private InteractionService interactionService;

    @Mock
    private MicroStampAuthClient microStampAuthClient;

    @Mock
    private EnvironmentService environmentService;

    @Test
    void returnsEmptySnapshotForExistingAnalysisWithoutStructure() {
        UUID analysisId = UUID.randomUUID();
        when(componentService.findByAnalysisId(analysisId)).thenReturn(List.of());
        when(connectionService.findByAnalysisId(analysisId)).thenReturn(List.of());

        ControlStructureReadDto result = service.findByAnalysisId(analysisId);

        assertEquals(analysisId, result.getAnalysisId());
        assertTrue(result.getComponents().isEmpty());
        assertTrue(result.getConnections().isEmpty());
        verify(microStampAuthClient).getAnalysisById(analysisId);
        verifyNoInteractions(environmentService);
    }

    @Test
    void returnsComponentsConnectionsInteractionsAndEnvironment() {
        UUID analysisId = UUID.randomUUID();
        ComponentReadDto source = ComponentReadDto.builder()
                .id(UUID.randomUUID())
                .name("Controller")
                .code("C.01")
                .type("Controller")
                .isVisible(true)
                .border(SOLID)
                .build();
        ComponentReadDto target = ComponentReadDto.builder()
                .id(UUID.randomUUID())
                .name("Process")
                .code("P.01")
                .type("ControlledProcess")
                .isVisible(true)
                .border(SOLID)
                .father(source)
                .build();
        InteractionReadDto interaction = InteractionReadDto.builder()
                .id(UUID.randomUUID())
                .name("Start")
                .code("I.01")
                .interactionType(CONTROL_ACTION)
                .build();
        ConnectionReadDto connection = ConnectionReadDto.builder()
                .id(UUID.randomUUID())
                .code("Cn.01")
                .source(source)
                .target(target)
                .style(SOLID)
                .interactions(List.of(interaction))
                .build();
        ComponentReadDto environment = ComponentReadDto.builder()
                .id(UUID.randomUUID())
                .name("Environment")
                .code("Env")
                .type("Environment")
                .isVisible(true)
                .border(SOLID)
                .build();
        List<ComponentReadDto> components = List.of(source, target, environment);
        List<ConnectionReadDto> connections = List.of(connection);

        when(componentService.findByAnalysisId(analysisId)).thenReturn(components);
        when(connectionService.findByAnalysisId(analysisId)).thenReturn(connections);

        ControlStructureReadDto result = service.findByAnalysisId(analysisId);

        assertSame(components, result.getComponents());
        assertSame(connections, result.getConnections());
        assertEquals(1, result.getComponents().stream()
                .filter(component -> "Environment".equals(component.getType()))
                .count());
        assertSame(interaction, result.getConnections().getFirst().getInteractions().getFirst());
        assertSame(source, result.getConnections().getFirst().getSource());
        assertSame(target, result.getConnections().getFirst().getTarget());
        verifyNoInteractions(environmentService);
    }

    @Test
    void doesNotReadStructureWhenAnalysisDoesNotExist() {
        UUID analysisId = UUID.randomUUID();
        doThrow(new Step2NotFoundException("Analysis", analysisId.toString()))
                .when(microStampAuthClient).getAnalysisById(analysisId);

        assertThrows(Step2NotFoundException.class, () -> service.findByAnalysisId(analysisId));

        verifyNoInteractions(componentService, connectionService, environmentService);
    }
}
