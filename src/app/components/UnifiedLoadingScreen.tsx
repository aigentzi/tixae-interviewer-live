import React, { useMemo } from "react";
import { motion } from "framer-motion";

interface UnifiedLoadingScreenProps {
  stage: "authenticating" | "workspace" | "dashboard" | "general";
  message?: string;
}

// Translation mappings for different languages
const TRANSLATIONS = {
  en: {
    authenticating: {
      title: "Signing you in",
      description: "Verifying your credentials and setting up your session",
    },
    workspace: {
      title: "Setting up your workspace",
      description:
        "Creating your personal workspace and configuring everything you need",
    },
    dashboard: {
      title: "Loading your dashboard",
      description: "Fetching your interviews, profiles, and workspace data",
    },
    general: {
      title: "Loading",
      description: "Please wait while we prepare everything for you",
    },
    waitMessage: "This won't take long",
  },
  es: {
    authenticating: {
      title: "Iniciando sesión",
      description: "Verificando sus credenciales y configurando su sesión",
    },
    workspace: {
      title: "Configurando su espacio de trabajo",
      description:
        "Creando su espacio de trabajo personal y configurando todo lo que necesita",
    },
    dashboard: {
      title: "Cargando su panel",
      description:
        "Obteniendo sus entrevistas, perfiles y datos del espacio de trabajo",
    },
    general: {
      title: "Cargando",
      description: "Por favor espere mientras preparamos todo para usted",
    },
    waitMessage: "Esto no tomará mucho tiempo",
  },
  de: {
    authenticating: {
      title: "Anmeldung läuft",
      description:
        "Überprüfung Ihrer Anmeldedaten und Einrichtung Ihrer Sitzung",
    },
    workspace: {
      title: "Arbeitsbereich wird eingerichtet",
      description:
        "Erstellen Ihres persönlichen Arbeitsbereichs und Konfiguration aller benötigten Elemente",
    },
    dashboard: {
      title: "Dashboard wird geladen",
      description: "Abrufen Ihrer Interviews, Profile und Arbeitsbereichsdaten",
    },
    general: {
      title: "Lädt",
      description: "Bitte warten Sie, während wir alles für Sie vorbereiten",
    },
    waitMessage: "Das dauert nicht lange",
  },
  fr: {
    authenticating: {
      title: "Connexion en cours",
      description:
        "Vérification de vos identifiants et configuration de votre session",
    },
    workspace: {
      title: "Configuration de votre espace de travail",
      description:
        "Création de votre espace de travail personnel et configuration de tout ce dont vous avez besoin",
    },
    dashboard: {
      title: "Chargement de votre tableau de bord",
      description:
        "Récupération de vos entretiens, profils et données d'espace de travail",
    },
    general: {
      title: "Chargement",
      description:
        "Veuillez patienter pendant que nous préparons tout pour vous",
    },
    waitMessage: "Cela ne prendra pas longtemps",
  },
  pt: {
    authenticating: {
      title: "Fazendo login",
      description: "Verificando suas credenciais e configurando sua sessão",
    },
    workspace: {
      title: "Configurando seu espaço de trabalho",
      description:
        "Criando seu espaço de trabalho pessoal e configurando tudo que você precisa",
    },
    dashboard: {
      title: "Carregando seu painel",
      description:
        "Buscando suas entrevistas, perfis e dados do espaço de trabalho",
    },
    general: {
      title: "Carregando",
      description: "Por favor aguarde enquanto preparamos tudo para você",
    },
    waitMessage: "Isso não vai demorar muito",
  },
  zh: {
    authenticating: {
      title: "正在登录",
      description: "验证您的凭据并设置您的会话",
    },
    workspace: {
      title: "设置您的工作区",
      description: "创建您的个人工作区并配置您需要的一切",
    },
    dashboard: {
      title: "加载您的仪表板",
      description: "获取您的面试、档案和工作区数据",
    },
    general: {
      title: "加载中",
      description: "请稍候，我们正在为您准备一切",
    },
    waitMessage: "这不会花费很长时间",
  },
  ja: {
    authenticating: {
      title: "サインイン中",
      description: "認証情報を確認し、セッションを設定しています",
    },
    workspace: {
      title: "ワークスペースを設定中",
      description:
        "個人ワークスペースを作成し、必要なものをすべて設定しています",
    },
    dashboard: {
      title: "ダッシュボードを読み込み中",
      description: "面接、プロファイル、ワークスペースデータを取得しています",
    },
    general: {
      title: "読み込み中",
      description: "すべてを準備しておりますので、少々お待ちください",
    },
    waitMessage: "少々お待ちください",
  },
  ar: {
    authenticating: {
      title: "جاري تسجيل الدخول",
      description: "التحقق من بيانات اعتمادك وإعداد جلستك",
    },
    workspace: {
      title: "إعداد مساحة العمل",
      description: "إنشاء مساحة العمل الشخصية وتكوين كل ما تحتاجه",
    },
    dashboard: {
      title: "تحميل لوحة التحكم",
      description: "جلب المقابلات والملفات الشخصية وبيانات مساحة العمل",
    },
    general: {
      title: "جاري التحميل",
      description: "يرجى الانتظار بينما نجهز كل شيء لك",
    },
    waitMessage: "لن يستغرق هذا وقتاً طويلاً",
  },
} as const;

// Function to detect browser language and map to supported language codes
const detectBrowserLanguage = (): keyof typeof TRANSLATIONS => {
  if (typeof window === "undefined") return "en";

  const browserLang = navigator.language || navigator.languages?.[0] || "en";
  const langCode = browserLang.toLowerCase().split("-")[0];

  // Map browser language codes to our supported languages
  const langMap: Record<string, keyof typeof TRANSLATIONS> = {
    en: "en",
    es: "es",
    de: "de",
    fr: "fr",
    pt: "pt",
    zh: "zh",
    ja: "ja",
    ar: "ar",
  };

  return langMap[langCode] || "en"; // Default to English if language not supported
};

export const UnifiedLoadingScreen: React.FC<UnifiedLoadingScreenProps> = ({
  stage,
  message,
}) => {
  const detectedLanguage = useMemo(() => detectBrowserLanguage(), []);
  const translations = TRANSLATIONS[detectedLanguage];
  const stageInfo = translations[stage];

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex flex-col items-center gap-8 text-center max-w-md mx-auto px-6"
      >
        {/* Main Loading Animation */}
        <div className="relative">
          {/* Outer ring */}
          <motion.div
            className="w-16 h-16 border-4 border-gray-200 rounded-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          />

          {/* Spinning ring */}
          <motion.div
            className="absolute inset-0 w-16 h-16 border-4 border-primary border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              ease: "linear",
            }}
          />

          {/* Center dot */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
          >
            <div className="w-6 h-6 bg-primary rounded-full animate-pulse" />
          </motion.div>
        </div>

        {/* Content */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="space-y-3"
        >
          <h2 className="text-2xl font-semibold text-foreground">
            {stageInfo.title}
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            {message || stageInfo.description}
          </p>
        </motion.div>

        {/* Progress Dots */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex items-center gap-2"
        >
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 bg-primary rounded-full"
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.2,
                  ease: "easeInOut",
                }}
              />
            ))}
          </div>
          <span className="text-sm text-muted-foreground ml-2">
            {translations.waitMessage}
          </span>
        </motion.div>
      </motion.div>
    </div>
  );
};
