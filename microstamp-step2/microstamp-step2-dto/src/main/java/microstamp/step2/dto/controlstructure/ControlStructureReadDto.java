package microstamp.step2.dto.controlstructure;

import lombok.*;
import microstamp.step2.dto.component.ComponentReadDto;
import microstamp.step2.dto.connection.ConnectionReadDto;

import java.util.List;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ControlStructureReadDto {

    private UUID analysisId;

    private List<ComponentReadDto> components;

    private List<ConnectionReadDto> connections;
}
