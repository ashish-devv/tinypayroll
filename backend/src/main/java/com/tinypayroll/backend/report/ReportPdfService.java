package com.tinypayroll.backend.report;

import com.openhtmltopdf.pdfboxout.PdfRendererBuilder;
import com.tinypayroll.backend.business.dto.BusinessResponse;
import com.tinypayroll.backend.report.dto.ExpenseSummaryResponse;
import com.tinypayroll.backend.report.dto.ExpenseSummaryResponse.PeriodExpense;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import org.springframework.stereotype.Service;

/** Renders an {@link ExpenseSummaryResponse} to PDF bytes — same letterhead style as {@link com.tinypayroll.backend.payroll.PayslipPdfService}. */
@Service
public class ReportPdfService {

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("d MMM yyyy", Locale.ENGLISH);

    public byte[] render(BusinessResponse business, ExpenseSummaryResponse summary) {
        String html = buildHtml(business, summary);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        PdfRendererBuilder builder = new PdfRendererBuilder();
        builder.useFastMode();
        builder.withHtmlContent(html, null);
        builder.toStream(out);
        try {
            builder.run();
        } catch (Exception e) {
            throw new IllegalStateException("Failed to render report PDF", e);
        }
        return out.toByteArray();
    }

    private String buildHtml(BusinessResponse business, ExpenseSummaryResponse summary) {
        String currency = business.currencySymbol() == null ? "" : business.currencySymbol();

        StringBuilder rows = new StringBuilder();
        for (PeriodExpense period : summary.periods()) {
            rows.append("<tr><td>")
                    .append(escape(period.period()))
                    .append("</td><td>")
                    .append(period.runDate() == null ? "&#8212;" : period.runDate().format(DATE_FMT))
                    .append("</td><td>")
                    .append(statusBadge(period.status()))
                    .append("</td><td class=\"value\">")
                    .append(currency)
                    .append(format(period.totalAmount()))
                    .append("</td></tr>");
        }
        if (summary.periods().isEmpty()) {
            rows.append("<tr><td colspan=\"4\" class=\"meta-secondary\">No payroll runs in this range</td></tr>");
        }

        BigDecimal avg = summary.periods().isEmpty()
                ? BigDecimal.ZERO
                : summary.totalAmount().divide(BigDecimal.valueOf(summary.periods().size()), 2, java.math.RoundingMode.HALF_UP);

        return """
                <html>
                <head>
                <style>
                  @page { margin: 0; }
                  * { box-sizing: border-box; }
                  body { font-family: Helvetica, Arial, sans-serif; color: #1a2233; margin: 0; padding: 0; font-size: 12px; }

                  .sheet { padding: 40px 44px 32px; }

                  .brandbar { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1a1f2c; padding-bottom: 18px; margin-bottom: 24px; }
                  .brand-name { font-size: 20px; font-weight: bold; color: #1a1f2c; margin: 0 0 3px; letter-spacing: 0.2px; }
                  .brand-address { font-size: 10.5px; color: #6b6f7d; line-height: 1.5; }
                  .doc-label { font-size: 11px; font-weight: bold; letter-spacing: 1.5px; color: #d4af37; text-align: right; margin: 0 0 4px; }
                  .doc-meta { font-size: 10.5px; color: #6b6f7d; text-align: right; line-height: 1.6; }

                  .stats { display: flex; gap: 16px; margin-bottom: 26px; }
                  .stat { flex: 1; border: 1px solid #e6e8ef; border-radius: 10px; padding: 14px 16px; }
                  .stat-label { font-size: 9.5px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.8px; color: #9aa0b4; margin-bottom: 6px; }
                  .stat-value { font-size: 17px; font-weight: bold; color: #1a1f2c; font-family: Courier, monospace; }

                  .section-title { font-size: 9.5px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.8px; color: #9aa0b4; margin: 0 0 10px; }

                  table.lines { width: 100%%; border-collapse: collapse; margin-bottom: 22px; }
                  table.lines th { text-align: left; font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.6px; color: #9aa0b4; font-weight: bold; padding: 0 0 8px; border-bottom: 1.5px solid #1a1f2c; }
                  table.lines th.value { text-align: right; }
                  table.lines td { padding: 10px 0; font-size: 12px; border-bottom: 1px solid #e6e8ef; color: #1a2233; }
                  table.lines td.value { text-align: right; font-family: Courier, monospace; }
                  table.lines td.meta-secondary { color: #9aa0b4; text-align: center; padding: 20px 0; }

                  .badge { display: inline-block; border-radius: 9999px; padding: 3px 9px; font-size: 9.5px; font-weight: bold; letter-spacing: 0.4px; }
                  .badge-paid { background: #dcfce7; color: #15803d; }
                  .badge-pending { background: #fef9c3; color: #92400e; }
                  .badge-failed { background: #fee2e2; color: #dc2626; }
                  .badge-draft { background: #e6e8ef; color: #6b6f7d; }

                  .netbox { background: #1a1f2c; border-radius: 10px; padding: 22px 26px; margin-top: 8px; display: flex; justify-content: space-between; align-items: center; }
                  .netbox .label { font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #b8bcc9; }
                  .netbox .sublabel { font-size: 9.5px; color: #7d8296; margin-top: 3px; }
                  .netbox .amount { font-size: 26px; font-weight: bold; color: #d4af37; font-family: Courier, monospace; }

                  .footer { margin-top: 34px; padding-top: 14px; border-top: 1px solid #e6e8ef; display: flex; justify-content: space-between; }
                  .footer-note { font-size: 9px; color: #9aa0b4; line-height: 1.6; width: 60%%; }
                  .footer-stamp { font-size: 9px; color: #9aa0b4; text-align: right; }
                </style>
                </head>
                <body>
                  <div class="sheet">

                    <div class="brandbar">
                      <div>
                        <div class="brand-name">%s</div>
                        <div class="brand-address">%s</div>
                      </div>
                      <div>
                        <div class="doc-label">PAYROLL SUMMARY REPORT</div>
                        <div class="doc-meta">%s &#8211; %s</div>
                      </div>
                    </div>

                    <div class="stats">
                      <div class="stat">
                        <div class="stat-label">Total Spend</div>
                        <div class="stat-value">%s%s</div>
                      </div>
                      <div class="stat">
                        <div class="stat-label">Pay Periods</div>
                        <div class="stat-value">%s</div>
                      </div>
                      <div class="stat">
                        <div class="stat-label">Avg / Period</div>
                        <div class="stat-value">%s%s</div>
                      </div>
                    </div>

                    <div class="section-title">Payroll Runs</div>
                    <table class="lines">
                      <tr><th>Period</th><th>Run Date</th><th>Status</th><th class="value">Amount</th></tr>
                      %s
                    </table>

                    <div class="netbox">
                      <div>
                        <div class="label">Total Payroll Spend</div>
                        <div class="sublabel">Across %s pay period(s) in range</div>
                      </div>
                      <div class="amount">%s%s</div>
                    </div>

                    <div class="footer">
                      <div class="footer-note">This is a system-generated report and does not require a signature.<br/>For queries regarding this report, please contact your payroll administrator.</div>
                      <div class="footer-stamp">Generated by TinyPayroll<br/>%s</div>
                    </div>

                  </div>
                </body>
                </html>
                """
                .formatted(
                        escape(business.companyName()),
                        escape(business.address() == null ? "" : business.address()),
                        summary.from().format(DATE_FMT),
                        summary.to().format(DATE_FMT),
                        currency,
                        format(summary.totalAmount()),
                        summary.periods().size(),
                        currency,
                        format(avg),
                        rows,
                        summary.periods().size(),
                        currency,
                        format(summary.totalAmount()),
                        LocalDate.now().format(DATE_FMT));
    }

    private String statusBadge(String status) {
        String cls = switch (status) {
            case "PAID" -> "badge-paid";
            case "PENDING" -> "badge-pending";
            case "FAILED" -> "badge-failed";
            default -> "badge-draft";
        };
        return "<span class=\"badge " + cls + "\">" + escape(status) + "</span>";
    }

    private String format(BigDecimal value) {
        return value == null ? "0" : value.toPlainString();
    }

    private String escape(String s) {
        return s == null
                ? ""
                : s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }
}
