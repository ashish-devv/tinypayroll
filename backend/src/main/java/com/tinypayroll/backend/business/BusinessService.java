package com.tinypayroll.backend.business;

import com.tinypayroll.backend.business.dto.BusinessResponse;
import com.tinypayroll.backend.business.dto.UpdateBusinessRequest;
import com.tinypayroll.backend.business.mapper.BusinessMapper;
import com.tinypayroll.backend.audit.Auditable;
import com.tinypayroll.backend.common.exceptions.NotFoundException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BusinessService {

    private final BusinessRepository businessRepository;
    private final BusinessMapper businessMapper;

    public BusinessService(BusinessRepository businessRepository, BusinessMapper businessMapper) {
        this.businessRepository = businessRepository;
        this.businessMapper = businessMapper;
    }

    @Transactional(readOnly = true)
    public BusinessResponse getCurrent(Long businessId) {
        Business business = businessRepository
                .findByIdAndActiveTrue(businessId)
                .orElseThrow(() -> NotFoundException.of("Business", businessId));
        return businessMapper.toResponse(business);
    }

    @PreAuthorize("hasAnyRole('OWNER','ADMIN')")
    @Auditable(action = "UPDATE_BUSINESS_CONFIG", entityType = "Business")
    @Transactional
    public BusinessResponse updateCurrent(Long businessId, UpdateBusinessRequest request) {
        Business business = businessRepository
                .findByIdAndActiveTrue(businessId)
                .orElseThrow(() -> NotFoundException.of("Business", businessId));
        businessMapper.updateEntity(request, business);
        return businessMapper.toResponse(businessRepository.save(business));
    }
}
