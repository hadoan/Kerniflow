import type { LocalizedToolText } from "../../../ai-copilot/application/ports/domain-tool.port";

export const cashManagementToolDescriptions = {
  prepare_cash_day_confirmation: {
    en: "Prepare a draft for a new cash day confirmation with proposed cash entries and actual counted balance. MUST only be called to generate a preview for user confirmation.",
    de: "Erstellt einen Entwurf für eine neue Kassenbestätigung mit vorgeschlagenen Kassenbucheinträgen und gezähltem Bestand. DARF NUR aufgerufen werden, um eine Vorschau zur Bestätigung durch den Benutzer zu generieren.",
    vi: "Chuẩn bị bản nháp xác nhận ngày tiền mặt mới với các giao dịch được đề xuất và số dư đếm thực tế. CHỈ ĐƯỢC gọi để tạo bản xem trước cho người dùng xác nhận.",
  },
  update_cash_entry: {
    en: "Update an open cash entry by reversing the old entry and creating a corrected replacement entry.",
    de: "Aktualisiert einen offenen Kassenbucheintrag, indem der alte Eintrag storniert und ein korrigierter Ersatzeintrag erstellt wird.",
    vi: "Cập nhật một giao dịch sổ quỹ đang mở bằng cách đảo giao dịch cũ và tạo giao dịch thay thế đã chỉnh sửa.",
  },
  list_cash_entries: {
    en: "List cash entries for a register with optional date and search filters.",
    de: "Listet Kassenbucheintraege fuer eine Kasse mit optionalen Datums- und Suchfiltern auf.",
    vi: "Liệt kê các giao dịch sổ quỹ của một két sắt với bộ lọc ngày và tìm kiếm tùy chọn.",
  },
  upload_receipt: {
    en: "Upload one or more receipt files from the latest user attachment or explicit base64 input.",
    de: "Laedt eine oder mehrere Belegdateien aus dem neuesten Nutzeranhang oder aus expliziter Base64-Eingabe hoch.",
    vi: "Tải lên một hoặc nhiều tệp hóa đơn từ tệp đính kèm mới nhất của người dùng hoặc từ dữ liệu base64 được cung cấp.",
  },
  attach_receipt_to_entry: {
    en: "Attach one or more uploaded receipt documents to a cash entry.",
    de: "Haengt einen oder mehrere hochgeladene Belege an einen Kassenbucheintrag an.",
    vi: "Gắn một hoặc nhiều chứng từ hóa đơn đã tải lên vào một giao dịch sổ quỹ.",
  },
  get_today_cash_status: {
    en: "Return today's cash status, expected balance, receipt gaps, and close readiness.",
    de: "Gibt den heutigen Kassenstatus, den erwarteten Bestand, fehlende Belege und die Abschlussbereitschaft zurueck.",
    vi: "Trả về trạng thái tiền mặt hôm nay, số dư dự kiến, các hóa đơn còn thiếu và mức độ sẵn sàng đóng ngày.",
  },
  confirm_cash_day_draft: {
    en: "Confirm a previously prepared cash day draft by atomically saving the proposed movements and submitting the counted cash.",
    de: "Bestätigt einen zuvor vorbereiteten Entwurf, indem die vorgeschlagenen Einträge und das gezählte Bargeld atomar gespeichert werden.",
    vi: "Xác nhận một bản nháp ngày tiền mặt đã chuẩn bị bằng cách lưu các giao dịch đề xuất và gửi số tiền đếm thực tế một cách đồng thời.",
  },
  close_cash_day: {
    en: "Close a cash day. MUST only be called AFTER user explicitly confirms the structured report preview.",
    de: "Schließt einen Kassentag. DARF NUR nach ausdrücklicher Bestätigung der Vorschau durch den Benutzer aufgerufen werden.",
    vi: "Đóng một ngày sổ quỹ. CHỈ ĐƯỢC gọi sau khi người dùng xác nhận rõ ràng bản xem trước báo cáo.",
  },
  list_unclosed_days: {
    en: "List days that are still open and block monthly export readiness.",
    de: "Listet Tage auf, die noch offen sind und den Monats-export blockieren.",
    vi: "Liệt kê những ngày vẫn chưa đóng và đang chặn việc sẵn sàng xuất báo cáo tháng.",
  },
  find_missing_receipts: {
    en: "Find entries that still require receipts before review or export.",
    de: "Findet Eintraege, fuer die vor Pruefung oder Export noch Belege fehlen.",
    vi: "Tìm các giao dịch vẫn cần hóa đơn trước khi kiểm tra hoặc xuất dữ liệu.",
  },
  generate_monthly_export: {
    en: "Generate the monthly cash export package for the tax advisor.",
    de: "Erzeugt das monatliche Kassenexport-Paket fuer den Steuerberater.",
    vi: "Tạo gói xuất dữ liệu sổ quỹ hằng tháng cho kế toán hoặc tư vấn thuế.",
  },
  get_dashboard_summary: {
    en: "Return the operational dashboard summary for cash, receipts, close status, and export readiness.",
    de: "Gibt eine operative Uebersicht zu Kasse, Belegen, Abschlussstatus und Exportbereitschaft zurueck.",
    vi: "Trả về tổng quan điều hành về tiền mặt, hóa đơn, trạng thái đóng ngày và mức độ sẵn sàng xuất dữ liệu.",
  },
  get_action_required: {
    en: "Return the next operational actions the owner should take.",
    de: "Gibt die naechsten operativen Schritte zurueck, die der Inhaber ausfuehren sollte.",
    vi: "Trả về các hành động vận hành tiếp theo mà chủ cửa hàng nên thực hiện.",
  },
  explain_cashbook_term: {
    en: "Explain common cash-book terms in plain language for salon owners.",
    de: "Erklaert uebliche Kassenbuch-Begriffe in einfacher Sprache fuer Saloninhaber.",
    vi: "Giải thích các thuật ngữ sổ quỹ phổ biến bằng ngôn ngữ dễ hiểu cho chủ salon.",
  },
  get_workflow_help: {
    en: "Explain the next steps for closing the day, fixing receipts, or preparing monthly export.",
    de: "Erklaert die naechsten Schritte fuer Tagesabschluss, Belegkorrekturen oder die Vorbereitung des Monats-exports.",
    vi: "Giải thích các bước tiếp theo để đóng ngày, xử lý hóa đơn hoặc chuẩn bị xuất dữ liệu tháng.",
  },
  get_cash_report_preview: {
    en: "Return a structured Kassenbericht preview. Use this to ask for user confirmation BEFORE closing or saving counts.",
    de: "Gibt eine strukturierte Kassenbericht-Vorschau zurück. Nutzen, um VOR dem Speichern von Zählungen oder dem Tagesabschluss um Bestätigung zu bitten.",
    vi: "Trả về bản xem trước Kassenbericht có cấu trúc. Sử dụng để yêu cầu xác nhận VÀO TRƯỚC KHI đóng hoặc lưu đếm tiền.",
  },
  get_monthly_cash_report: {
    en: "Return a structured monthly Kassenabrechnung. Use this to show a read-only monthly summary of closed cash days.",
    de: "Gibt eine strukturierte monatliche Kassenabrechnung zurück. Nutzen, um eine schreibgeschützte monatliche Zusammenfassung der abgeschlossenen Kassentage anzuzeigen.",
    vi: "Trả về báo cáo Kassenabrechnung hàng tháng có cấu trúc. Sử dụng để hiển thị tóm tắt báo cáo tháng chỉ đọc của các ngày sổ quỹ đã đóng.",
  },
  request_cash_clarification: {
    en: "Request clarification from the user when a material cash fact is ambiguous before proceeding.",
    de: "Bitte den Benutzer um Klärung, wenn eine wesentliche Kassenangabe unklar ist, bevor fortgefahren wird.",
    vi: "Yêu cầu người dùng làm rõ khi thông tin tiền mặt quan trọng chưa rõ ràng trước khi tiếp tục.",
  },
} satisfies Record<string, LocalizedToolText>;
