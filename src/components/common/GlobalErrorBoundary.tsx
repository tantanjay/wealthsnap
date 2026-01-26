import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Updates from 'expo-updates';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ASYNC_KEYS } from '../../constants/config';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null
        };
    }

    static getDerivedStateFromError(error: Error): State {
        return {
            hasError: true,
            error,
            errorInfo: null
        };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
        this.setState({
            error,
            errorInfo
        });

        // Save crash report for later analysis
        this.saveCrashReport(error, errorInfo);
    }

    saveCrashReport = async (error: Error, errorInfo: ErrorInfo) => {
        try {
            const report = {
                timestamp: new Date().toISOString(),
                message: error.message,
                stack: error.stack,
                componentStack: errorInfo.componentStack
            };
            await AsyncStorage.setItem(ASYNC_KEYS.CRASH_REPORT, JSON.stringify(report));
        } catch (e) {
            console.error('Failed to save crash report', e);
        }
    }

    handleRestart = async () => {
        try {
            await Updates.reloadAsync();
        } catch (e) {
            // Fallback if reloadAsync fails or not available in dev client sometimes
            this.setState({ hasError: false, error: null, errorInfo: null });
        }
    };

    render() {
        if (this.state.hasError) {
            return (
                <View style={styles.container}>
                    <View style={styles.content}>
                        <Ionicons name="alert-circle" size={64} color="#FF6B6B" />
                        <Text style={styles.title}>Oops! Something went wrong.</Text>
                        <Text style={styles.subtitle}>
                            We're sorry, but the app has encountered an unexpected error.
                        </Text>

                        <ScrollView style={styles.errorContainer}>
                            <Text style={styles.errorText}>
                                {this.state.error && this.state.error.toString()}
                            </Text>
                        </ScrollView>

                        <TouchableOpacity style={styles.button} onPress={this.handleRestart}>
                            <Text style={styles.buttonText}>Reload App</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            );
        }

        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        justifyContent: 'center',
        padding: 20,
    },
    content: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginTop: 20,
        marginBottom: 10,
        color: '#333',
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 30,
    },
    errorContainer: {
        maxHeight: 200,
        width: '100%',
        backgroundColor: '#f8f9fa',
        padding: 15,
        borderRadius: 8,
        marginBottom: 30,
        borderWidth: 1,
        borderColor: '#eee',
    },
    errorText: {
        fontFamily: 'monospace',
        fontSize: 12,
        color: '#e03131',
    },
    button: {
        backgroundColor: '#007AFF', // Primary Blue
        paddingVertical: 14,
        paddingHorizontal: 30,
        borderRadius: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    }
});
