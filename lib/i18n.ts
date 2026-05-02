// Bilingual dictionary (Arabic + English) and helpers for runtime translation.
// Default locale: Arabic (RTL). User can switch from the navbar.

export type Locale = "ar" | "en"

export const LOCALES: { code: Locale; label: string; dir: "rtl" | "ltr" }[] = [
  { code: "ar", label: "العربية", dir: "rtl" },
  { code: "en", label: "English", dir: "ltr" },
]

export const DEFAULT_LOCALE: Locale = "ar"

export type TranslationKey = keyof typeof DICTIONARY.ar

const DICTIONARY = {
  ar: {
    // Branding
    appTitle: "جارفيس — هاتفك، لكن أذكى",
    appSubtitle:
      "دماغ ذكاء اصطناعي متعدد الوكلاء يتحكم في هاتف Android عبر Termux. أحضر مفتاح API الخاص بك من OpenAI أو Anthropic أو Google أو Groq أو xAI أو Mistral.",

    // Navbar
    nav_chat: "المحادثة",
    nav_device: "الجهاز",
    nav_logs: "السجل",
    nav_settings: "الإعدادات",

    // Status bar
    status_no_model: "لا يوجد نموذج",
    status_no_arm: "لا يوجد ذراع",
    status_offline: "غير متصل",

    // Home / chat empty state
    home_at_your_service: "في خدمتك",
    home_tagline:
      "نظام ذكي ضليع بشؤون عديدة. اكتب أمراً — سأتولى أمر الهاتف.",
    home_setup_required: "إعداد مطلوب",
    home_setup_add_key: "أضف مفتاح API واختر نموذجاً",
    home_setup_pair_device: "اقرن هاتف Android عبر Termux",

    suggestion_diagnostics: "افحص حالة الهاتف",
    suggestion_diagnostics_prompt:
      "افحص حالة الهاتف بسرعة — البطارية، الموقع، الواي فاي، المساحة الفارغة.",
    suggestion_camera: "تفقد ما حولي",
    suggestion_camera_prompt: "التقط صورة بالكاميرا الخلفية وأخبرني ماذا ترى.",
    suggestion_tts: "انطق الوقت الحالي",
    suggestion_tts_prompt: "استخدم TTS لنطق الوقت الحالي بصوت مرتفع.",
    suggestion_top: "أرني العمليات النشطة",
    suggestion_top_prompt:
      "نفّذ `top -b -n1 | head -20` ولخص لي ماذا يعمل على الهاتف.",

    // Chat input
    chat_placeholder: "أصدر أمرك يا سيدي.",
    chat_placeholder_disabled: "اضبط نموذجاً في الإعدادات للبدء.",
    chat_processing: "جارٍ المعالجة",
    chat_label_jarvis: "جارفيس",

    // Tool call card
    tool_args: "الوسائط",
    tool_result: "النتيجة",
    tool_device: "الجهاز",

    // Settings
    settings_title: "الإعدادات",
    settings_section_brain: "الدماغ",
    settings_brain_desc:
      "أحضر مفتاح API الخاص بك لأي مزود. مفتاحك مشفّر في التخزين ولا يُستخدم إلا على الخادم للتواصل مع النموذج.",
    settings_section_personality: "الشخصية",
    settings_edit_prompt: "تعديل تعليمات النظام",
    settings_save: "حفظ",
    settings_cancel: "إلغاء",
    settings_prompt_updated: "تم تحديث تعليمات النظام",
    settings_section_trust: "وضع الثقة",
    settings_trust_full: "ثقة كاملة",
    settings_trust_full_desc:
      "ينفذ جارفيس الأوامر فوراً بدون تأكيد. عطّل هذا الخيار لطلب موافقة يدوية على الإجراءات الخطرة.",
    settings_section_danger: "منطقة الخطر",
    settings_danger_reset_keys_title: "إعادة تعيين مفاتيح API",
    settings_danger_reset_keys_desc: "امسح جميع المفاتيح المحفوظة وأعد إدخالها. استخدم هذا إذا كان جارفيس يعطيك خطأ رصيد رغم وجود مفتاح صحيح.",
    settings_danger_reset_keys_confirm: "سيتم حذف جميع مفاتيح API المحفوظة. هل أنت متأكد؟",
    settings_danger_reset_keys_done: "تم مسح المفاتيح — أعد إدخالها من الإعدادات.",
    settings_danger_reset_keys_btn: "مسح المفاتيح",
    settings_danger_wipe_title: "مسح الذاكرة طويلة الأمد",
    settings_danger_wipe_desc: "ينسى كل ما يتذكره جارفيس عنك.",
    settings_danger_wipe_btn: "مسح",
    settings_danger_wipe_confirm: "هل تريد مسح كل الذكريات المخزّنة؟",
    settings_danger_wipe_done: "تم مسح الذاكرة",

    // Provider card
    provider_api_key_label: "مفتاح API",
    provider_save: "حفظ",
    provider_get_key: "احصل على مفتاح من",
    provider_replace: "استبدال المفتاح",
    provider_remove: "إزالة",
    provider_remove_confirm: "إزالة مفتاح API الخاص بـ {name}؟",
    provider_models: "النماذج",
    provider_live: "(مباشر)",
    provider_preset: "(محفوظ)",
    provider_no_models: "لم يتم العثور على نماذج.",
    provider_active: "نشط",
    provider_key_saved: "تم حفظ مفتاح {name}",
    provider_key_removed: "تمت إزالة مفتاح {name}",
    provider_save_failed: "فشل الحفظ: {error}",
    provider_model_set: "تم اختيار النموذج: {provider}/{model}",

    // Devices
    devices_title: "الأجهزة",
    devices_section_pair: "اقرن ذراعاً جديداً",
    devices_pair_desc:
      "أصدر معرّف جهاز ومفتاح اقتران جديدين، ثم نفّذ السكربت في Termux على هاتفك. يُعرض المفتاح مرة واحدة فقط — انسخه الآن.",
    devices_name_placeholder: "هاتفي",
    devices_mint: "إنشاء",
    devices_section_paired: "الأذرع المقترنة",
    devices_none: "لم يتم اقتران أي جهاز بعد.",
    devices_status_online: "متصل",
    devices_status_offline: "غير متصل",
    devices_status_unknown: "غير معروف",
    devices_last_seen: "آخر ظهور",
    devices_never: "��بداً",
    devices_unpair: "فك الاقتران",
    devices_unpair_confirm: "هل تريد فك اقتران هذا الجهاز؟",
    devices_unpaired: "تم فك اقتران الجهاز",

    devices_minted: "تم إنشاء الجهاز: {name}",
    devices_save_now:
      "احفظ هذا المفتاح الآن — لن يُعرض مرة أخرى. نفّذ الأمر أدناه في Termux لتفعيل الذراع.",
    devices_field_id: "معرّف الجهاز",
    devices_field_key: "مفتاح الاقتران",
    devices_install_oneliner: "تثبيت بسطر واحد",
    devices_env_manual: "أو اضبط متغيرات البيئة يدوياً",
    devices_dismiss: "حسناً، أخفِ",
    devices_copied: "تم نسخ {label}",

    // Termux setup
    devices_section_setup: "دليل إعداد Termux",
    devices_setup_step1_pre: "ثبّت",
    devices_setup_step1_and: "و",
    devices_setup_step1_post: "من F-Droid.",
    devices_setup_step2: "في Termux، نفّذ:",
    devices_setup_step3: "امنح صلاحيات التخزين والأذونات:",
    devices_setup_step4:
      "أنشئ جهازاً أعلاه، انسخ أمر التثبيت، الصقه في Termux. السكربت يعمل بشكل مستمر في المقدمة — أبقِ Termux مفتوحاً أو استخدم",
    devices_setup_keep_awake: "لمنع النظام من إيقافه.",

    // Logs
    logs_title: "سجل التنفيذ",
    logs_desc:
      "كل أمر أرسله جارفيس إلى الهاتف، الأقدم في الأسفل. اضغط على أي إدخال لرؤية الوسائط والمخرجات الكاملة.",
    logs_loading: "جاري التحميل…",
    logs_empty: "لا توجد أوامر بعد. اطلب من جارفيس فعل شيء على هاتفك.",
    logs_clear: "مسح السجل",
    logs_clear_confirm: "هل تريد مسح سجل التنفيذ بالكامل؟",
    logs_cleared: "تم مسح السجل",
    logs_refresh: "تحديث",

    // Graph mode
    graph_mode: "وضع الشبكة المعرفية",
    graph_mode_desc: "تفعيل محرك DAG متعدد العقد لتفكير أعمق وتخطيط موازٍ",
    graph_mode_on: "شبكة",
    graph_mode_off: "عادي",
    graph_mode_tooltip: "وضع الشبكة المعرفية: يُفعّل DAG متعدد العقد للمهام المعقدة",

    // Common
    back: "رجوع",
    locale_switch: "اللغة",
    locale_ar: "العربية",
    locale_en: "English",
  },
  en: {
    appTitle: "JARVIS — Your Phone, Smarter",
    appSubtitle:
      "A multi-agent AI brain that controls your Android phone through Termux. Bring your own API key from OpenAI, Anthropic, Google, Groq, xAI, or Mistral.",

    nav_chat: "Chat",
    nav_device: "Device",
    nav_logs: "Logs",
    nav_settings: "Settings",

    status_no_model: "no model",
    status_no_arm: "no arm",
    status_offline: "offline",

    home_at_your_service: "At your service",
    home_tagline:
      "Just A Rather Very Intelligent System. Type a command — I'll handle the phone.",
    home_setup_required: "setup required",
    home_setup_add_key: "Add an API key and pick a model",
    home_setup_pair_device: "Pair your Android phone via Termux",

    suggestion_diagnostics: "Run diagnostics on the phone",
    suggestion_diagnostics_prompt:
      "Run a quick diagnostic on the phone — battery, location, wifi, free disk.",
    suggestion_camera: "Check what's around me",
    suggestion_camera_prompt:
      "Take a photo with the back camera and tell me what you see.",
    suggestion_tts: "Speak the time",
    suggestion_tts_prompt: "Use TTS to speak the current time out loud.",
    suggestion_top: "Show me top processes",
    suggestion_top_prompt:
      "Run `top -b -n1 | head -20` and summarise what's running on the phone.",

    chat_placeholder: "Issue a command, sir.",
    chat_placeholder_disabled: "Configure a model in Settings to begin.",
    chat_processing: "processing",
    chat_label_jarvis: "jarvis",

    tool_args: "args",
    tool_result: "result",
    tool_device: "device",

    settings_title: "Settings",
    settings_section_brain: "Brain",
    settings_brain_desc:
      "Bring your own API key for any provider. Your key is encrypted at rest and only used server-side to talk to the model.",
    settings_section_personality: "Personality",
    settings_edit_prompt: "Edit system prompt",
    settings_save: "Save",
    settings_cancel: "Cancel",
    settings_prompt_updated: "System prompt updated",
    settings_section_trust: "Trust mode",
    settings_trust_full: "Full trust",
    settings_trust_full_desc:
      "Jarvis executes commands immediately without confirmation. Disable this to require manual approval for destructive actions.",
    settings_section_danger: "Danger zone",
    settings_danger_reset_keys_title: "Reset API keys",
    settings_danger_reset_keys_desc: "Wipe all stored keys and re-enter them fresh. Use this if Jarvis returns a credit error despite having a valid key.",
    settings_danger_reset_keys_confirm: "This will delete all saved API keys. Are you sure?",
    settings_danger_reset_keys_done: "Keys wiped — re-enter them in Settings.",
    settings_danger_reset_keys_btn: "Reset keys",
    settings_danger_wipe_title: "Wipe long-term memory",
    settings_danger_wipe_desc: "Forgets everything Jarvis remembers about you.",
    settings_danger_wipe_btn: "Wipe",
    settings_danger_wipe_confirm: "Wipe all stored memories?",
    settings_danger_wipe_done: "Memory wiped",

    provider_api_key_label: "API key",
    provider_save: "Save",
    provider_get_key: "Get a key from",
    provider_replace: "Replace key",
    provider_remove: "Remove",
    provider_remove_confirm: "Remove your {name} API key?",
    provider_models: "Models",
    provider_live: "(live)",
    provider_preset: "(preset)",
    provider_no_models: "No models found.",
    provider_active: "active",
    provider_key_saved: "{name} key saved",
    provider_key_removed: "{name} key removed",
    provider_save_failed: "Failed to save: {error}",
    provider_model_set: "Model set: {provider}/{model}",

    devices_title: "Devices",
    devices_section_pair: "Pair a new arm",
    devices_pair_desc:
      "Mint a fresh device + pair key, then run the script in Termux on your phone. The key is shown once — copy it now.",
    devices_name_placeholder: "My Phone",
    devices_mint: "Mint",
    devices_section_paired: "Paired arms",
    devices_none: "No devices paired yet.",
    devices_status_online: "online",
    devices_status_offline: "offline",
    devices_status_unknown: "unknown",
    devices_last_seen: "last seen",
    devices_never: "never",
    devices_unpair: "Unpair",
    devices_unpair_confirm: "Unpair this device?",
    devices_unpaired: "Device unpaired",

    devices_minted: "Device minted: {name}",
    devices_save_now:
      "Save this key now — it will not be shown again. Run the command below in Termux to wire up the arm.",
    devices_field_id: "Device ID",
    devices_field_key: "Pair key",
    devices_install_oneliner: "One-line install",
    devices_env_manual: "Or set env vars manually",
    devices_dismiss: "Got it, hide",
    devices_copied: "{label} copied",

    devices_section_setup: "Termux setup guide",
    devices_setup_step1_pre: "Install",
    devices_setup_step1_and: "and",
    devices_setup_step1_post: "from F-Droid.",
    devices_setup_step2: "In Termux, run:",
    devices_setup_step3: "Grant storage and permissions:",
    devices_setup_step4:
      "Mint a device above, copy the install command, paste it into Termux. The script runs forever in the foreground — keep Termux open or use",
    devices_setup_keep_awake: "to prevent it from being killed.",

    logs_title: "Execution log",
    logs_desc:
      "Every command Jarvis dispatched to the phone, oldest at the bottom. Tap any entry to inspect the full args and output.",
    logs_loading: "Loading…",
    logs_empty: "No commands yet. Ask Jarvis to do something on your phone.",
    logs_clear: "Clear log",
    logs_clear_confirm: "Clear the entire execution log?",
    logs_cleared: "Log cleared",
    logs_refresh: "Refresh",

    // Graph mode
    graph_mode: "Cognitive Graph Mode",
    graph_mode_desc: "Activate multi-node DAG engine for deeper reasoning and parallel planning",
    graph_mode_on: "Graph",
    graph_mode_off: "Normal",
    graph_mode_tooltip: "Cognitive Graph Mode: activates multi-node DAG for complex tasks",

    back: "Back",
    locale_switch: "Language",
    locale_ar: "العربية",
    locale_en: "English",
  },
} as const

export function translate(
  locale: Locale,
  key: TranslationKey,
  vars?: Record<string, string | number>,
): string {
  const dict = DICTIONARY[locale] ?? DICTIONARY[DEFAULT_LOCALE]
  let str = (dict as Record<string, string>)[key] ?? (DICTIONARY.en as Record<string, string>)[key] ?? key
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replaceAll(`{${k}}`, String(v))
    }
  }
  return str
}
