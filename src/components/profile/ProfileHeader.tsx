import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { useTheme } from '@context/ThemeContext';
import { type, space, radius, layout } from '@styles/theme';
import { UserProfile } from '@types';

const AVATAR_SIZE = 56;

const ProfileHeader: React.FC<{ profile: UserProfile | null }> = ({ profile }) => {
    const { ds } = useTheme();
    const name = profile?.name?.trim() || 'Profile';
    const since = profile?.createdAt
        ? new Date(profile.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
        : null;

    return (
        <View style={styles.header}>
            <View style={[styles.avatar, { backgroundColor: ds.accentSoft }]}>
                <Text style={[type.title, { color: ds.accent }]}>{name.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.main}>
                <Text style={[type.title, { color: ds.text }]} numberOfLines={1}>{name}</Text>
                {profile && (
                    <Text style={[type.small, { color: ds.text2 }]}>
                        {profile.currency}{since ? ` · since ${since}` : ''}
                    </Text>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[4],
        paddingTop: space[2],
        paddingBottom: space[1],
        paddingHorizontal: layout.groupPadding,
    },
    avatar: {
        width: AVATAR_SIZE,
        height: AVATAR_SIZE,
        borderRadius: radius.full,
        alignItems: 'center',
        justifyContent: 'center',
    },
    main: {
        flex: 1,
        minWidth: 0,
    },
});

export default ProfileHeader;
