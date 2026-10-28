import React from 'react';
import { Text, Pressable, Linking, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import BottomModal from '@components/common/BottomModal';
import { Row } from '@components/ds';
import { useTheme } from '@context/ThemeContext';
import { type, space, radius } from '@styles/theme';
import { CONFIG } from '@constants/config';

interface SupportModalProps {
    visible: boolean;
    onClose: () => void;
}

const SupportModal: React.FC<SupportModalProps> = ({ visible, onClose }) => {
    const { ds } = useTheme();

    const handlePress = async (url: string) => {
        const supported = await Linking.canOpenURL(url);
        if (supported) {
            await Linking.openURL(url);
        }
        onClose();
    };

    const openIcon = <Ionicons name="open-outline" size={16} color={ds.text3} />;

    return (
        <BottomModal
            visible={visible}
            onClose={onClose}
            title="Back the human layer"
            footer={
                <Pressable onPress={onClose} style={[styles.button, { backgroundColor: ds.accent }]} accessibilityRole="button">
                    <Text style={[type.bodyStrong, { color: ds.onAccent }]}>Close</Text>
                </Pressable>
            }
        >
            <Text style={[type.small, styles.intro, { color: ds.text2 }]}>
                WealthSnap is free because its architecture costs nothing to run.
                {'\n\n'}
                The logic, design, and decisions still come from one person. Supporting the project helps keep that human layer focused, motivated, and able to keep improving the app long-term.
            </Text>

            <Row
                icon="cafe-outline"
                title="Ko-fi"
                subtitle="Buy me a coffee"
                trailing={openIcon}
                onPress={() => handlePress('https://ko-fi.com/christianjay66500')}
                last={!CONFIG.SHOW_PAYPAL_SUPPORT}
            />

            {CONFIG.SHOW_PAYPAL_SUPPORT && (
                <Row
                    icon="logo-paypal"
                    title="PayPal"
                    subtitle="One-time donation"
                    trailing={openIcon}
                    onPress={() => handlePress('https://paypal.me/hansoctantan')}
                    last
                />
            )}
        </BottomModal>
    );
};

const styles = StyleSheet.create({
    intro: {
        marginBottom: space[2],
    },
    button: {
        height: 48,
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default SupportModal;
