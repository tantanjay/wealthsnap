import React from 'react';
import { View, Text, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import BottomModal from '@components/common/BottomModal';
import { Button } from '@components/index';
import { useTheme } from '@context/ThemeContext';

interface ContactDeveloperModalProps {
    visible: boolean;
    onClose: () => void;
}

const ContactDeveloperModal: React.FC<ContactDeveloperModalProps> = ({ visible, onClose }) => {
    const { colors } = useTheme();

    const handlePress = async (url: string) => {
        const supported = await Linking.canOpenURL(url);
        if (supported) {
            await Linking.openURL(url);
        }
        onClose();
    };

    return (
        <BottomModal visible={visible} onClose={onClose}>
            <Text style={{ color: colors.text, fontSize: 20, fontWeight: 'bold', marginBottom: 15 }}>
                📡 Contact Developer
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 14, marginBottom: 20, lineHeight: 20 }}>
                Have questions, feature ideas, or just want to say hi? Reach out directly.
            </Text>

            {/* Twitter Support */}
            <TouchableOpacity
                onPress={() => handlePress('https://twitter.com/WealthSnapApp')}
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
                    <Ionicons name="logo-twitter" size={24} color="#1DA1F2" />
                    <View style={{ marginLeft: 12 }}>
                        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>@WealthSnapApp</Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Ping me on Twitter</Text>
                    </View>
                </View>
                <Ionicons name="open-outline" size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            <Button
                variant="outline"
                title="Close"
                onPress={onClose}
                style={{ marginTop: 10 }}
            />
        </BottomModal>
    );
};

export default ContactDeveloperModal;
