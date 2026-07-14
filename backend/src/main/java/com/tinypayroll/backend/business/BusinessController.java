package com.tinypayroll.backend.business;

import com.tinypayroll.backend.business.dto.BusinessResponse;
import com.tinypayroll.backend.business.dto.UpdateBusinessRequest;
import com.tinypayroll.backend.security.CurrentUser;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** OWNER/ADMIN (write) — read allowed for any authenticated tenant member (PRD §8). */
@RestController
@RequestMapping("/api/v1/business")
public class BusinessController {

    private final BusinessService businessService;

    public BusinessController(BusinessService businessService) {
        this.businessService = businessService;
    }

    @GetMapping("/me")
    public BusinessResponse getCurrent() {
        return businessService.getCurrent(CurrentUser.businessId());
    }

    @PutMapping("/me")
    public BusinessResponse updateCurrent(@Valid @RequestBody UpdateBusinessRequest request) {
        return businessService.updateCurrent(CurrentUser.businessId(), request);
    }
}
