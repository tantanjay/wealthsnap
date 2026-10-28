export const CONFIG = {
    TERMS_VERSION: 5,
    // Bump whenever the AI Data Usage Consent disclosure changes what categories
    // of data it discloses - existing users get re-prompted once, same idea as
    // TERMS_VERSION above.
    AI_CONSENT_VERSION: 1,
    ENABLE_DUMMY_DATA: false,
    SHOW_DEVELOPER_OPTIONS: false,
    SHOW_PAYPAL_SUPPORT: false,
    CHUNK_SIZE: 100,
};

export const SECURE_KEYS = {
    ENCRYPTION_KEY: 'wealthsnap_data_encryption_key',
    PIN_CODE: 'wealthsnap_security_pin',
    AI_API_KEY: 'wealthsnap_ai_api_key',
    AUTO_BACKUP_PASSWORD: 'wealthsnap_auto_backup_password',
}

export const ASYNC_KEYS = {
    USER_PROFILE: '@wealthsnap_user_profile',
    THEME_MODE: '@wealthsnap_theme_mode',
    NOTIFIED_ALERTS: '@wealthsnap_notified_alerts',
    SECURITY: {
        // Legacy on/off flag; read once to migrate into PRIVACY_MODE.
        PRIVACY_ENABLED: '@wealthsnap_privacy_enabled',
        PRIVACY_MODE: '@wealthsnap_privacy_mode',
        TIMEOUT_SETTING: '@wealthsnap_security_timeout',
        LAST_ACTIVE: '@wealthsnap_security_last_active',
        FAILED_PIN_ATTEMPTS: '@wealthsnap_failed_pin_attempts',
        PIN_LOCKOUT_UNTIL: '@wealthsnap_pin_lockout_until',
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
        SNAPSHOT_ORDER: '@wealthsnap_snapshot_order',
        SNAPSHOT_PERIOD: '@wealthsnap_snapshot_period',
        SNAPSHOT_RANGE: '@wealthsnap_snapshot_range',
        HOLDINGS_ORDER: '@wealthsnap_holdings_order',
        // Pre-1.19 Home cards; read once to migrate, then removed.
        CARD_ORDER: '@wealthsnap_card_order',
        LEGACY_DISPLAY_MODES: [
            '@wealthsnap_health_display_mode',
            '@wealthsnap_finance_display_mode',
            '@wealthsnap_investment_display_mode',
            '@wealthsnap_debt_display_mode',
            '@wealthsnap_home_transactions_tab',
        ],
    },
    INSIGHTS_SCREEN: {
        HEALTH_GRID: '@wealthsnap_insights_health_grid',
        // Pre-redesign overview card order; ignored (the grid starts from its default) and removed on first read.
        CARD_ORDER: '@wealthsnap_insights_card_order',
        SECTION_ORDER: '@wealthsnap_insights_section_order',
        EXPENSE_GROUPING: '@wealthsnap_insights_expense_grouping',
        INCOME_TAB: '@wealthsnap_insights_income_tab',
        INCOME_TIME_RANGE: '@wealthsnap_insights_income_time_range',
        COMPARISON_VIEW: '@wealthsnap_insights_comparison_view',
        COMPARISON_TIME_RANGE: '@wealthsnap_insights_comparison_time_range',
        SAVINGS_TAB: '@wealthsnap_insights_savings_tab',
        SAVINGS_TIME_RANGE: '@wealthsnap_insights_savings_time_range',
        PULSE_PERIOD: '@wealthsnap_insights_pulse_period',
    },
    HISTORY_SCREEN: {
        PREFERENCE: '@wealthsnap_history_prefs'
    },
    INVESTMENT_SCREEN: {
        STATS_ORDER: '@wealthsnap_investment_stats_order',
        SECTION_ORDER: '@wealthsnap_investment_section_order',
        HOLDINGS_SORT: '@wealthsnap_investment_holdings_sort',
        DIVIDEND_TAB: '@wealthsnap_investment_dividend_tab',
        ALLOCATION_TAB: '@wealthsnap_investment_allocation_tab',
        ADVISOR_PRIORITY: '@wealthsnap_investment_advisor_priority',
    },
    DEBT_SCREEN: {
        STRATEGY: '@wealthsnap_debt_strategy',
    },
    CHAT_SCREEN: {
        EXCLUDED_CATEGORIES: '@wealthsnap_chat_excluded_categories',
        DISCLOSE_DEBT_NAMES: '@wealthsnap_chat_disclose_debt_names',
    },
    CRASH_REPORT: '@wealthsnap_crash_report',
    DEVELOPER_MODE: '@wealthsnap_developer_mode',
    BACKUP_TIMESTAMP: '@wealthsnap_backup_timestamp',
    AUTO_BACKUP: {
        ENABLED: '@wealthsnap_auto_backup_enabled',
        FREQUENCY: '@wealthsnap_auto_backup_frequency',
        FOLDER_URI: '@wealthsnap_auto_backup_folder_uri',
        LAST_RUN: '@wealthsnap_auto_backup_last_run',
    },
    REVIEW_PROMPT: {
        HAS_RATED: '@wealthsnap_review_has_rated',
        LAST_PROMPT: '@wealthsnap_review_last_prompt',
    }
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