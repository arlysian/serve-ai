export type Language = 'en' | 'nl';

export interface Translations {
  'askAnything': string;
  'aiMenuAssistant': string;
  'askMeAnything': string;
  'askAiAboutThis': string;
  'tryExamples': string;
  'tellMeMoreAbout': string;
}

export const translations: Record<Language, Translations> = {
  en: {
    askAnything: 'Ask me anything',
    aiMenuAssistant: 'AI Menu Assistant',
    askMeAnything: 'Ask me anything about the menu!',
    askAiAboutThis: 'Ask AI about this',
    tryExamples: 'Try: "What\'s good for vegetarians?" or "What do you recommend?"',
    tellMeMoreAbout: 'Tell me more about',
  },
  nl: {
    askAnything: 'Stel een vraag',
    aiMenuAssistant: 'AI Menu Assistent',
    askMeAnything: 'Stel een vraag over het menu!',
    askAiAboutThis: 'Vraag AI hierover',
    tryExamples: 'Probeer: "Wat is lekker voor vegetariërs?" of "Wat raadt u aan?"',
    tellMeMoreAbout: 'Vertel me meer over',
  },
};

export const getTranslation = (lang: Language, key: keyof Translations): string => {
  return translations[lang][key];
};

