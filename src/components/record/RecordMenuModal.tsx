import React from 'react';
import DocumentScanner from 'react-native-document-scanner-plugin';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

import BottomModal from '@components/common/BottomModal';
import { useTheme } from '@context/ThemeContext';
import { useSecurity } from '@context/SecurityContext';
import { useAlert } from '@context/AlertContext';
import { DebtType, InvestmentType, TransactionType } from '@types';
import { useAIConsent } from '@hooks/useAIConsent';
import { getAllAssets } from '@services/domain/assetService';
import { navigationRef } from '@navigation/navigationRef';

export interface RecordMenuModalProps {
    visible: boolean;
    onClose: () => void;
    onSelectTransaction: (type: TransactionType) => void;
    onSelectInvestment: (type: InvestmentType) => void;
    onSelectAI: (type: 'BROWSE' | 'CAPTURE', imageUri?: string) => void;
    onSelectDebt: (type: DebtType) => void;
}

const { width } = Dimensions.get('window');
const MAX_WIDTH = 500;
const MODAL_INNER_WIDTH = Math.min(width, MAX_WIDTH);

// --- 20% WIDTH CALCULATION ---
const ITEM_WIDTH = MODAL_INNER_WIDTH * 0.20;

const RecordMenuModal: React.FC<RecordMenuModalProps> = ({
    visible,
    onClose,
    onSelectTransaction,
    onSelectInvestment,
    onSelectAI,
    onSelectDebt
}) => {
    const { colors } = useTheme();
    const { showAlert } = useAlert();
    const { temporarilyDisableLock } = useSecurity();
    const { checkConsent } = useAIConsent();
    const insets = useSafeAreaInsets(); // Hook for notch/home-bar detection

    const [cameraStatus, requestCameraPermission] = ImagePicker.useCameraPermissions();

    const handleBrowse = async () => {
        checkConsent(async () => {
            try {
                temporarilyDisableLock();
                const result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ['images'],
                    allowsEditing: false,
                    quality: 0.8,
                });
                if (!result.canceled && result.assets?.[0]) {
                    onClose();
                    setTimeout(() => onSelectAI('BROWSE', result.assets[0].uri), 100);
                }
            } catch (e) { console.error(e); }
        });
    };

    const handleCapture = async () => {
        checkConsent(async () => {
            if (cameraStatus?.status !== 'granted') {
                const response = await requestCameraPermission();
                if (!response.granted) {
                    showAlert('Permission needed', 'Please grant camera access.');
                    return;
                }
            }
            try {
                temporarilyDisableLock();
                const { scannedImages } = await DocumentScanner.scanDocument({
                    maxNumDocuments: 1,
                    croppedImageQuality: 100
                });
                if (scannedImages?.[0]) {
                    onClose();
                    setTimeout(() => onSelectAI('CAPTURE', scannedImages[0]), 100);
                }
            } catch (e) { console.error(e); }
        });
    };

    const handleOpenChat = () => {
        checkConsent(() => {
            onClose();
            if (navigationRef.isReady()) {
                navigationRef.navigate('Chat');
            }
        });
    };

    const handleInvestmentSelect = async (type: InvestmentType) => {
        try {
            const assets = await getAllAssets();
            if (assets.length === 0) {
                showAlert(
                    'No Assets Found',
                    'Please add an asset in the Profile > Asset Dictionary before recording an investment.',
                    [
                        { text: 'OK', style: 'cancel' }
                    ]
                );
                return;
            }
            onSelectInvestment(type);
        } catch (error) {
            console.error('Failed to check assets:', error);
            showAlert(
                'Error',
                'Could not verify assets. Please try again.'
            );
        }
    };

    const sections = [
        {
            title: 'AI Assistant',
            items: [
                { id: 'scan', icon: 'scan', label: 'Scan', color: '#9333EA', onPress: handleCapture },
                { id: 'upload', icon: 'images', label: 'Upload', color: '#9333EA', onPress: handleBrowse },
                { id: 'chat', icon: 'chatbubble-ellipses', label: 'Chat', color: '#9333EA', onPress: handleOpenChat },
            ]
        },
        {
            title: 'Transaction',
            items: [
                { id: 'exp', icon: 'arrow-down-circle', label: 'Expense', color: colors.error, onPress: () => onSelectTransaction('EXPENSE') },
                { id: 'inc', icon: 'arrow-up-circle', label: 'Income', color: colors.success, onPress: () => onSelectTransaction('INCOME') },
                { id: 'trout', icon: 'log-out-outline', label: 'Send', color: colors.error, onPress: () => onSelectTransaction('TRANSFER_OUT') },
                { id: 'trin', icon: 'log-in-outline', label: 'Receive', color: colors.success, onPress: () => onSelectTransaction('TRANSFER_IN') },
            ]
        },
        {
            title: 'Investment',
            items: [
                { id: 'stk', icon: 'trending-up', label: 'Stocks', color: colors.primary, onPress: () => handleInvestmentSelect('STOCKS') },
                { id: 'fnd', icon: 'briefcase', label: 'Funds', color: colors.primary, onPress: () => handleInvestmentSelect('FUNDS') },
                { id: 'cry', icon: 'logo-bitcoin', label: 'Crypto', color: colors.primary, onPress: () => handleInvestmentSelect('CRYPTO') },
                { id: 'bnd', icon: 'bar-chart', label: 'Bonds', color: colors.primary, onPress: () => handleInvestmentSelect('BONDS') },
                { id: 'com', icon: 'diamond', label: 'Commodities', color: colors.primary, onPress: () => handleInvestmentSelect('COMMODITIES') },
            ]
        },
        {
            title: 'Debts & Private Loans',
            items: [
                { id: 'loan', icon: 'cash-outline', label: 'Loan', color: '#F59E0B', onPress: () => onSelectDebt?.('LOAN') },
                { id: 'card', icon: 'card-outline', label: 'Credit Card', color: '#F59E0B', onPress: () => onSelectDebt?.('CREDIT_CARD') },
                { id: 'mort', icon: 'home-outline', label: 'Mortgage', color: '#F59E0B', onPress: () => onSelectDebt?.('MORTGAGE') },
                { id: 'iou', icon: 'arrow-redo-outline', label: 'I Owe', color: '#EF4444', onPress: () => onSelectDebt?.('I_OWE_YOU') },
                { id: 'uom', icon: 'arrow-undo-outline', label: 'Owed to Me', color: '#10B981', onPress: () => onSelectDebt?.('YOU_OWE_ME') },
            ]
        }
    ];

    return (
        <BottomModal
            visible={visible}
            onClose={onClose}
            title="Quick Actions"
            subtitle="Choose what you want to do"
            maxHeight="85%"
            style={{ width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' }}
        >
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[
                    styles.mainScroll,
                    // Dynamically set bottom padding based on device insets
                    { paddingBottom: Math.max(insets.bottom, 20) }
                ]}
            >
                {sections.map((section) => (
                    <View key={section.title} style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>
                            {section.title}
                        </Text>

                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.horizontalScrollContent}
                            decelerationRate="fast"
                        >
                            {section.items.map((item) => (
                                <TouchableOpacity
                                    key={item.id}
                                    style={[
                                        styles.menuItem,
                                        {
                                            backgroundColor: colors.surface,
                                            borderColor: colors.border,
                                            width: ITEM_WIDTH
                                        }
                                    ]}
                                    onPress={item.onPress}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
                                        <Ionicons name={item.icon as any} size={22} color={item.color} />
                                    </View>
                                    <Text
                                        style={[styles.menuLabel, { color: colors.text }]}
                                        numberOfLines={1}
                                        adjustsFontSizeToFit
                                    >
                                        {item.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                ))}
            </ScrollView>
        </BottomModal>
    );
};

const styles = StyleSheet.create({
    mainScroll: {
        paddingVertical: 10,
    },
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: 'bold',
        marginBottom: 10,
        opacity: 0.5,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    horizontalScrollContent: {
        gap: 12,
    },
    menuItem: {
        aspectRatio: 1,
        padding: 6,
        borderRadius: 18,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    menuLabel: {
        fontSize: 10,
        fontWeight: '700',
        textAlign: 'center',
    },
});

export default RecordMenuModal;