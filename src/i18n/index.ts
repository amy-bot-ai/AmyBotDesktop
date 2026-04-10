import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import {
    SUPPORTED_LANGUAGE_CODES,
    resolveSupportedLanguage,
    type LanguageCode,
} from '../../shared/language';

// EN
import enCommon from './locales/en/common.json';
import enSettings from './locales/en/settings.json';
import enDashboard from './locales/en/dashboard.json';
import enChat from './locales/en/chat.json';
import enChannels from './locales/en/channels.json';
import enAgents from './locales/en/agents.json';
import enSkills from './locales/en/skills.json';
import enCron from './locales/en/cron.json';
import enSetup from './locales/en/setup.json';

// VI
import viCommon from './locales/vi/common.json';
import viSettings from './locales/vi/settings.json';
import viDashboard from './locales/vi/dashboard.json';
import viChat from './locales/vi/chat.json';
import viChannels from './locales/vi/channels.json';
import viAgents from './locales/vi/agents.json';
import viSkills from './locales/vi/skills.json';
import viCron from './locales/vi/cron.json';
import viSetup from './locales/vi/setup.json';

export const SUPPORTED_LANGUAGES = [
    { code: 'en', label: 'English' },
    { code: 'vi', label: 'Tiếng Việt' },
] as const satisfies ReadonlyArray<{ code: LanguageCode; label: string }>;

const resources = {
    en: {
        common: enCommon,
        settings: enSettings,
        dashboard: enDashboard,
        chat: enChat,
        channels: enChannels,
        agents: enAgents,
        skills: enSkills,
        cron: enCron,
        setup: enSetup,
    },
    vi: {
        common: viCommon,
        settings: viSettings,
        dashboard: viDashboard,
        chat: viChat,
        channels: viChannels,
        agents: viAgents,
        skills: viSkills,
        cron: viCron,
        setup: viSetup,
    },
};

i18n
    .use(initReactI18next)
    .init({
        resources,
        lng: resolveSupportedLanguage(typeof navigator !== 'undefined' ? navigator.language : undefined),
        fallbackLng: 'en',
        supportedLngs: [...SUPPORTED_LANGUAGE_CODES],
        defaultNS: 'common',
        ns: ['common', 'settings', 'dashboard', 'chat', 'channels', 'agents', 'skills', 'cron', 'setup'],
        interpolation: {
            escapeValue: false, // React already escapes
        },
        react: {
            useSuspense: false,
        },
    });

export default i18n;
