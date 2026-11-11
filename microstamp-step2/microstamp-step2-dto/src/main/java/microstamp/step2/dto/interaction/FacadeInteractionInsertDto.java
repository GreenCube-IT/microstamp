package microstamp.step2.dto.interaction;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import microstamp.step2.enumeration.InteractionType;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class FacadeInteractionInsertDto {

    private UUID id;

    @NotNull
    private String name;

    @NotBlank
    private String code;

    @NotNull
    private InteractionType interactionType;

    private UUID connectionId;
}