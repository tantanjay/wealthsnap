import React, { useState, useEffect } from 'react';
import { BackHandler } from 'react-native';
import { ScreenWrapper } from '../components/common/ScreenWrapper';
import { useAlert } from '../context/AlertContext';
import RecordMenuModal from '../components/record/RecordMenuModal';
import { Transaction, TransactionType } from '../types';
import { useFocusEffect } from '@react-navigation/native';
import { TransactionForm } from '../components/transaction/TransactionForm';

type ViewMode = 'MENU' | 'TRANSACTION' | 'INVESTMENT' | 'AI';

const RecordScreen = ({ navigation, route }: any) => {
    const [viewMode, setViewMode] = useState<ViewMode>('MENU');
    const [modalVisible, setModalVisible] = useState<boolean>(true);
    const [transactionType, setTransactionType] = useState<TransactionType>('EXPENSE');
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

    // Listen for tab press events to reopen modal
    useEffect(() => {
        const unsubscribe = navigation.addListener('tabPress', (e: any) => {
            // Only intercept if we're already on this screen (focused)
            const isFocused = navigation.isFocused();
            if (isFocused && viewMode === 'TRANSACTION' && !modalVisible) {
                e.preventDefault();
                setModalVisible(true);
            }
        });

        return unsubscribe;
    }, [navigation, viewMode, modalVisible]);

    // Handle Android Back Button
    useEffect(() => {
        const backAction = () => {
            if (viewMode === 'TRANSACTION') {
                handleTransactionCancel();
                return true; // Prevent default behavior
            }
            // If modal is open, let standard modal behavior handle it (or default back)
            if (viewMode === 'MENU' && modalVisible) {
                // Let the modal close itself or navigation go back
                return false;
            }
            return false;
        };

        const backHandler = BackHandler.addEventListener(
            'hardwareBackPress',
            backAction
        );

        return () => backHandler.remove();
    }, [viewMode, modalVisible]);

    useFocusEffect(
        React.useCallback(() => {
            const { transaction } = route.params || {};

            if (transaction) {
                // Editing existing transaction - go straight to form
                setEditingTransaction(transaction);
                setTransactionType(transaction.type);
                setViewMode('TRANSACTION');
                setModalVisible(false); // Hide modal when editing
            } else {
                // New record - show menu
                setViewMode('MENU');
                setModalVisible(true);
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
        setModalVisible(false); // Hide modal after selection
    };

    const { showAlert } = useAlert();

    const handleInvestmentSelect = (investmentType: 'STOCKS' | 'BONDS' | 'CRYPTO' | 'FUNDS' | 'COMMODITIES') => {
        showAlert('Coming Soon', `${investmentType} recording will be available in a future update.`);
    };

    const handleAISelect = (aiType: 'BROWSE' | 'CAPTURE') => {
        setModalVisible(false);
        navigation.goBack();
    };

    const handleTransactionSave = () => {
        // Reset and go back
        setViewMode('MENU');
        setEditingTransaction(null);
        navigation.goBack();
    };

    const handleTransactionCancel = () => {
        // Reset to menu view and show modal again when canceling
        setViewMode('MENU');
        setModalVisible(true);
        setEditingTransaction(null);
    };

    return (
        <ScreenWrapper>
            {/* Transaction Form */}
            {viewMode === 'TRANSACTION' && (
                <TransactionForm
                    key={`${transactionType}-${editingTransaction?.id || 'new'}`}
                    transactionType={transactionType}
                    initialTransaction={editingTransaction || undefined}
                    onSave={handleTransactionSave}
                    onCancel={handleTransactionCancel}
                />
            )}

            {/* Record Menu Modal */}
            <RecordMenuModal
                visible={modalVisible}
                onClose={() => {
                    setModalVisible(false);
                    if (viewMode === 'MENU') {
                        // Only go back if we haven't selected anything yet
                        navigation.goBack();
                    }
                }}
                onSelectTransaction={handleTransactionSelect}
                onSelectInvestment={handleInvestmentSelect}
                onSelectAI={handleAISelect}
            />
        </ScreenWrapper>
    );
};

export default RecordScreen;
