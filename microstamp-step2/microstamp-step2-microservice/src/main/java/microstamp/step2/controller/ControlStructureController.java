package microstamp.step2.controller;

import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import microstamp.step2.dto.controlstructure.ControlStructureInsertDto;
import microstamp.step2.dto.controlstructure.ControlStructureReadDto;
import microstamp.step2.service.ControlStructureService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@AllArgsConstructor
@RestController
@RequestMapping("/control-structures")
public class ControlStructureController {

    private final ControlStructureService controlStructureService;

    @GetMapping("/{analysisId}")
    @ResponseStatus(HttpStatus.OK)
    public ControlStructureReadDto findByAnalysisId(@PathVariable UUID analysisId) {
        return controlStructureService.findByAnalysisId(analysisId);
    }

    @PutMapping
    @ResponseStatus(HttpStatus.OK)
    public void update(@Valid @RequestBody ControlStructureInsertDto dto){
        controlStructureService.saveControlStructure(dto);
    }

}
