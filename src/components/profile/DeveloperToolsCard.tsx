import React from 'react';
import { ActivityIndicator } from 'react-native';

import { Row, SectionHeader } from '@components/ds';
import { useTheme } from '@context/ThemeContext';

interface DeveloperToolsCardProps {
    onShareLogs: () => void;
    onSimulateCrash: () => void;
    onRunAutoBackup: () => void;
    isRunningAutoBackup?: boolean;
}

const DeveloperToolsCard: React.FC<DeveloperToolsCardProps> = ({ onShareLogs, onSimulateCrash, onRunAutoBackup, isRunningAutoBackup }) => {
    const { ds } = useTheme();

    return (
        <>
            <SectionHeader title="Developer options" />
            <Row icon="share-social-outline" title="Share crash log" onPress={onShareLogs} />
            <Row
                icon="cloud-upload-outline"
                title={isRunningAutoBackup ? 'Running auto backup…' : 'Run auto backup now'}
                onPress={isRunningAutoBackup ? undefined : onRunAutoBackup}
                trailing={isRunningAutoBackup ? <ActivityIndicator size="small" color={ds.accent} /> : undefined}
            />
            <Row icon="warning-outline" title="Simulate crash" onPress={onSimulateCrash} last />
        </>
    );
};

export default DeveloperToolsCard;
