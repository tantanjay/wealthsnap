import React from 'react';
import { View, Text, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import BottomModal from '@components/common/BottomModal';
import { Button } from '@components/index';
import { useTheme } from '@context/ThemeContext';
import { CONFIG } from '@constants/config';

interface SupportModalProps {
    visible: boolean;
    onClose: () => void;
}

const SupportModal: React.FC<SupportModalProps> = ({ visible, onClose }) => {
    const { colors } = useTheme();

    const handleKofiPress = () => {
        Linking.openURL('https://ko-fi.com/christianjay66500');
        onClose();
    };

    const handlePayPalPress = () => {
        Linking.openURL('https://paypal.me/hansoctantan');
        onClose();
    };

    return (
        <BottomModal visible={visible} onClose={onClose}>
            <Text style={{ color: colors.text, fontSize: 20, fontWeight: 'bold', marginBottom: 15 }}>
                💙 Support Development
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 14, marginBottom: 20, lineHeight: 20 }}>
                WealthSnap is free because its architecture costs nothing to run. Your support simply helps me dedicate more time to its ongoing craft and future features.
            </Text>

            {/* Support Developer (Ko-fi) */}
            <TouchableOpacity
                onPress={handleKofiPress}
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 16,
                    backgroundColor: colors.surface,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: colors.border,
                    marginBottom: 12,
                }}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="cafe" size={24} color="#FF5E5B" />
                    <View style={{ marginLeft: 12 }}>
                        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>Ko-fi</Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Buy me a coffee</Text>
                    </View>
                </View>
                <Ionicons name="open-outline" size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            {/* PayPal Option */}
            {CONFIG.SHOW_PAYPAL_SUPPORT && (
                <TouchableOpacity
                    onPress={handlePayPalPress}
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: 16,
                        backgroundColor: colors.surface,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: colors.border,
                        marginBottom: 12,
                    }}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name="logo-paypal" size={24} color="#00457C" />
                        <View style={{ marginLeft: 12 }}>
                            <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>PayPal</Text>
                            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>One-time donation</Text>
                        </View>
                    </View>
                    <Ionicons name="open-outline" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
            )}

            <Button
                variant="outline"
                title="Close"
                onPress={onClose}
                style={{ marginTop: 10 }}
            />
        </BottomModal>
    );
};

export default SupportModal;
