import React from 'react';
import { Text, Pressable, Linking, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import BottomModal from '@components/common/BottomModal';
import { Row } from '@components/ds';
import { useTheme } from '@context/ThemeContext';
import { type, space, radius } from '@styles/theme';

interface ContactDeveloperModalProps {
    visible: boolean;
    onClose: () => void;
}

const ContactDeveloperModal: React.FC<ContactDeveloperModalProps> = ({ visible, onClose }) => {
    const { ds } = useTheme();

    const handlePress = async (url: string) => {
        const supported = await Linking.canOpenURL(url);
        if (supported) {
            await Linking.openURL(url);
        }
        onClose();
    };

    return (
        <BottomModal
            visible={visible}
            onClose={onClose}
            title="Contact developer"
            footer={
                <Pressable onPress={onClose} style={[styles.button, { backgroundColor: ds.accent }]} accessibilityRole="button">
                    <Text style={[type.bodyStrong, { color: ds.onAccent }]}>Close</Text>
                </Pressable>
            }
        >
            <Text style={[type.small, styles.intro, { color: ds.text2 }]}>
                Have questions, feature ideas, or just want to say hi? Reach out directly.
            </Text>

            <Row
                icon="logo-twitter"
                title="@WealthSnapApp"
                subtitle="Ping me on Twitter"
                trailing={<Ionicons name="open-outline" size={16} color={ds.text3} />}
                onPress={() => handlePress('https://twitter.com/WealthSnapApp')}
                last
            />
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

export default ContactDeveloperModal;
