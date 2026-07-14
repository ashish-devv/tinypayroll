package com.tinypayroll.backend.employee.mapper;

import com.tinypayroll.backend.employee.Employee;
import com.tinypayroll.backend.employee.dto.CreateEmployeeRequest;
import com.tinypayroll.backend.employee.dto.EmployeeResponse;
import com.tinypayroll.backend.employee.dto.UpdateEmployeeRequest;
import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.Named;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(componentModel = "spring")
public interface EmployeeMapper {

    @Mapping(target = "ifscMasked", source = "ifsc", qualifiedByName = "maskTail")
    @Mapping(target = "bankAccountMasked", source = "bankAccountNumber", qualifiedByName = "maskTail")
    EmployeeResponse toResponse(Employee employee);

    @Mapping(target = "businessId", ignore = true)
    @Mapping(target = "status", ignore = true)
    Employee fromCreateRequest(CreateEmployeeRequest request);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "businessId", ignore = true)
    void updateEntity(UpdateEmployeeRequest request, @MappingTarget Employee employee);

    /** Shows only the last 4 characters — e.g. "****1234" — never the full number. */
    @Named("maskTail")
    default String maskTail(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        int visible = Math.min(4, value.length());
        return "*".repeat(Math.max(0, value.length() - visible)) + value.substring(value.length() - visible);
    }
}
