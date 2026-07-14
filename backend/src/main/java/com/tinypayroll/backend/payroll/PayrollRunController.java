package com.tinypayroll.backend.payroll;

import com.tinypayroll.backend.payroll.dto.CreatePayrollRunRequest;
import com.tinypayroll.backend.payroll.dto.PayrollAdjustment;
import com.tinypayroll.backend.payroll.dto.PayrollRunResponse;
import com.tinypayroll.backend.payroll.dto.PayrollRunSummaryResponse;
import com.tinypayroll.backend.payroll.dto.PayslipResponse;
import com.tinypayroll.backend.security.CurrentUser;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/payroll-runs")
public class PayrollRunController {

    private final PayrollRunService payrollRunService;
    private final PayslipPdfService payslipPdfService;

    public PayrollRunController(PayrollRunService payrollRunService, PayslipPdfService payslipPdfService) {
        this.payrollRunService = payrollRunService;
        this.payslipPdfService = payslipPdfService;
    }

    @GetMapping
    public List<PayrollRunSummaryResponse> list() {
        return payrollRunService.list(CurrentUser.businessId());
    }

    @GetMapping("/{id}")
    public PayrollRunResponse get(@PathVariable Long id) {
        return payrollRunService.get(id, CurrentUser.businessId());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PayrollRunResponse create(@Valid @RequestBody CreatePayrollRunRequest request) {
        return payrollRunService.create(CurrentUser.businessId(), CurrentUser.userId(), request);
    }

    @PutMapping("/{runId}/items/{itemId}")
    public PayrollRunResponse adjustItem(
            @PathVariable Long runId, @PathVariable Long itemId, @Valid @RequestBody PayrollAdjustment adjustment) {
        return payrollRunService.adjustItem(runId, itemId, CurrentUser.businessId(), adjustment);
    }

    @PostMapping("/{id}/finalize")
    public PayrollRunResponse finalizeRun(@PathVariable Long id) {
        return payrollRunService.finalizeRun(id, CurrentUser.businessId());
    }

    @GetMapping("/{id}/payslip/{employeeId}")
    public PayslipResponse payslip(@PathVariable Long id, @PathVariable Long employeeId) {
        return payrollRunService.payslip(id, employeeId, CurrentUser.businessId());
    }

    @GetMapping("/{id}/payslip/{employeeId}/pdf")
    public ResponseEntity<byte[]> payslipPdf(@PathVariable Long id, @PathVariable Long employeeId) {
        PayslipResponse payslip = payrollRunService.payslip(id, employeeId, CurrentUser.businessId());
        byte[] pdf = payslipPdfService.render(payslip);
        String filename = "payslip-" + payslip.period().replace(" ", "-").toLowerCase()
                + "-" + payslip.employeeName().replace(" ", "-").toLowerCase() + ".pdf";
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(filename).build().toString())
                .body(pdf);
    }
}
