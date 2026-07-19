import React from 'react';
import { View, StyleSheet } from 'react-native';
import BottomModal from '@components/common/BottomModal';
import { ReorderList, ReorderItem } from '@components/common/ReorderList';

interface HomeSettingsModalProps {
    visible: boolean;
    onClose: () => void;
    cardOrder: string[];
    onUpdateCardOrder: (newOrder: string[]) => void;
}

const HomeSettingsModal: React.FC<HomeSettingsModalProps> = ({
    visible,
    onClose,
    cardOrder,
    onUpdateCardOrder,
}) => {
    const getCardItems = (): ReorderItem[] => {
        const labels: Record<string, string> = {
            'financial-health': 'Financial Health',
            'cash-flow': 'Cash Flow',
            'portfolio': 'Investments',
            'debt': 'Debts & Liabilities',
            'transactions': 'Recent Transactions'
        };
        // Combine saved order with all valid keys to ensure nothing is missing
        const uniqueIds = Array.from(new Set([...cardOrder, ...Object.keys(labels)]));
        // Filter out any garbage IDs that are not in our labels map
        const finalOrder = uniqueIds.filter(id => labels[id]);

        return finalOrder.map(id => ({ id, label: labels[id] }));
    };

    return (
        <BottomModal
            visible={visible}
            onClose={onClose}
            title="Reorder Dashboard"
            maxHeight="85%"
        >
            <View style={styles.container}>
                <ReorderList
                    items={getCardItems()}
                    onReorder={(newItems) => onUpdateCardOrder(newItems.map(i => i.id))}
                    containerStyle={{ maxHeight: 400 }}
                />
            </View>
        </BottomModal>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingBottom: 24,
    },
});

export default HomeSettingsModal;
