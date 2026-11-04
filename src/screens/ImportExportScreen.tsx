import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import DataManagementCard from '@components/data/DataManagementCard';
import { ScreenWrapper } from '@components/common/ScreenWrapper';
import { useTheme } from '@context/ThemeContext';
import { type, space, layout } from '@styles/theme';

// Profile → Data → Import / export: backup, restore, CSV import, Excel export, device sync and reset.
const ImportExportScreen = ({ navigation }: any) => {
    const { ds } = useTheme();

    return (
        <ScreenWrapper scrollable={false} noPadding>
            <View style={styles.topBar}>
                <Pressable onPress={() => navigation.goBack()} accessibilityLabel="Back" hitSlop={space[2]}>
                    <Ionicons name="chevron-back" size={22} color={ds.text2} />
                </Pressable>
                <Text style={[type.title, { color: ds.text }]}>Import / export</Text>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                <DataManagementCard navigation={navigation} />
            </ScrollView>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[2],
        paddingTop: space[1],
        paddingHorizontal: space[5],
    },
    content: {
        paddingHorizontal: layout.groupInset,
        paddingBottom: space[7],
    },
});

export default ImportExportScreen;
