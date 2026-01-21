import React from 'react';
import { View, Text, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import BottomModal from '../../common/BottomModal';
import { Button } from '../../index';

interface SupportModalProps {
    visible: boolean;
    onClose: () => void;
}

const SupportModal: React.FC<SupportModalProps> = ({ visible, onClose }) => {
    const { colors } = useTheme();

    const handlePayPalPress = () => {
        Linking.openURL('https://paypal.me/hansoctantan');
        onClose();
    };

    // Add more handlers here for future support options
    // const handleKofiPress = () => {
    //     Linking.openURL('https://ko-fi.com/yourname');
    //     onClose();
    // };

    return (
        <BottomModal visible={visible} onClose={onClose}>
            <Text style={{ color: colors.text, fontSize: 20, fontWeight: 'bold', marginBottom: 15 }}>
                💙 Support Development
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 14, marginBottom: 20, lineHeight: 20 }}>
                WealthSnap is completely free and ad-free. Your support helps keep it that way!
            </Text>

            {/* PayPal Option */}
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

            {/* Add more support options here */}
            {/* Example:
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
            */}

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
