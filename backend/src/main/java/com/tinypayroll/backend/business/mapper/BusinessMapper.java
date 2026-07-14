package com.tinypayroll.backend.business.mapper;

import com.tinypayroll.backend.business.Business;
import com.tinypayroll.backend.business.dto.BusinessResponse;
import com.tinypayroll.backend.business.dto.UpdateBusinessRequest;
import org.mapstruct.BeanMapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.Mapper;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(componentModel = "spring")
public interface BusinessMapper {

    BusinessResponse toResponse(Business business);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void updateEntity(UpdateBusinessRequest request, @MappingTarget Business business);
}
