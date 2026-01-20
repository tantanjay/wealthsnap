import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useTheme } from '../../context/ThemeContext';
import BottomModal from '../common/BottomModal';
import { analyzeReceiptImage } from '../../services/geminiService';
import { saveTransaction } from '../../services/storageService';
import { Transaction, ReceiptItem } from '../../types';

import { useAlert } from '../../context/AlertContext';

export interface RecordMenuModalProps {
    visible: boolean;
    onClose: () => void;
    onSelectTransaction: (type: 'EXPENSE' | 'INCOME') => void;
    onSelectInvestment: (type: 'STOCKS' | 'BONDS' | 'CRYPTO' | 'FUNDS' | 'COMMODITIES') => void;
    onSelectAI: (type: 'BROWSE' | 'CAPTURE') => void;
}

const RecordMenuModal: React.FC<RecordMenuModalProps> = ({
    visible,
    onClose,
    onSelectTransaction,
    onSelectInvestment,
    onSelectAI,
}) => {
    const { colors } = useTheme();
    const { showAlert } = useAlert();
    const [status, requestPermission] = ImagePicker.useMediaLibraryPermissions();
    const [cameraStatus, requestCameraPermission] = ImagePicker.useCameraPermissions();

    const [loading, setLoading] = React.useState(false);

    const processImage = async (uri: string, width: number, height: number) => {
        setLoading(true);
        try {
            const MAX_DIMENSION = 1024;
            const actions: ImageManipulator.Action[] = [];

            if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
                if (width > height) {
                    actions.push({ resize: { width: MAX_DIMENSION } });
                } else {
                    actions.push({ resize: { height: MAX_DIMENSION } });
                }
            }

            // Always compress to JPEG to save tokens and ensure consistency
            const result = await ImageManipulator.manipulateAsync(
                uri,
                actions,
                { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
            );

            console.log('AI Processing Ready Image:', result);

            // Call AI Service
            const analysisResult = await analyzeReceiptImage(result.uri);
            console.log('AI Analysis Result:', JSON.stringify(analysisResult, null, 2));

            if (analysisResult.isValidReceipt && analysisResult.items && analysisResult.items.length > 0) {
                const items = analysisResult.items;

                // 1. Calculate Total Amount
                const totalAmount = analysisResult.totalAmount || items.reduce((sum, item) => sum + item.amount, 0);

                // 2. Determine Primary Category (Category with highest spend)
                const categorySums: { [key: string]: number } = {};
                items.forEach(item => {
                    if (item.category) {
                        categorySums[item.category] = (categorySums[item.category] || 0) + item.amount;
                    }
                });

                let primaryCategory = 'Others';
                let maxCategorySum = 0;

                Object.entries(categorySums).forEach(([cat, sum]) => {
                    if (sum > maxCategorySum) {
                        maxCategorySum = sum;
                        primaryCategory = cat;
                    }
                });

                // 3. Construct Note
                const merchant = analysisResult.merchantName || 'Unknown Vendor';
                const itemSummary = items.map(i => `${i.description} (${i.quantity}x)`).join(', ');
                const note = `Receipt from ${merchant}: ${itemSummary}`;

                // 4. Create Transaction
                const newTransaction: Transaction = {
                    id: Date.now().toString(),
                    type: 'EXPENSE', // Receipts are usually expenses
                    amount: totalAmount,
                    category: primaryCategory,
                    date: analysisResult.date ? new Date(analysisResult.date).toISOString() : new Date().toISOString(),
                    note: note,
                    creationMethod: 'AI',
                    isRecurring: false,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };

                await saveTransaction(newTransaction);

                showAlert(
                    "Success",
                    "Transaction added from receipt!",
                    [{ text: "OK", onPress: () => onSelectAI('CAPTURE') }] // Triggers goBack in parent
                );

            } else {
                showAlert("Analysis Failed", analysisResult.validationError || "Could not extract receipt data.");
            }

        } catch (error) {
            console.error('Error processing image:', error);
            showAlert('Error', 'Failed to process image for AI analysis.');
        } finally {
            setLoading(false);
        }
    };

    const handleBrowse = async () => {
        if (status?.status !== 'granted') {
            const response = await requestPermission();
            if (!response.granted) {
                showAlert('Permission needed', 'Please grant photo library access to browse receipts.');
                return;
            }
        }

        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: false,
                quality: 0.5,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                await processImage(asset.uri, asset.width, asset.height);
                // onSelectAI('BROWSE'); // Removed to let success alert trigger it
            }
        } catch (error) {
            console.error('Error browsing:', error);
        }
    };

    const handleCapture = async () => {
        if (cameraStatus?.status !== 'granted') {
            const response = await requestCameraPermission();
            if (!response.granted) {
                showAlert('Permission needed', 'Please grant camera access to capture receipts.');
                return;
            }
        }

        try {
            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: false,
                quality: 0.5,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                await processImage(asset.uri, asset.width, asset.height);
                // onSelectAI('CAPTURE'); // Removed to let success alert trigger it
            }
        } catch (error) {
            console.error('Error capturing:', error);
        }
    };

    const MenuItem = ({
        icon,
        label,
        color,
        onPress
    }: {
        icon: keyof typeof Ionicons.glyphMap;
        label: string;
        color: string;
        onPress: () => void;
    }) => (
        <TouchableOpacity
            style={[styles.menuItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
                <Ionicons name={icon} size={24} color={color} />
            </View>
            <Text style={[styles.menuLabel, { color: colors.text }]}>{label}</Text>
        </TouchableOpacity>
    );

    return (
        <BottomModal
            visible={visible}
            onClose={onClose}
            title={loading ? "Processing Image" : "New Record"}
            subtitle={loading ? "Please wait..." : "Choose what you want to record"}
            maxHeight="80%"
            dismissable={!loading}
        >
            {loading ? (
                <View style={{ padding: 40, alignItems: 'center', justifyContent: 'center' }}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={{ marginTop: 20, fontSize: 16, color: colors.text, fontWeight: '600', textAlign: 'center' }}>
                        AI is analyzing your image...
                    </Text>
                </View>
            ) : (
                <ScrollView showsVerticalScrollIndicator={false}>
                    {/* AI Section */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>AI</Text>
                        <View style={styles.row}>
                            <MenuItem
                                icon="search"
                                label="Browse"
                                color="#9333EA"
                                onPress={handleBrowse}
                            />
                            <MenuItem
                                icon="camera"
                                label="Capture"
                                color="#9333EA"
                                onPress={handleCapture}
                            />
                        </View>
                    </View>

                    {/* Transaction Section */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Transaction</Text>
                        <View style={styles.row}>
                            <MenuItem
                                icon="arrow-down-circle"
                                label="Expense"
                                color={colors.error}
                                onPress={() => {
                                    onSelectTransaction('EXPENSE');
                                }}
                            />
                            <MenuItem
                                icon="arrow-up-circle"
                                label="Income"
                                color={colors.success}
                                onPress={() => {
                                    onSelectTransaction('INCOME');
                                }}
                            />
                        </View>
                    </View>

                    {/* Investment Section */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Investment</Text>
                        <View style={styles.row}>
                            <MenuItem
                                icon="trending-up"
                                label="Stocks"
                                color={colors.primary}
                                onPress={() => {
                                    onSelectInvestment('STOCKS');
                                }}
                            />
                            <MenuItem
                                icon="bar-chart"
                                label="Bonds"
                                color={colors.primary}
                                onPress={() => {
                                    onSelectInvestment('BONDS');
                                }}
                            />
                        </View>
                        <View style={styles.row}>
                            <MenuItem
                                icon="logo-bitcoin"
                                label="Crypto"
                                color={colors.primary}
                                onPress={() => {
                                    onSelectInvestment('CRYPTO');
                                }}
                            />
                            <MenuItem
                                icon="briefcase"
                                label="Funds"
                                color={colors.primary}
                                onPress={() => {
                                    onSelectInvestment('FUNDS');
                                }}
                            />
                        </View>
                        <View style={styles.row}>
                            <MenuItem
                                icon="diamond"
                                label="Commodities"
                                color={colors.primary}
                                onPress={() => {
                                    onSelectInvestment('COMMODITIES');
                                }}
                            />
                            <View style={styles.menuItem} />
                        </View>
                    </View>

                </ScrollView>
            )}
        </BottomModal>
    );
};

const styles = StyleSheet.create({
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    row: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12,
    },
    menuItem: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
        gap: 8,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    menuLabel: {
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
    },
});

export default RecordMenuModal;
