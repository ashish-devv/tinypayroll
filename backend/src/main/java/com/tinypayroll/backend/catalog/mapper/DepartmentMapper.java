package com.tinypayroll.backend.catalog.mapper;

import com.tinypayroll.backend.catalog.Department;
import com.tinypayroll.backend.catalog.dto.DepartmentResponse;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface DepartmentMapper {

    DepartmentResponse toResponse(Department department);
}
