import { create } from "zustand";
import { HELP_TOPICS, searchHelpTopics } from "./helpKnowledgeBase";
import { getLocalizedTopic } from "./helpTranslations";

const STORAGE_KEY = "buildtrack_help_session_v1";
const LANG_STORAGE_KEY = "buildtrack_help_lang_v1";

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "EN", name: "English", nativeName: "English" },
  { code: "kn", label: "KN", name: "Kannada", nativeName: "ಕನ್ನಡ" },
  { code: "hi", label: "HI", name: "Hindi", nativeName: "हिंदी" },
  { code: "te", label: "TE", name: "Telugu", nativeName: "తెలుగు" },
  { code: "ta", label: "TA", name: "Tamil", nativeName: "தமிழ்" },
  { code: "ml", label: "ML", name: "Malayalam", nativeName: "മലയാളം" },
];

export const LANGUAGE_LOCALES = {
  en: {
    greeting: "Hello! I am your BuildTrack Assistant. How can I help you today? Choose any feature below or type your question in English or regional words to get instant step-by-step guidance.",
    placeholder: "Ask anything (e.g. 'how to upload csv', 'project heg add madodu')...",
    subtitle: "Step-by-step guides for all features",
    guidePrefix: "Here is the complete step-by-step guide for",
    path: "Path",
    proTip: "Pro Tip:",
    switchedNotice: (name) => `Language switched to ${name}. All step-by-step guides are now localized!`,
  },
  kn: {
    greeting: "ನಮಸ್ಕಾರ! ನಾನು ನಿಮ್ಮ BuildTrack ಸಹಾಯಕ. ನಿಮಗೆ ಇಂದು ನಾನು ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ? ಕೆಳಗಿನ ಆಯ್ಕೆಗಳನ್ನು ನೋಡಿ ಅಥವಾ ನಿಮ್ಮ ಪ್ರಶ್ನೆಯನ್ನು (ಕನ್ನಡದಲ್ಲಿ ಅಥವಾ 'project heg madodu' ಎಂದು) ಟೈಪ್ ಮಾಡಿ.",
    placeholder: "ಏನಾದರೂ ಕೇಳಿ (ಉದಾ: 'ಹೊಸ ಪ್ರಾಜೆಕ್ಟ್', 'project heg add madodu', 'CSV ಅಪ್‌ಲೋಡ್')...",
    subtitle: "ಎಲ್ಲಾ ಫೀಚರ್‌ಗಳ ಹಂತ-ಹಂತದ ಗೈಡ್",
    guidePrefix: "ಇಲ್ಲಿ ಹಂತ-ಹಂತದ ಸಂಪೂರ್ಣ ಮಾರ್ಗದರ್ಶಿ ಇದೆ:",
    path: "ಮಾರ್ಗ (Path)",
    proTip: "ಸಲಹೆ (Pro Tip):",
    switchedNotice: () => "ಭಾಷೆಯನ್ನು ಕನ್ನಡಕ್ಕೆ ಬದಲಾಯಿಸಲಾಗಿದೆ. ಹಂತ-ಹಂತದ ಎಲ್ಲಾ ವಿವರಗಳು ಕನ್ನಡದಲ್ಲಿ ಲಭ್ಯವಿದೆ!",
  },
  hi: {
    greeting: "नमस्ते! मैं आपका BuildTrack सहायक हूँ। आज मैं आपकी क्या सहायता कर सकता हूँ? नीचे दिए गए विकल्पों को चुनें या अपना प्रश्न (हिंदी या 'naya project kaise banaye') में टाइप करें।",
    placeholder: "कुछ भी पूछें (उदा: 'नया प्रोजेक्ट कैसे जोड़ें', 'bill kaise dale', 'CSV अपलोड')...",
    subtitle: "सभी सुविधाओं के लिए चरण-दर-चरण गाइड",
    guidePrefix: "यहाँ चरण-दर-चरण पूरी गाइड दी गई है:",
    path: "रास्ता (Path)",
    proTip: "खास टिप:",
    switchedNotice: () => "भाषा को हिंदी में बदल दिया गया है। चरण-दर-चरण सभी जानकारी हिंदी में उपलब्ध है!",
  },
  te: {
    greeting: "నమస్కారం! నేను మీ BuildTrack సహాయకుడిని. ఈరోజు నేను మీకు ఎలా సహాయపడగలను? క్రింది ఫీచర్లలో ఒకదాన్ని ఎంచుకోండి లేదా మీ ప్రశ్నను టైప్ చేయండి.",
    placeholder: "ఏదైనా అడగండి (ఉదా: 'కొత్త ప్రాజెక్ట్', 'project ela add cheyali', 'CSV')...",
    subtitle: "అన్ని ఫీచర్లకు స్టెప్-బై-స్టెప్ గైడ్",
    guidePrefix: "ఇక్కడ స్టెప్-బై-స్టెప్ పూర్తి గైడ్ ఉంది:",
    path: "మార్గం (Path)",
    proTip: "ముఖ్యమైన చిట్కా:",
    switchedNotice: () => "భాష తెలుగులోకి మార్చబడింది. అన్ని మార్గదర్శకాలు తెలుగులో అందుబాటులో ఉన్నాయి!",
  },
  ta: {
    greeting: "வணக்கம்! நான் உங்கள் BuildTrack உதவியாளர். இன்று உங்களுக்கு நான் எவ்வாறு உதவ முடியும்? கீழே உள்ள ஏதேனும் ஒரு அம்சத்தைத் தேர்வு செய்யவும் அல்லது உங்கள் கேள்வியைத் தட்டச்சு செய்யவும்.",
    placeholder: "ஏதேனும் கேளுங்கள் (उदा: 'புதிய திட்டம்', 'project eppadi add panrathu')...",
    subtitle: "அனைத்து அம்சங்களுக்கான படிப்படியான வழிகாட்டி",
    guidePrefix: "இதோ முழுமையான படிப்படியான வழிகாட்டி:",
    path: "பாதை (Path)",
    proTip: "முக்கிய குறிப்பு:",
    switchedNotice: () => "மொழி தமிழுக்கு மாற்றப்பட்டது. அனைத்து வழிகாட்டுதல்களும் தமிழில் கிடைக்கின்றன!",
  },
  ml: {
    greeting: "നമസ്കാരം! ഞാൻ നിങ്ങളുടെ BuildTrack സഹായിയാണ്. ഇന്ന് ഞാൻ നിങ്ങളെ എങ്ങനെ സഹായിക്കണം? താഴെ പറയുന്നവയിൽ നിന്ന് തിരഞ്ഞെടുക്കുക അല്ലെങ്കിൽ ചോദ്യം ചോദിക്കുക.",
    placeholder: "എന്തും ചോദിക്കാം (ഉദാ: 'പുതിയ പ്രോജക്റ്റ്', 'project engane add cheyyam')...",
    subtitle: "എല്ലാ ഫീച്ചറുകൾക്കുമുള്ള ഘട്ടം ഘട്ടമായുള്ള ഗൈഡ്",
    guidePrefix: "ഇതാ പൂർണ്ണമായ ഘട്ടം ഘട്ടമായുള്ള ഗൈഡ്:",
    path: "വഴി (Path)",
    proTip: "പ്രത്യേക നിർദ്ദേശം:",
    switchedNotice: () => "ഭാഷ മലയാളത്തിലേക്ക് മാറ്റി. എല്ലാ ഘട്ടങ്ങളും മലയാളത്തിൽ ലഭ്യമാണ്!",
  },
};

