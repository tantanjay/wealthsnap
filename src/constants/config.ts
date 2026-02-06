export const CONFIG = {
    TERMS_VERSION: 4,
    ENABLE_DUMMY_DATA: false,
    SHOW_DEVELOPER_OPTIONS: false,
    SHOW_PAYPAL_SUPPORT: false,
    CHUNK_SIZE: 100,
};

export const SECURE_KEYS = {
    ENCRYPTION_KEY: 'wealthsnap_data_encryption_key',
    PIN_CODE: 'wealthsnap_security_pin',
    AI_API_KEY: 'wealthsnap_ai_api_key',
}

export const ASYNC_KEYS = {
    USER_PROFILE: '@wealthsnap_user_profile',
    THEME_MODE: '@wealthsnap_theme_mode',
    NOTIFIED_ALERTS: '@wealthsnap_notified_alerts',
    SECURITY: {
        PRIVACY_ENABLED: '@wealthsnap_privacy_enabled',
        TIMEOUT_SETTING: '@wealthsnap_security_timeout',
        LAST_ACTIVE: '@wealthsnap_security_last_active',
    },
    AI: {
        PROVIDER: '@wealthsnap_ai_provider',
        MODEL_ID: '@wealthsnap_ai_model_id',
        CONSENT: '@wealthsnap_ai_consent',
    },
    ONBOARDING: {
        COMPLETE: '@wealthsnap_onboarding_complete',
        ACCEPTED_TERMS_VERSION: '@wealthsnap_accepted_terms_version',
    },
    HOME_SCREEN: {
        FINANCE_DISPLAY_MODE: '@wealthsnap_finance_display_mode',
        INVESTMENT_DISPLAY_MODE: '@wealthsnap_investment_display_mode',
        CARD_ORDER: '@wealthsnap_finance_card_order',
    },
    INSIGHTS_SCREEN: {
        CARD_ORDER: '@wealthsnap_insights_card_order',
        SECTION_ORDER: '@wealthsnap_insights_section_order',
    },
    HISTORY_SCREEN: {
        PREFERENCE: '@wealthsnap_history_prefs'
    },
    INVESTMENT_SCREEN: {
        STATS_ORDER: '@wealthsnap_investment_stats_order',
        SECTION_ORDER: '@wealthsnap_investment_section_order',
        HOLDINGS_SORT: '@wealthsnap_investment_holdings_sort',
    },
    CRASH_REPORT: '@wealthsnap_crash_report',
    DEVELOPER_MODE: '@wealthsnap_developer_mode',
    BACKUP_TIMESTAMP: '@wealthsnap_backup_timestamp',
};

/**
 * Recursively extracts all string values from a nested object.
 */
const getAllKeys = (obj: any): string[] => {
    let keys: string[] = [];
    for (const value of Object.values(obj)) {
        if (typeof value === 'string') {
            keys.push(value);
        } else if (typeof value === 'object' && value !== null) {
            keys = [...keys, ...getAllKeys(value)];
        }
    }
    return keys;
};

// Create the array automatically
export const ALL_ASYNC_KEYS = getAllKeys(ASYNC_KEYS);