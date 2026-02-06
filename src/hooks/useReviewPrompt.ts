import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';
import { Linking, Platform } from 'react-native';

import { ASYNC_KEYS } from '@constants/config';
import { getTransactionCount } from '@services/domain/transactionService';
import { getInvestmentCount } from '@services/domain/investmentService';

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

                // If user experienced ANY crash recently, maybe don't ask...
                // The requirement says "detect if has_crashed_recently >= 7". 
                // Wait, logic check: "detect if has_crashed_recently >= 7" usually means count >= 7 crashes?
                // Or "7 days"? The user said "has_crashed_recently >= 7". 
                // Let's assume CRASH COUNT >= 7 implies "too unstable, don't ask".
                // But typically even 1 crash is bad. User said ">= 7". I will implement COUNT >= 7.
                if (recentCrashes.length >= 7) return;
            }

            // 4. Check Activity Thresholds
            // "transactions.count > 20 or investments.count > 5"
            // Note: The user said "transactions.count > 20", usually means "User has entered > 20 txns".
            const userTxnCount = await getTransactionCount();
            const userInvCount = await getInvestmentCount();

            if (userTxnCount > 20 || userInvCount > 5) {
                setIsVisible(true);
            }

        } catch (error) {
            console.error('Error checking review eligibility:', error);
        }
    }, []);

    const handleRate = async () => {
        setIsVisible(false);
        await AsyncStorage.setItem(ASYNC_KEYS.REVIEW_PROMPT.HAS_RATED, 'true');

        if (await StoreReview.hasAction()) {
            await StoreReview.requestReview();
        } else {
            // Fallback to store URL if native popup not supported
            const storeUrl = Platform.select({
                ios: 'https://apps.apple.com/app/idYOUR_APP_ID?action=write-review',
                android: 'market://details?id=com.tantanjay.wealthsnap', // Update with actual package
            });
            if (storeUrl) Linking.openURL(storeUrl).catch(() => { });
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
