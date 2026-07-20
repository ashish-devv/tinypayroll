package com.tinypayroll.backend.catalog;

import com.tinypayroll.backend.catalog.dto.CreateDesignationRequest;
import com.tinypayroll.backend.catalog.dto.DesignationResponse;
import com.tinypayroll.backend.catalog.dto.UpdateDesignationRequest;
import com.tinypayroll.backend.security.CurrentUser;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/designations")
public class DesignationController {

    private final DesignationService designationService;

    public DesignationController(DesignationService designationService) {
        this.designationService = designationService;
    }

    @GetMapping
    public List<DesignationResponse> list() {
        return designationService.list(CurrentUser.businessId());
    }

    @PostMapping
    public ResponseEntity<DesignationResponse> create(@Valid @RequestBody CreateDesignationRequest request) {
        DesignationResponse response = designationService.create(CurrentUser.businessId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{id}")
    public DesignationResponse update(@PathVariable Long id, @Valid @RequestBody UpdateDesignationRequest request) {
        return designationService.update(id, CurrentUser.businessId(), request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        designationService.delete(id, CurrentUser.businessId());
        return ResponseEntity.noContent().build();
    }
}
