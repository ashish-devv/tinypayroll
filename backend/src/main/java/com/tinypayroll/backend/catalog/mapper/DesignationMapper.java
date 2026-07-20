package com.tinypayroll.backend.catalog.mapper;

import com.tinypayroll.backend.catalog.Designation;
import com.tinypayroll.backend.catalog.dto.DesignationResponse;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface DesignationMapper {

    DesignationResponse toResponse(Designation designation);
}
