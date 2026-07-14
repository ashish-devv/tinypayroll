package com.tinypayroll.backend.report;

import com.tinypayroll.backend.attendance.dto.AttendanceSummaryResponse;
import com.tinypayroll.backend.business.BusinessService;
import com.tinypayroll.backend.business.dto.BusinessResponse;
import com.tinypayroll.backend.report.dto.ExpenseSummaryResponse;
import com.tinypayroll.backend.security.CurrentUser;
import java.time.LocalDate;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/reports")
public class ReportController {

    private final ReportService reportService;
    private final ReportPdfService reportPdfService;
    private final BusinessService businessService;

    public ReportController(ReportService reportService, ReportPdfService reportPdfService, BusinessService businessService) {
        this.reportService = reportService;
        this.reportPdfService = reportPdfService;
        this.businessService = businessService;
    }

    @GetMapping("/expense-summary")
    public ExpenseSummaryResponse expenseSummary(@RequestParam LocalDate from, @RequestParam LocalDate to) {
        return reportService.expenseSummary(CurrentUser.businessId(), from, to);
    }

    @GetMapping("/attendance-summary")
    public AttendanceSummaryResponse attendanceSummary(@RequestParam int month, @RequestParam int year) {
        return reportService.attendanceSummary(CurrentUser.businessId(), month, year);
    }

    /** type=csv and type=pdf are both implemented — anything else 400s with a clear message. */
    @GetMapping("/export")
    public ResponseEntity<?> export(
            @RequestParam String type, @RequestParam LocalDate from, @RequestParam LocalDate to) {
        if ("pdf".equalsIgnoreCase(type)) {
            Long businessId = CurrentUser.businessId();
            BusinessResponse business = businessService.getCurrent(businessId);
            ExpenseSummaryResponse summary = reportService.expenseSummary(businessId, from, to);
            byte[] pdf = reportPdfService.render(business, summary);
            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_PDF)
                    .header(
                            HttpHeaders.CONTENT_DISPOSITION,
                            ContentDisposition.attachment().filename("payroll-summary.pdf").build().toString())
                    .body(pdf);
        }
        if (!"csv".equalsIgnoreCase(type)) {
            return ResponseEntity.badRequest().body("Unsupported export type '" + type + "' — only 'csv' and 'pdf' are available.");
        }
        String csv = reportService.expenseSummaryCsv(CurrentUser.businessId(), from, to);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("text/csv"))
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename("expense-summary.csv").build().toString())
                .body(csv);
    }
}
