package com.tinypayroll.backend.payroll;

import com.openhtmltopdf.pdfboxout.PdfRendererBuilder;
import com.tinypayroll.backend.payroll.dto.PayslipResponse;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import org.springframework.stereotype.Service;

/** Renders a {@link PayslipResponse} to PDF bytes — mirrors the sections shown in app/payroll/payslip.tsx. */
@Service
public class PayslipPdfService {

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("d MMM yyyy", Locale.ENGLISH);

    public byte[] render(PayslipResponse payslip) {
        String html = buildHtml(payslip);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        PdfRendererBuilder builder = new PdfRendererBuilder();
        builder.useFastMode();
        builder.withHtmlContent(html, null);
        builder.toStream(out);
        try {
            builder.run();
        } catch (Exception e) {
            throw new IllegalStateException("Failed to render payslip PDF", e);
        }
        return out.toByteArray();
    }

    private String buildHtml(PayslipResponse p) {
        String currency = p.currencySymbol() == null ? "" : p.currencySymbol();
        StringBuilder deductionsRows = new StringBuilder();
        appendRowIfPositive(deductionsRows, "Unpaid Leave", p.unpaidLeave(), currency);
        appendRowIfPositive(deductionsRows, "Advance", p.advances(), currency);
        appendRowIfPositive(deductionsRows, "Other Deductions", p.deductions(), currency);
        BigDecimal totalDeductions = sum(p.unpaidLeave(), p.advances(), p.deductions());

        StringBuilder earningsRows = new StringBuilder();
        appendRow(earningsRows, "Base Salary", p.baseSalary(), currency);
        appendRowIfPositive(earningsRows, "Overtime", p.overtime(), currency);
        appendRowIfPositive(earningsRows, "Bonus", p.bonus(), currency);
        BigDecimal totalEarnings = sum(p.baseSalary(), p.overtime(), p.bonus());

        String slipNumber = "PS-" + (p.runDate() == null ? "0000" : p.runDate().format(DateTimeFormatter.ofPattern("yyyyMM"))) + "-" + p.employeeId();

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

                  .meta-grid { display: flex; justify-content: space-between; margin-bottom: 26px; }
                  .meta-block { width: 48%%; }
                  .meta-label { font-size: 9.5px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.8px; color: #9aa0b4; margin-bottom: 6px; }
                  .meta-primary { font-size: 14px; font-weight: bold; color: #1a1f2c; margin-bottom: 2px; }
                  .meta-secondary { font-size: 11px; color: #6b6f7d; }

                  .section-title { font-size: 9.5px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.8px; color: #9aa0b4; margin: 0 0 10px; }

                  table.lines { width: 100%%; border-collapse: collapse; margin-bottom: 22px; }
                  table.lines th { text-align: left; font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.6px; color: #9aa0b4; font-weight: bold; padding: 0 0 8px; border-bottom: 1.5px solid #1a1f2c; }
                  table.lines th.value { text-align: right; }
                  table.lines td { padding: 9px 0; font-size: 12px; border-bottom: 1px solid #e6e8ef; color: #1a2233; }
                  table.lines td.value { text-align: right; font-family: Courier, monospace; }
                  table.lines td.neg { color: #c0392b; }
                  table.lines tr.total td { border-bottom: none; border-top: 1.5px solid #1a1f2c; font-weight: bold; padding-top: 10px; }

                  .columns { display: flex; gap: 24px; margin-bottom: 6px; }
                  .col { width: 50%%; }

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
                        <div class="doc-label">PAYSLIP</div>
                        <div class="doc-meta">%s<br/>Ref&#160;%s</div>
                      </div>
                    </div>

                    <div class="meta-grid">
                      <div class="meta-block">
                        <div class="meta-label">Employee</div>
                        <div class="meta-primary">%s</div>
                        <div class="meta-secondary">%s</div>
                      </div>
                      <div class="meta-block" style="text-align:right;">
                        <div class="meta-label">Pay Period</div>
                        <div class="meta-primary">%s</div>
                        <div class="meta-secondary">Paid&#160;%s</div>
                      </div>
                    </div>

                    <div class="columns">
                      <div class="col">
                        <div class="section-title">Earnings</div>
                        <table class="lines">
                          <tr><th>Description</th><th class="value">Amount</th></tr>
                          %s
                          <tr class="total"><td>Gross Earnings</td><td class="value">%s%s</td></tr>
                        </table>
                      </div>
                      <div class="col">
                        <div class="section-title">Deductions</div>
                        <table class="lines">
                          <tr><th>Description</th><th class="value">Amount</th></tr>
                          %s
                          <tr class="total"><td>Total Deductions</td><td class="value">%s%s</td></tr>
                        </table>
                      </div>
                    </div>

                    <div class="netbox">
                      <div>
                        <div class="label">Net Payable</div>
                        <div class="sublabel">Gross earnings less total deductions</div>
                      </div>
                      <div class="amount">%s%s</div>
                    </div>

                    <div class="footer">
                      <div class="footer-note">This is a system-generated payslip and does not require a signature.<br/>For queries regarding this payslip, please contact your HR / payroll administrator.</div>
                      <div class="footer-stamp">Generated by TinyPayroll<br/>%s</div>
                    </div>

                  </div>
                </body>
                </html>
                """
                .formatted(
                        escape(p.companyName()),
                        escape(p.companyAddress() == null ? "" : p.companyAddress()),
                        escape(p.period()),
                        escape(slipNumber),
                        escape(p.employeeName()),
                        escape(p.employeeRole() == null ? "" : p.employeeRole()),
                        escape(p.period()),
                        p.runDate() == null ? "&#8212;" : p.runDate().format(DATE_FMT),
                        earningsRows,
                        currency,
                        format(totalEarnings),
                        deductionsRows.isEmpty()
                                ? "<tr><td class=\"meta-secondary\">No deductions</td><td class=\"value\">&#8212;</td></tr>"
                                : deductionsRows.toString(),
                        currency,
                        format(totalDeductions),
                        currency,
                        format(p.finalSalary()),
                        LocalDate.now().format(DATE_FMT));
    }

    private void appendRow(StringBuilder sb, String label, BigDecimal value, String currency) {
        sb.append("<tr><td>").append(escape(label)).append("</td><td class=\"value\">")
                .append(currency).append(format(value)).append("</td></tr>");
    }

    private void appendRowIfPositive(StringBuilder sb, String label, BigDecimal value, String currency) {
        if (value != null && value.signum() > 0) {
            sb.append("<tr><td>").append(escape(label)).append("</td><td class=\"value neg\">&#8722;")
                    .append(currency).append(format(value)).append("</td></tr>");
        }
    }

    private BigDecimal sum(BigDecimal... values) {
        BigDecimal total = BigDecimal.ZERO;
        for (BigDecimal v : values) {
            if (v != null) {
                total = total.add(v);
            }
        }
        return total;
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
