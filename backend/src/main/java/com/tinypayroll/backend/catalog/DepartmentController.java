package com.tinypayroll.backend.catalog;

import com.tinypayroll.backend.catalog.dto.CreateDepartmentRequest;
import com.tinypayroll.backend.catalog.dto.DepartmentResponse;
import com.tinypayroll.backend.catalog.dto.UpdateDepartmentRequest;
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
@RequestMapping("/api/v1/departments")
public class DepartmentController {

    private final DepartmentService departmentService;

    public DepartmentController(DepartmentService departmentService) {
        this.departmentService = departmentService;
    }

    @GetMapping
    public List<DepartmentResponse> list() {
        return departmentService.list(CurrentUser.businessId());
    }

    @PostMapping
    public ResponseEntity<DepartmentResponse> create(@Valid @RequestBody CreateDepartmentRequest request) {
        DepartmentResponse response = departmentService.create(CurrentUser.businessId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{id}")
    public DepartmentResponse update(@PathVariable Long id, @Valid @RequestBody UpdateDepartmentRequest request) {
        return departmentService.update(id, CurrentUser.businessId(), request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        departmentService.delete(id, CurrentUser.businessId());
        return ResponseEntity.noContent().build();
    }
}
