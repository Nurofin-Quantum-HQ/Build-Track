import { create } from "zustand";
import { HELP_TOPICS, searchHelpTopics } from "./helpKnowledgeBase";

const STORAGE_KEY = "buildtrack_help_session_v1";

const INITIAL_GREETING = {
  id: "msg_init",
  sender: "bot",
  text: "Hello! I am your BuildTrack Assistant. How can I help you today? Choose any feature below or type your question to get instant step-by-step guidance.",
  topic: null,
  timestamp: Date.now(),
};

function loadStoredState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.messages) && parsed.messages.length > 0) {
        return {
          messages: parsed.messages,
          selectedCategory: parsed.selectedCategory || "all",
        };
      }
    }
  } catch (e) {
    console.warn("Could not load help session from localStorage", e);
  }
  return {
    messages: [INITIAL_GREETING],
    selectedCategory: "all",
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

    setSearchQuery: (q) => {
      set({ searchQuery: q });
    },

    selectTopicById: (topicId) => {
      const topic = HELP_TOPICS.find((t) => t.id === topicId);
      if (!topic) return;

      const userMsg = {
        id: `user_${Date.now()}`,
        sender: "user",
        text: topic.title,
        timestamp: Date.now(),
      };

      const botMsg = {
        id: `bot_${Date.now() + 1}`,
        sender: "bot",
        text: `Here is the complete step-by-step guide for **${topic.title}**:`,
        topic: topic,
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

      const userMsg = {
        id: `user_${Date.now()}`,
        sender: "user",
        text: query,
        timestamp: Date.now(),
      };

      const results = searchHelpTopics(query, get().selectedCategory);

      let botMsg;
      if (results.length > 0) {
        const best = results[0];
        const otherMatches = results.slice(1, 4);

        botMsg = {
          id: `bot_${Date.now() + 1}`,
          sender: "bot",
          text: `Here is how to do **${best.title}**:`,
          topic: best,
          relatedTopics: otherMatches.length > 0 ? otherMatches : null,
          timestamp: Date.now() + 1,
        };
      } else {
        botMsg = {
          id: `bot_${Date.now() + 1}`,
          sender: "bot",
          text: `I couldn't find an exact match for "${query}". You can browse all features by category below, or try keywords like "project", "csv", "material", "labour", "revenue", or "reports".`,
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
      const resetGreeting = {
        id: `msg_${Date.now()}`,
        sender: "bot",
        text: "Conversation reset. How can I help you today? Choose any feature below or search to get started.",
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
