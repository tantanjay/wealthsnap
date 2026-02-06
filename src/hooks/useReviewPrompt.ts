import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';
import { Linking, Platform } from 'react-native';

import { ASYNC_KEYS } from '@constants/config';
import { getTransactionCount, getLatestTransactionDate } from '@services/domain/transactionService';
import { getInvestmentCount, getLatestInvestmentDate } from '@services/domain/investmentService';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export const useReviewPrompt = () => {
    const [isVisible, setIsVisible] = useState(false);

    const checkReviewEligibility = useCallback(async () => {
        try {
            // 1. Check if already rated/declined
            const hasRated = await AsyncStorage.getItem(ASYNC_KEYS.REVIEW_PROMPT.HAS_RATED);
            if (hasRated === 'true') return;

            // 2. Check last prompt date (30 day cooldown)
            const lastPrompt = await AsyncStorage.getItem(ASYNC_KEYS.REVIEW_PROMPT.LAST_PROMPT);
            if (lastPrompt) {
                const timeSincePrompt = Date.now() - new Date(lastPrompt).getTime();
                if (timeSincePrompt < THIRTY_DAYS_MS) return;
            }

            // 3. Check for crashes in the last 7 days
            const crashReportStr = await AsyncStorage.getItem(ASYNC_KEYS.CRASH_REPORT);
            if (crashReportStr) {
                const reports: any[] = JSON.parse(crashReportStr);
                const recentCrashes = reports.filter((r: any) => {
                    const timeSinceCrash = Date.now() - new Date(r.timestamp).getTime();
                    return timeSinceCrash < SEVEN_DAYS_MS;
                });

                // If user experienced ANY crash recently
                if (recentCrashes.length >= 7) return;
            }

            // 4. Check Activity Thresholds
            // "transactions.count > 20 or investments.count > 5" AND "during user interaction of add"
            const [userTxnCount, userInvCount, lastTxnDate, lastInvDate] = await Promise.all([
                getTransactionCount(),
                getInvestmentCount(),
                getLatestTransactionDate(),
                getLatestInvestmentDate()
            ]);

            const now = Date.now();
            const ONE_MINUTE_MS = 1 * 60 * 1000;

            let isRecent = false;

            if (lastTxnDate) {
                const diff = now - new Date(lastTxnDate).getTime();
                if (diff < ONE_MINUTE_MS) isRecent = true;
            }

            if (!isRecent && lastInvDate) {
                const diff = now - new Date(lastInvDate).getTime();
                if (diff < ONE_MINUTE_MS) isRecent = true;
            }

            // Only show if heavy user AND they just did something productive (contextual trigger)
            // Roughly 2 weeks of daily usage, 3 transactions per day
            if (isRecent && (userTxnCount > 50 || userInvCount > 5)) {
                setIsVisible(true);
            }

        } catch (error) {
            console.error('Error checking review eligibility:', error);
        }
    }, []);

    const handleRate = async () => {
        setIsVisible(false);

        // Mark as rated immediately so the modal disappears and doesn't return
        await AsyncStorage.setItem(ASYNC_KEYS.REVIEW_PROMPT.HAS_RATED, 'true');

        try {
            if (await StoreReview.hasAction()) {
                await StoreReview.requestReview();
            } else {
                const storeUrl = Platform.select({
                    ios: 'https://apps.apple.com/app/idYOUR_APP_ID?action=write-review',
                    // Web fallback for Android just in case market:// isn't supported
                    android: 'market://details?id=com.christian.soyosa.WealthSnap',
                });

                if (storeUrl) {
                    const canOpen = await Linking.canOpenURL(storeUrl);
                    if (canOpen) {
                        await Linking.openURL(storeUrl);
                    } else if (Platform.OS === 'android') {
                        // Final fallback to web browser for Android
                        await Linking.openURL('https://play.google.com/store/apps/details?id=com.christian.soyosa.WealthSnap');
                    }
                }
            }
        } catch (error) {
            console.warn("Rating redirect failed", error);
        }
    };

    const handleLater = async () => {
        setIsVisible(false);
        // "if do later, this review modal must show 30 days after"
        // So we set LAST_PROMPT to now. The check above ensures 30 days wait.
        await AsyncStorage.setItem(ASYNC_KEYS.REVIEW_PROMPT.LAST_PROMPT, new Date().toISOString());
    };

    const handleDecline = async () => {
        setIsVisible(false);
        // "Do Not Show again" -> Treat as rated (or declined), effectively stops future prompts.
        await AsyncStorage.setItem(ASYNC_KEYS.REVIEW_PROMPT.HAS_RATED, 'true');
    };

    return {
        isReviewVisible: isVisible,
        checkReviewEligibility,
        handleRate,
        handleLater,
        handleDecline
    };
};
