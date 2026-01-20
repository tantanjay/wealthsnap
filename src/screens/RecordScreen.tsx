import React, { useState } from 'react';
import { Alert } from 'react-native';
import { ScreenWrapper } from '../components/common/ScreenWrapper';
import RecordMenuModal from '../components/record/RecordMenuModal';
import { Transaction, TransactionType } from '../types';
import { useFocusEffect } from '@react-navigation/native';
import { TransactionForm } from '../components/transaction/TransactionForm';

type ViewMode = 'MENU' | 'TRANSACTION' | 'INVESTMENT' | 'AI';

const RecordScreen = ({ navigation, route }: any) => {
    const [viewMode, setViewMode] = useState<ViewMode>('MENU');
    const [transactionType, setTransactionType] = useState<TransactionType>('EXPENSE');
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

    useFocusEffect(
        React.useCallback(() => {
            const { transaction } = route.params || {};

            if (transaction) {
                // Editing existing transaction - go straight to form
                setEditingTransaction(transaction);
                setTransactionType(transaction.type);
                setViewMode('TRANSACTION');
            } else {
                // New record - show menu
                setViewMode('MENU');
                setEditingTransaction(null);
            }

            return () => {
                // Clear params on blur
                navigation.setParams({ transaction: undefined });
            };
        }, [route.params, navigation])
    );

    const handleTransactionSelect = (selectedType: 'EXPENSE' | 'INCOME') => {
        setTransactionType(selectedType);
        setViewMode('TRANSACTION');
    };

    const handleInvestmentSelect = (investmentType: 'STOCKS' | 'BONDS' | 'CRYPTO' | 'FUNDS' | 'COMMODITIES') => {
        Alert.alert('Coming Soon', `${investmentType} recording will be available in a future update.`);
    };

    const handleAISelect = (aiType: 'BROWSE' | 'CAPTURE') => {
        Alert.alert('Coming Soon', `AI ${aiType} feature will be available in a future update.`);
    };

    const handleTransactionSave = () => {
        // Reset and go back
        setViewMode('MENU');
        setEditingTransaction(null);
        navigation.goBack();
    };

    const handleTransactionCancel = () => {
        setViewMode('MENU');
        setEditingTransaction(null);
    };

    return (
        <ScreenWrapper>
            {/* Transaction Form */}
            {viewMode === 'TRANSACTION' && (
                <TransactionForm
                    transactionType={transactionType}
                    initialTransaction={editingTransaction || undefined}
                    onSave={handleTransactionSave}
                    onCancel={handleTransactionCancel}
                />
            )}

            {/* Record Menu Modal */}
            <RecordMenuModal
                visible={viewMode === 'MENU'}
                onClose={() => navigation.goBack()}
                onSelectTransaction={handleTransactionSelect}
                onSelectInvestment={handleInvestmentSelect}
                onSelectAI={handleAISelect}
            />
        </ScreenWrapper>
    );
};

export default RecordScreen;
