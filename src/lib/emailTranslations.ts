// Email translations for different languages
export type EmailTranslations = {
  subject: string;
  greeting: string;
  introText: string;
  closingText: string;
  buttonText: string;
  preparationTips: string[];
  invitationTitle: string;
  scheduledInterview: string;
  dateTime: string;
  duration: string;
  minutes: string;
  interviewDetails: string;
  position: string;
  company: string;
  level: string;
  interviewer: string;
  preparationTitle: string;
  thankYou: string;
  needHelp: string;
  contactUs: string;
  bestRegards: string;
  team: string;
};

export const EMAIL_TRANSLATIONS: Record<string, EmailTranslations> = {
  en: {
    subject: "Interview Invitation: {{jobTitle}}",
    greeting: "Hello,",
    introText:
      "You have been invited to participate in an interview for the {{jobTitle}} position.",
    closingText: "We look forward to speaking with you!",
    buttonText: "Join Interview →",
    preparationTips: [
      "Test your camera and microphone",
      "Find a quiet, well-lit space",
      "Ensure you have a stable internet connection",
      "Keep your resume handy for reference",
    ],
    invitationTitle: "Interview Invitation",
    scheduledInterview: "Scheduled Interview",
    dateTime: "Date & Time",
    duration: "Duration",
    minutes: "minutes",
    interviewDetails: "Interview Details",
    position: "Position",
    company: "Company",
    level: "Level",
    interviewer: "Interviewer",
    preparationTitle: "How to Prepare",
    thankYou: "Thank you for your interest in joining our team.",
    needHelp: "Need help?",
    contactUs: "Contact us",
    bestRegards: "Best regards",
    team: "Team",
  },
  es: {
    subject: "Invitación a Entrevista: {{jobTitle}}",
    greeting: "Hola,",
    introText:
      "Ha sido invitado a participar en una entrevista para el puesto de {{jobTitle}}.",
    closingText: "¡Esperamos hablar con usted!",
    buttonText: "Unirse a la Entrevista →",
    preparationTips: [
      "Pruebe su cámara y micrófono",
      "Encuentre un espacio silencioso y bien iluminado",
      "Asegúrese de tener una conexión a internet estable",
      "Tenga su currículum a mano para referencia",
    ],
    invitationTitle: "Invitación a Entrevista",
    scheduledInterview: "Entrevista Programada",
    dateTime: "Fecha y Hora",
    duration: "Duración",
    minutes: "minutos",
    interviewDetails: "Detalles de la Entrevista",
    position: "Puesto",
    company: "Empresa",
    level: "Nivel",
    interviewer: "Entrevistador",
    preparationTitle: "Cómo Prepararse",
    thankYou: "Gracias por su interés en unirse a nuestro equipo.",
    needHelp: "¿Necesita ayuda?",
    contactUs: "Contáctanos",
    bestRegards: "Saludos cordiales",
    team: "Equipo",
  },
  de: {
    subject: "Bewerbungseinladung: {{jobTitle}}",
    greeting: "Hallo,",
    introText:
      "Sie wurden zu einem Bewerbungsgespräch für die Position {{jobTitle}} eingeladen.",
    closingText: "Wir freuen uns darauf, mit Ihnen zu sprechen!",
    buttonText: "Zum Interview →",
    preparationTips: [
      "Testen Sie Ihre Kamera und Ihr Mikrofon",
      "Finden Sie einen ruhigen, gut beleuchteten Raum",
      "Stellen Sie sicher, dass Sie eine stabile Internetverbindung haben",
      "Halten Sie Ihren Lebenslauf zur Referenz bereit",
    ],
    invitationTitle: "Bewerbungseinladung",
    scheduledInterview: "Geplantes Interview",
    dateTime: "Datum & Uhrzeit",
    duration: "Dauer",
    minutes: "Minuten",
    interviewDetails: "Interview-Details",
    position: "Position",
    company: "Unternehmen",
    level: "Stufe",
    interviewer: "Interviewer",
    preparationTitle: "Vorbereitung",
    thankYou: "Vielen Dank für Ihr Interesse, unserem Team beizutreten.",
    needHelp: "Brauchen Sie Hilfe?",
    contactUs: "Kontaktieren Sie uns",
    bestRegards: "Mit freundlichen Grüßen",
    team: "Team",
  },
  fr: {
    subject: "Invitation d'entretien: {{jobTitle}}",
    greeting: "Bonjour,",
    introText:
      "Vous avez été invité à participer à un entretien pour le poste de {{jobTitle}}.",
    closingText: "Nous avons hâte de vous parler!",
    buttonText: "Rejoindre l'entretien →",
    preparationTips: [
      "Testez votre caméra et votre microphone",
      "Trouvez un espace calme et bien éclairé",
      "Assurez-vous d'avoir une connexion internet stable",
      "Gardez votre CV à portée de main pour référence",
    ],
    invitationTitle: "Invitation d'entretien",
    scheduledInterview: "Entretien programmé",
    dateTime: "Date et heure",
    duration: "Durée",
    minutes: "minutes",
    interviewDetails: "Détails de l'entretien",
    position: "Poste",
    company: "Entreprise",
    level: "Niveau",
    interviewer: "Intervieweur",
    preparationTitle: "Comment se préparer",
    thankYou: "Merci de votre intérêt à rejoindre notre équipe.",
    needHelp: "Besoin d'aide?",
    contactUs: "Contactez-nous",
    bestRegards: "Cordialement",
    team: "Équipe",
  },
  pt: {
    subject: "Convite para Entrevista: {{jobTitle}}",
    greeting: "Olá,",
    introText:
      "Você foi convidado a participar de uma entrevista para a posição de {{jobTitle}}.",
    closingText: "Esperamos falar com você!",
    buttonText: "Participar da Entrevista →",
    preparationTips: [
      "Teste sua câmera e microfone",
      "Encontre um espaço silencioso e bem iluminado",
      "Certifique-se de ter uma conexão de internet estável",
      "Mantenha seu currículo à mão para referência",
    ],
    invitationTitle: "Convite para Entrevista",
    scheduledInterview: "Entrevista Agendada",
    dateTime: "Data e Hora",
    duration: "Duração",
    minutes: "minutos",
    interviewDetails: "Detalhes da Entrevista",
    position: "Posição",
    company: "Empresa",
    level: "Nível",
    interviewer: "Entrevistador",
    preparationTitle: "Como se Preparar",
    thankYou: "Obrigado pelo seu interesse em se juntar à nossa equipe.",
    needHelp: "Precisa de ajuda?",
    contactUs: "Entre em contato",
    bestRegards: "Atenciosamente",
    team: "Equipe",
  },
  zh: {
    subject: "面试邀请：{{jobTitle}}职位",
    greeting: "您好，",
    introText: "您已被邀请参加{{jobTitle}}职位的面试。",
    closingText: "我们期待与您交谈！",
    buttonText: "参加面试 →",
    preparationTips: [
      "测试您的摄像头和麦克风",
      "找一个安静、光线充足的地方",
      "确保您有稳定的网络连接",
      "准备好您的简历以备参考",
    ],
    invitationTitle: "面试邀请",
    scheduledInterview: "预定面试",
    dateTime: "日期和时间",
    duration: "时长",
    minutes: "分钟",
    interviewDetails: "面试详情",
    position: "职位",
    company: "公司",
    level: "级别",
    interviewer: "面试官",
    preparationTitle: "如何准备",
    thankYou: "感谢您有兴趣加入我们的团队。",
    needHelp: "需要帮助？",
    contactUs: "联系我们",
    bestRegards: "此致敬礼",
    team: "团队",
  },
  ja: {
    subject: "面接のご案内：{{jobTitle}}ポジション",
    greeting: "こんにちは、",
    introText:
      "{{jobTitle}}ポジションの面接にご参加いただくよう招待されました。",
    closingText: "お話しできることを楽しみにしております！",
    buttonText: "面接に参加 →",
    preparationTips: [
      "カメラとマイクをテストしてください",
      "静かで明るい場所を見つけてください",
      "安定したインターネット接続があることを確認してください",
      "履歴書を手元に用意してください",
    ],
    invitationTitle: "面接のご案内",
    scheduledInterview: "予定された面接",
    dateTime: "日時",
    duration: "時間",
    minutes: "分",
    interviewDetails: "面接の詳細",
    position: "ポジション",
    company: "会社",
    level: "レベル",
    interviewer: "面接官",
    preparationTitle: "準備方法",
    thankYou: "チームへの参加にご興味をお持ちいただき、ありがとうございます。",
    needHelp: "サポートが必要ですか？",
    contactUs: "お問い合わせ",
    bestRegards: "敬具",
    team: "チーム",
  },
  ar: {
    subject: "دعوة للمقابلة: {{jobTitle}}",
    greeting: "مرحباً،",
    introText: "تمت دعوتك للمشاركة في مقابلة لمنصب {{jobTitle}}.",
    closingText: "نتطلع للحديث معك!",
    buttonText: "انضم للمقابلة ←",
    preparationTips: [
      "اختبر الكاميرا والميكروفون",
      "اعثر على مكان هادئ ومضاء جيداً",
      "تأكد من وجود اتصال إنترنت مستقر",
      "احتفظ بسيرتك الذاتية في متناول اليد للمرجع",
    ],
    invitationTitle: "دعوة للمقابلة",
    scheduledInterview: "المقابلة المجدولة",
    dateTime: "التاريخ والوقت",
    duration: "المدة",
    minutes: "دقائق",
    interviewDetails: "تفاصيل المقابلة",
    position: "المنصب",
    company: "الشركة",
    level: "المستوى",
    interviewer: "المقابل",
    preparationTitle: "كيفية التحضير",
    thankYou: "شكراً لاهتمامك بالانضمام إلى فريقنا.",
    needHelp: "تحتاج مساعدة؟",
    contactUs: "اتصل بنا",
    bestRegards: "أطيب التحيات",
    team: "الفريق",
  },
};

/**
 * Get email translations for a specific language
 * Falls back to English if language is not supported
 */
export function getEmailTranslations(language: string): EmailTranslations {
  // Map locale codes to language codes
  const langMap: Record<string, string> = {
    inen: "en",
    ines: "es",
    inde: "de",
    infr: "fr",
    inpt: "pt",
    inch: "zh",
    inja: "ja",
    inar: "ar",
  };

  const mappedLang = langMap[language] || language;
  return EMAIL_TRANSLATIONS[mappedLang] || EMAIL_TRANSLATIONS.en;
}

/**
 * Replace template variables in email content
 */
export function replaceEmailVariables(
  template: string,
  variables: Record<string, string>
): string {
  let result = template;
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
    result = result.replace(regex, value);
  });
  return result;
}
