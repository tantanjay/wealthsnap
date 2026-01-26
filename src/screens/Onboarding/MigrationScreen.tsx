import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';

import { useTheme } from '../../context/ThemeContext';
import { migrateFromAsyncStorage, isMigrationNeeded, hasAsyncStorageData } from '../../services/database/migrationService';

interface MigrationScreenProps {
    onComplete: () => void;
}

export const MigrationScreen: React.FC<MigrationScreenProps> = ({ onComplete }) => {
    const { colors } = useTheme();
    const [progress, setProgress] = useState({ step: 'Initializing...', current: 0, total: 5 });
    const [error, setError] = useState<string | null>(null);

    const performMigration = useCallback(async () => {
        try {
            // Check if migration is needed
            setProgress({ step: 'Checking migration status...', current: 1, total: 5 });
            const needsMigration = await isMigrationNeeded();

            if (!needsMigration) {
                onComplete();
                return;
            }

            // Check if there's data to migrate
            const hasData = await hasAsyncStorageData();
            if (!hasData) {
                onComplete();
                return;
            }

            // Perform migration
            const result = await migrateFromAsyncStorage((step, current, total) => {
                setProgress({ step, current, total });
            });

            if (result.success) {
                setProgress({
                    step: `✅ Migration complete! (${result.counts.transactions + result.counts.investments + result.counts.categories + result.counts.recurrenceRules + result.counts.budgets} items)`,
                    current: 5,
                    total: 5
                });

                // Wait a moment to show success message
                setTimeout(() => {
                    onComplete();
                }, 1500);
            } else {
                setError('Migration failed. Please restart the app.');
            }
        } catch (err) {
            console.error('[Migration] Error:', err);
            setError('Migration error. Please contact support.');
        }
    }, [onComplete]);

    useEffect(() => {
        performMigration();
    }, [performMigration]);

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.content}>
                <Text style={[styles.title, { color: colors.text }]}>
                    Upgrading WealthSnap
                </Text>

                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                    We&apos;re upgrading to a faster storage system
                </Text>

                {error ? (
                    <View style={styles.errorContainer}>
                        <Text style={styles.errorText}>❌ {error}</Text>
                    </View>
                ) : (
                    <>
                        <ActivityIndicator
                            size="large"
                            color={colors.primary}
                            style={styles.spinner}
                        />

                        <Text style={[styles.stepText, { color: colors.text }]}>
                            {progress.step}
                        </Text>

                        <View style={styles.progressContainer}>
                            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                                <View
                                    style={[
                                        styles.progressFill,
                                        {
                                            backgroundColor: colors.primary,
                                            width: `${(progress.current / progress.total) * 100}%`
                                        }
                                    ]}
                                />
                            </View>
                            <Text style={[styles.progressText, { color: colors.textSecondary }]}>
                                {progress.current} / {progress.total}
                            </Text>
                        </View>

                        <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                            Please don&apos;t close the app...
                        </Text>
                    </>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    content: {
        alignItems: 'center',
        maxWidth: 400,
        width: '100%',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 12,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        marginBottom: 40,
        textAlign: 'center',
    },
    spinner: {
        marginVertical: 30,
    },
    stepText: {
        fontSize: 16,
        marginBottom: 20,
        textAlign: 'center',
        minHeight: 24,
    },
    progressContainer: {
        width: '100%',
        alignItems: 'center',
        marginBottom: 20,
    },
    progressBar: {
        height: 8,
        width: '100%',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 8,
    },
    progressFill: {
        height: '100%',
        borderRadius: 4,
    },
    progressText: {
        fontSize: 14,
    },
    infoText: {
        fontSize: 14,
        marginTop: 20,
        textAlign: 'center',
    },
    errorContainer: {
        marginTop: 20,
        padding: 20,
        backgroundColor: '#ffebee',
        borderRadius: 12,
    },
    errorText: {
        color: '#c62828',
        fontSize: 16,
        textAlign: 'center',
    },
});
