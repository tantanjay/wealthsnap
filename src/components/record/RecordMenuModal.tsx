import React from 'react';
import DocumentScanner from 'react-native-document-scanner-plugin';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, Pressable, StyleSheet, ScrollView, Dimensions } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import BottomModal from '@components/common/BottomModal';
import { IconName, SectionHeader } from '@components/ds';
import { useTheme } from '@context/ThemeContext';
import { useSecurity } from '@context/SecurityContext';
import { useAlert } from '@context/AlertContext';
import { DebtType, InvestmentType, TransactionType } from '@types';
import { useAIConsent } from '@hooks/useAIConsent';
import { getAllAssets } from '@services/domain/assetService';
import { navigationRef } from '@navigation/navigationRef';
import { type, space, radius } from '@styles/theme';

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

const ITEM_WIDTH = MODAL_INNER_WIDTH * 0.20;

const RecordMenuModal: React.FC<RecordMenuModalProps> = ({
    visible,
    onClose,
    onSelectTransaction,
    onSelectInvestment,
    onSelectAI,
    onSelectDebt
}) => {
    const { ds } = useTheme();
    const { showAlert } = useAlert();
    const { temporarilyDisableLock } = useSecurity();
    const { checkConsent } = useAIConsent();

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

    const sections: { title: string; items: { id: string; icon: IconName; label: string; onPress: () => void }[] }[] = [
        {
            title: 'AI assistant',
            items: [
                { id: 'scan', icon: 'scan-outline', label: 'Scan', onPress: handleCapture },
                { id: 'upload', icon: 'images-outline', label: 'Upload', onPress: handleBrowse },
                { id: 'chat', icon: 'chatbubble-ellipses-outline', label: 'Chat', onPress: handleOpenChat },
            ]
        },
        {
            title: 'Transaction',
            items: [
                { id: 'exp', icon: 'arrow-down-circle-outline', label: 'Expense', onPress: () => onSelectTransaction('EXPENSE') },
                { id: 'inc', icon: 'arrow-up-circle-outline', label: 'Income', onPress: () => onSelectTransaction('INCOME') },
                { id: 'trout', icon: 'log-out-outline', label: 'Send', onPress: () => onSelectTransaction('TRANSFER_OUT') },
                { id: 'trin', icon: 'log-in-outline', label: 'Receive', onPress: () => onSelectTransaction('TRANSFER_IN') },
            ]
        },
        {
            title: 'Investment',
            items: [
                { id: 'stk', icon: 'trending-up-outline', label: 'Stocks', onPress: () => handleInvestmentSelect('STOCKS') },
                { id: 'fnd', icon: 'briefcase-outline', label: 'Funds', onPress: () => handleInvestmentSelect('FUNDS') },
                { id: 'cry', icon: 'logo-bitcoin', label: 'Crypto', onPress: () => handleInvestmentSelect('CRYPTO') },
                { id: 'bnd', icon: 'bar-chart-outline', label: 'Bonds', onPress: () => handleInvestmentSelect('BONDS') },
                { id: 'com', icon: 'diamond-outline', label: 'Commodities', onPress: () => handleInvestmentSelect('COMMODITIES') },
            ]
        },
        {
            title: 'Debts & private loans',
            items: [
                { id: 'loan', icon: 'cash-outline', label: 'Loan', onPress: () => onSelectDebt?.('LOAN') },
                { id: 'card', icon: 'card-outline', label: 'Credit card', onPress: () => onSelectDebt?.('CREDIT_CARD') },
                { id: 'mort', icon: 'home-outline', label: 'Mortgage', onPress: () => onSelectDebt?.('MORTGAGE') },
                { id: 'iou', icon: 'arrow-redo-outline', label: 'I owe', onPress: () => onSelectDebt?.('I_OWE_YOU') },
                { id: 'uom', icon: 'arrow-undo-outline', label: 'Owed to me', onPress: () => onSelectDebt?.('YOU_OWE_ME') },
            ]
        }
    ];

    return (
        <BottomModal
            visible={visible}
            onClose={onClose}
            title="Quick actions"
            subtitle="Choose what you want to do"
            maxHeight="85%"
            style={{ width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' }}
        >
            <ScrollView showsVerticalScrollIndicator={false}>
                {sections.map((section, i) => (
                    <View key={section.title}>
                        <SectionHeader title={section.title} style={[styles.sectionHeader, i === 0 && styles.firstHeader]} />
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.shelf}
                            decelerationRate="fast"
                        >
                            {section.items.map((item) => (
                                <Pressable
                                    key={item.id}
                                    style={({ pressed }) => [
                                        styles.tile,
                                        { backgroundColor: ds.inset, width: ITEM_WIDTH, opacity: pressed ? 0.7 : 1 }
                                    ]}
                                    onPress={item.onPress}
                                >
                                    <Ionicons name={item.icon} size={20} color={ds.text2} />
                                    <Text
                                        style={[type.small, styles.tileLabel, { color: ds.text }]}
                                        numberOfLines={1}
                                        adjustsFontSizeToFit
                                    >
                                        {item.label}
                                    </Text>
                                </Pressable>
                            ))}
                        </ScrollView>
                    </View>
                ))}
            </ScrollView>
        </BottomModal>
    );
};

const styles = StyleSheet.create({
    sectionHeader: {
        marginTop: space[5],
        marginBottom: space[2],
    },
    firstHeader: {
        marginTop: 0,
    },
    shelf: {
        gap: space[2],
    },
    // Tile recipe (inset, radius md); padding tightened so five fit a phone width.
    tile: {
        aspectRatio: 1,
        padding: space[2],
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tileLabel: {
        marginTop: space[2],
        textAlign: 'center',
    },
});

export default RecordMenuModal;
