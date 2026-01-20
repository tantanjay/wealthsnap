import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useTheme } from '../../context/ThemeContext';
import BottomModal from '../common/BottomModal';

interface RecordMenuModalProps {
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
    const [status, requestPermission] = ImagePicker.useMediaLibraryPermissions();
    const [cameraStatus, requestCameraPermission] = ImagePicker.useCameraPermissions();

    const processImage = async (uri: string, width: number, height: number) => {
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
            // TODO: Pass this result to the AI processing service
        } catch (error) {
            console.error('Error processing image:', error);
            Alert.alert('Error', 'Failed to process image for AI analysis.');
        }
    };

    const handleBrowse = async () => {
        if (status?.status !== 'granted') {
            const response = await requestPermission();
            if (!response.granted) {
                Alert.alert('Permission needed', 'Please grant photo library access to browse receipts.');
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
                onSelectAI('BROWSE');
            }
        } catch (error) {
            console.error('Error browsing:', error);
        }
    };

    const handleCapture = async () => {
        if (cameraStatus?.status !== 'granted') {
            const response = await requestCameraPermission();
            if (!response.granted) {
                Alert.alert('Permission needed', 'Please grant camera access to capture receipts.');
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
                onSelectAI('CAPTURE');
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
            title="New Record"
            subtitle="Choose what you want to record"
            maxHeight="80%"
        >
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
