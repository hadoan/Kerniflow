import type { OnboardingJourneyConfig } from "@corely/contracts";

export const CASH_MANAGEMENT_JOURNEY: OnboardingJourneyConfig = {
  moduleKey: "cash-management",
  journeyKey: "cash-management-v1",
  title: {
    en: "Set up Cash Management",
    de: "Kassenbuch einrichten",
    vi: "Thiết lập Sổ Quỹ",
  },
  description: {
    en: "Get your digital cash register ready for daily use.",
    de: "Richten Sie Ihre digitale Kasse für den täglichen Gebrauch ein.",
    vi: "Chuẩn bị sổ quỹ điện tử cho việc sử dụng hàng ngày.",
  },
  supportedLocales: ["en", "de", "vi"],
  defaultLocale: "en",
  checklistItems: [
    {
      id: "business-setup",
      stepId: "business-basics",
      label: {
        en: "Add business details",
        de: "Unternehmensdetails hinzufügen",
        vi: "Thêm thông tin doanh nghiệp",
      },
    },
    {
      id: "opening-balance",
      stepId: "opening-balance",
      label: {
        en: "Set opening balance",
        de: "Anfangsbestand setzen",
        vi: "Đặt số dư ban đầu",
      },
      deepLinkRoute: "/onboarding/cash-management/resume",
    },
    {
      id: "first-entries",
      stepId: "first-entries",
      label: {
        en: "Add first cash entry",
        de: "Ersten Kasseneintrag hinzufügen",
        vi: "Thêm giao dịch tiền mặt đầu tiên",
      },
      deepLinkRoute: "/onboarding/cash-management/resume",
    },
    {
      id: "first-receipt",
      stepId: "first-receipt",
      optional: true,
      label: {
        en: "Attach first receipt",
        de: "Ersten Beleg anhängen",
        vi: "Đính kèm biên lai đầu tiên",
      },
      deepLinkRoute: "/onboarding/cash-management/resume",
    },
    {
      id: "today-status",
      stepIds: ["today-status", "daily-closing"],
      label: {
        en: "Review today's cash & close",
        de: "heutigen Kassenstand prüfen & abschließen",
        vi: "Kiểm tra sổ quỹ hôm nay & đóng ca",
      },
      deepLinkRoute: "/onboarding/cash-management/resume",
    },
  ],
  steps: [
    {
      id: "welcome",
      type: "welcome",
      title: {
        en: "Welcome to Cash Management",
        de: "Willkommen beim Kassenbuch",
        vi: "Chào mừng đến với Sổ Quỹ",
      },
      description: {
        en: "Let's ditch the notebook. We'll set up your digital register and show you how easy it is to track your cash daily.",
        de: "Schluss mit dem Notizbuch. Wir richten Ihre digitale Kasse ein und zeigen Ihnen, wie einfach tägliches Kassieren sein kann.",
        vi: "Hãy quên sổ tay đi. Chúng tôi sẽ thiết lập sổ quỹ điện tử và chỉ cho bạn cách theo dõi tiền mặt hàng ngày một cách dễ dàng.",
      },
      ctaLabel: {
        en: "Let's go",
        de: "Los geht's",
        vi: "Bắt đầu nào",
      },
      skippable: false,
      optional: false,
      completionCondition: "explicit",
    },
    {
      id: "language",
      type: "language",
      title: {
        en: "Choose your language",
        de: "Wählen Sie Ihre Sprache",
        vi: "Chọn ngôn ngữ của bạn",
      },
      description: {
        en: "You can easily invite staff and let them use the app in their preferred language.",
        de: "Sie können ganz einfach Mitarbeiter einladen und die App in deren bevorzugter Sprache nutzen lassen.",
        vi: "Bạn có thể dễ dàng mời nhân viên và để họ sử dụng ứng dụng bằng ngôn ngữ họ thích.",
      },
      skippable: false,
      optional: false,
      completionCondition: "explicit",
    },
    {
      id: "business-basics",
      type: "business-basics",
      title: {
        en: "About your business",
        de: "Über Ihr Unternehmen",
        vi: "Về doanh nghiệp của bạn",
      },
      description: {
        en: "We need a few details to configure your register correctly and generate compliant export reports later.",
        de: "Wir benötigen ein paar Details, um Ihre Kasse richtig zu konfigurieren und später konforme Exportberichte zu erstellen.",
        vi: "Chúng tôi cần một vài thông tin để cấu hình sổ quỹ của bạn chính xác và tạo báo cáo xuất khẩu tuân thủ sau này.",
      },
      skippable: false,
      optional: false,
      completionCondition: "explicit",
    },
    {
      id: "workflow-source",
      type: "workflow-source",
      title: {
        en: "How do you track cash today?",
        de: "Wie verfolgen Sie Bargeld heute?",
        vi: "Bạn theo dõi tiền mặt hiện nay như thế nào?",
      },
      description: {
        en: "This helps us personalize your setup.",
        de: "Dies hilft uns, Ihre Einrichtung zu personalisieren.",
        vi: "Điều này giúp chúng tôi cá nhân hóa thiết lập của bạn.",
      },
      skippable: true,
      optional: true,
      completionCondition: "explicit",
    },
    {
      id: "opening-balance",
      type: "opening-balance",
      title: {
        en: "How much cash do you have right now?",
        de: "Wie hoch ist Ihr aktueller Kassenbestand?",
        vi: "Số dư tiền mặt hiện tại của bạn là bao nhiêu?",
      },
      description: {
        en: "To start tracking, input the total physical cash belonging to this business cash fund, including cash in the drawer or safety box.",
        de: "Geben Sie zum Start den gesamten physischen Bargeldbestand dieser Geschäftskasse ein, einschließlich Bargeld in Schublade oder Tresor.",
        vi: "Để bắt đầu theo dõi, hãy nhập tổng tiền mặt thực tế thuộc cùng quỹ của tiệm, gồm tiền trong ngăn kéo hoặc két sắt.",
      },
      skippable: false,
      optional: false,
      completionCondition: "explicit",
      aiHelpContext:
        "Explain what an 'opening balance' or 'float' is, and why it's important to only count physical cash (coins and bills) and not card machine totals for a cash register.",
    },
    {
      id: "first-entries",
      type: "first-entries",
      title: {
        en: "Let's log a cash transaction",
        de: "Protokollieren wir eine Transaktion",
        vi: "Hãy ghi lại một giao dịch",
      },
      description: {
        en: "You paid for coffee supplies or made a cash sale? Add it here. This will adjust your expected cash balance instantly.",
        de: "Sie haben Kaffeebedarf bezahlt oder einen Barverkauf getätigt? Fügen Sie ihn hier hinzu. Dadurch wird Ihr erwarteter Kassenstatus sofort angepasst.",
        vi: "Bạn vừa chi tiền mua vật tư hoặc bán hàng bằng tiền mặt? Hãy thêm giao dịch đó tại đây. Số dư tiền mặt dự kiến sẽ được cập nhật ngay lập tức.",
      },
      skippable: false,
      optional: false,
      completionCondition: "explicit",
      aiHelpContext:
        "Help me classify whether an 'income' or 'expense' is appropriate, and give 2 short examples of each for a typical small retail or service business.",
    },
    {
      id: "first-receipt",
      type: "first-receipt",
      nextStepId: "today-status",
      title: {
        en: "Attach a receipt (Optional)",
        de: "Beleg anhängen (Optional)",
        vi: "Đính kèm biên lai (Tùy chọn)",
      },
      description: {
        en: "For expenses, your accountant will eventually need the receipt. Snap a photo or upload it so you don't lose the paper.",
        de: "Bei Ausgaben benötigt Ihr Buchhalter letztendlich den Beleg. Machen Sie ein Foto oder laden Sie ihn hoch, damit Sie das Papier nicht verlieren.",
        vi: "Đối với các khoản chi phí, kế toán của bạn sẽ cuối cùng cần biên lai. Hãy chụp ảnh hoặc tải lên để bạn không làm mất giấy.",
      },
      skippable: true,
      optional: true,
      completionCondition: "explicit",
    },
    {
      id: "today-status",
      type: "today-status",
      title: {
        en: "Your cash status, simplified",
        de: "Ihr Kassenstand, vereinfacht",
        vi: "Tình trạng sổ quỹ của bạn, đơn giản hóa",
      },
      description: {
        en: "Here is your expected balance. Count all cash belonging to this business cash fund, including cash outside the drawer, and compare it with this number.",
        de: "Hier ist Ihr erwarteter Bestand. Zählen Sie das gesamte Bargeld dieser Geschäftskasse, auch außerhalb der Schublade, und vergleichen Sie es mit diesem Betrag.",
        vi: "Đây là số dư dự kiến. Hãy đếm toàn bộ tiền thuộc cùng quỹ, kể cả tiền ngoài ngăn kéo, rồi so sánh với con số này.",
      },
      skippable: false,
      optional: false,
      completionCondition: "explicit",
      isFirstValueMilestone: true,
    },
    {
      id: "daily-closing",
      type: "daily-closing",
      title: {
        en: "Closing the day",
        de: "Den Tag abschließen",
        vi: "Đóng ca hàng ngày",
      },
      description: {
        en: "At the end of your shift, you 'Close' the register. This locks your entries and prepares a clean slate for tomorrow.",
        de: "Am Ende Ihrer Schicht 'schließen' Sie die Kasse. Dies sperrt Ihre Eingaben und bereitet einen sauberen Start für morgen vor.",
        vi: "Vào cuối ca làm việc, bạn 'Đóng' sổ. Điều này khóa các giao dịch của bạn và chuẩn bị một khởi đầu mới cho ngày mai.",
      },
      ctaLabel: {
        en: "Try closing demo",
        de: "Tagesabschluss testen",
        vi: "Thử đóng ca mẫu",
      },
      skippable: true,
      optional: true,
      completionCondition: "explicit",
      aiHelpContext:
        "Explain 'daily closing' (Z-report concept). Why is it important to close the register every day?",
      isFirstCloseMilestone: true, // Optimistically assuming they understand it
    },
    {
      id: "post-value",
      type: "post-value",
      title: {
        en: "You're ready to go!",
        de: "Sie sind startklar!",
        vi: "Bạn đã sẵn sàng!",
      },
      description: {
        en: "Your cash register is set up. You can go to the dashboard now, or explore some optional steps like inviting your team.",
        de: "Ihre Kasse ist eingerichtet. Sie können nun zum Dashboard gehen oder einige optionale Schritte wie die Einladung Ihres Teams erkunden.",
        vi: "Sổ quỹ của bạn đã được thiết lập. Bạn có thể đến bảng điều khiển ngay bây giờ hoặc khám phá một số bước tùy chọn như mời nhóm của bạn.",
      },
      skippable: true,
      optional: true,
      completionCondition: "explicit",
    },
  ],
};