function getStoredLanguage() {
  try {
    return localStorage.getItem(LANG_STORAGE_KEY) || "en";
  } catch {
    return "en";
  }
}

function loadStoredState() {
  const lang = getStoredLanguage();
  const locale = LANGUAGE_LOCALES[lang] || LANGUAGE_LOCALES.en;

  const initialGreeting = {
    id: "msg_init",
    sender: "bot",
    text: locale.greeting,
    topic: null,
    timestamp: Date.now(),
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.messages) && parsed.messages.length > 0) {
        return {
          messages: parsed.messages,
          selectedCategory: parsed.selectedCategory || "all",
          selectedLanguage: lang,
        };
      }
    }
  } catch (e) {
    console.warn("Could not load help session from localStorage", e);
  }
  return {
    messages: [initialGreeting],
    selectedCategory: "all",
    selectedLanguage: lang,
  };
}

function saveState(state) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        messages: state.messages,
        selectedCategory: state.selectedCategory,
      })
    );
  } catch (e) {
    console.warn("Could not save help session to localStorage", e);
  }
}

const useHelpStore = create((set, get) => {
  const initial = loadStoredState();

  return {
    isOpen: false,
    messages: initial.messages,
    selectedCategory: initial.selectedCategory,
    selectedLanguage: initial.selectedLanguage,
    searchQuery: "",

    openHelp: (category) => {
      set((state) => ({
        isOpen: true,
        selectedCategory: category || state.selectedCategory || "all",
      }));
    },

    closeHelp: () => {
      set({ isOpen: false });
    },

    toggleHelp: () => {
      set((state) => ({ isOpen: !state.isOpen }));
    },

    setSelectedCategory: (cat) => {
      set({ selectedCategory: cat });
      saveState(get());
    },

    setSelectedLanguage: (langCode) => {
      try {
        localStorage.setItem(LANG_STORAGE_KEY, langCode);
      } catch {
        /* storage blocked */
      }

      const locale = LANGUAGE_LOCALES[langCode] || LANGUAGE_LOCALES.en;
      const langObj = SUPPORTED_LANGUAGES.find((l) => l.code === langCode);

      set((state) => {
        // Re-localize any active topic in existing messages so the user immediately sees steps in the new language!
        const reLocalizedMessages = state.messages.map((m) => {
          if (m.topic) {
            const locTopic = getLocalizedTopic(m.topic, langCode);
            return {
              ...m,
              topic: locTopic,
              text: `${locale.guidePrefix || "Here is the complete step-by-step guide for"} **${locTopic.title}**:`,
            };
          }
          return m;
        });

        // If chat only had the greeting, replace it with the localized greeting
        if (reLocalizedMessages.length <= 1 && reLocalizedMessages[0]?.id === "msg_init") {
          const updatedGreeting = {
            id: "msg_init",
            sender: "bot",
            text: locale.greeting,
            topic: null,
            timestamp: Date.now(),
          };
          const next = {
            ...state,
            selectedLanguage: langCode,
            messages: [updatedGreeting],
          };
          saveState(next);
          return next;
        }

        // If conversation has history, append a gentle language switch notice
        const noticeMsg = {
          id: `msg_lang_${Date.now()}`,
          sender: "bot",
          text: locale.switchedNotice ? locale.switchedNotice(langObj?.nativeName || langCode) : `Language switched to ${langCode}.`,
          topic: null,
          timestamp: Date.now(),
        };

        const next = {
          ...state,
          selectedLanguage: langCode,
          messages: [...reLocalizedMessages, noticeMsg],
        };
        saveState(next);
        return next;
      });
    },

    setSearchQuery: (q) => {
      set({ searchQuery: q });
    },

    selectTopicById: (topicId) => {
      const topic = HELP_TOPICS.find((t) => t.id === topicId);
      if (!topic) return;

      const lang = get().selectedLanguage || "en";
      const locale = LANGUAGE_LOCALES[lang] || LANGUAGE_LOCALES.en;
      const localizedTopic = getLocalizedTopic(topic, lang);

      const userMsg = {
        id: `user_${Date.now()}`,
        sender: "user",
        text: localizedTopic.title,
        timestamp: Date.now(),
      };

      const botMsg = {
        id: `bot_${Date.now() + 1}`,
        sender: "bot",
        text: `${locale.guidePrefix || "Here is the complete step-by-step guide for"} **${localizedTopic.title}**:`,
        topic: localizedTopic,
        timestamp: Date.now() + 1,
      };

      set((state) => {
        const next = {
          ...state,
          messages: [...state.messages, userMsg, botMsg],
          searchQuery: "",
        };
        saveState(next);
        return next;
      });
    },

    askQuestion: (input) => {
      const query = (input || "").trim();
      if (!query) return;

      const lower = query.toLowerCase();
      if (
        lower === "reset" ||
        lower === "new chat" ||
        lower === "clear" ||
        lower === "clear chat" ||
        lower === "restart" ||
        lower === "restart chat"
      ) {
        get().resetChat();
        return;
      }

      const lang = get().selectedLanguage || "en";
      const locale = LANGUAGE_LOCALES[lang] || LANGUAGE_LOCALES.en;

      const userMsg = {
        id: `user_${Date.now()}`,
        sender: "user",
        text: query,
        timestamp: Date.now(),
      };

      const results = searchHelpTopics(query, get().selectedCategory);

      let botMsg;
      if (results.length > 0) {
        const best = getLocalizedTopic(results[0], lang);
        const otherMatches = results.slice(1, 4).map((t) => getLocalizedTopic(t, lang));

        botMsg = {
          id: `bot_${Date.now() + 1}`,
          sender: "bot",
          text: `${locale.guidePrefix || "Here is how to do"} **${best.title}**:`,
          topic: best,
          relatedTopics: otherMatches.length > 0 ? otherMatches : null,
          timestamp: Date.now() + 1,
        };
      } else {
        const fallbackText =
          lang === "kn"
            ? `"${query}" ಗೆ ಸಂಬಂಧಿಸಿದ ನಿಖರ ಮಾಹಿತಿ ಸಿಗಲಿಲ್ಲ. ಕೆಳಗಿನ ಆಯ್ಕೆಗಳನ್ನು ಆರಿಸಿ ಅಥವಾ "ಪ್ರಾಜೆಕ್ಟ್", "ಖರ್ಚು", "ಕೂಲಿ", "CSV", "ರೆವಿನ್ಯೂ" ಎಂದು ಹುಡುಕಿ.`
            : lang === "hi"
            ? `"${query}" के लिए कोई सटीक परिणाम नहीं मिला। कृपया नीचे दी गई श्रेणियों में देखें या "प्रोजेक्ट", "सामग्री", "मजदूरी", "CSV" लिखकर खोजें।`
            : `I couldn't find an exact match for "${query}". You can browse all features by category below, or try keywords like "project", "csv", "material", "labour", "revenue", or "reports".`;

        botMsg = {
          id: `bot_${Date.now() + 1}`,
          sender: "bot",
          text: fallbackText,
          topic: null,
          timestamp: Date.now() + 1,
        };
      }

      set((state) => {
        const next = {
          ...state,
          messages: [...state.messages, userMsg, botMsg],
          searchQuery: "",
        };
        saveState(next);
        return next;
      });
    },

    resetChat: () => {
      const lang = get().selectedLanguage || "en";
      const locale = LANGUAGE_LOCALES[lang] || LANGUAGE_LOCALES.en;
      const resetGreeting = {
        id: "msg_init",
        sender: "bot",
        text: locale.greeting,
        topic: null,
        timestamp: Date.now(),
      };
      set({
        messages: [resetGreeting],
        selectedCategory: "all",
        searchQuery: "",
      });
      saveState({
        messages: [resetGreeting],
        selectedCategory: "all",
      });
    },

    replayVisualTour: () => {
      set({ isOpen: false });
      window.dispatchEvent(new Event("replay-app-tour"));
    },
  };
});

export default useHelpStore;
