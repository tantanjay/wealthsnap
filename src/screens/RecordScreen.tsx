import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BigNumber } from 'bignumber.js';
import { BackHandler } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import RecordMenuModal from '@components/record/RecordMenuModal';
import { ScreenWrapper } from '@components/common/ScreenWrapper';
import { TransactionForm } from '@components/transaction/TransactionForm';
import { TransferForm } from '@components/transaction/TransferForm';
import { InvestmentForm } from '@components/record/InvestmentForm';
import { ReceiptReviewForm } from '@components/ai/ReceiptReviewForm';
import { useAlert } from '@context/AlertContext';
import { Transaction, TransactionType, ReceiptAnalysisResult, InvestmentType, DebtType, Investment } from '@types';
import { generateUUID } from '@utils/uuid';
import { saveTransactionWithReceipt } from '@services/domain';

type ViewMode = 'MENU' | 'TRANSACTION' | 'INVESTMENT' | 'AI' | 'AI_REVIEW';

const RecordScreen = ({ navigation, route }: any) => {
    const [viewMode, setViewMode] = useState<ViewMode>('MENU');
    const [modalVisible, setModalVisible] = useState<boolean>(true);
    const [transactionType, setTransactionType] = useState<TransactionType>('EXPENSE');
    const [investmentType, setInvestmentType] = useState<InvestmentType>('STOCKS');
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
    const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);
    const [capturedImageUri, setCapturedImageUri] = useState<string | null>(null);

    // Ref for viewMode to access current value in focus effect without triggering re-runs
    const viewModeRef = useRef(viewMode);
    useEffect(() => {
        viewModeRef.current = viewMode;
    }, [viewMode]);

    // Listen for tab press events to reopen modal
    useEffect(() => {
        const unsubscribe = navigation.addListener('tabPress', (e: any) => {
            // Only intercept if we're already on this screen (focused)
            const isFocused = navigation.isFocused();
            if (isFocused && viewMode !== 'MENU' && viewMode !== 'AI_REVIEW' && !modalVisible) {
                e.preventDefault();
                setModalVisible(true);
            }
        });

        return unsubscribe;
    }, [navigation, viewMode, modalVisible]);

    // Handle Transaction Cancel (Moved up for useEffect dependency)
    const handleTransactionCancel = useCallback(() => {
        // Reset to menu view and show modal again when canceling
        setViewMode('MENU');
        setModalVisible(true);
        setEditingTransaction(null);
        setCapturedImageUri(null);
    }, []);

    // Handle Android Back Button
    useEffect(() => {
        const backAction = () => {
            if (viewMode === 'TRANSACTION' || viewMode === 'INVESTMENT') {
                handleTransactionCancel();
                return true;
            }
            if (viewMode === 'AI_REVIEW') {
                // Let ReceiptReviewForm handle its own back logic via its own BackHandler
                // But if it bubbles up or if we want to force reset:
                handleTransactionCancel(); // Resets to Menu
                return true;
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
    }, [viewMode, modalVisible, handleTransactionCancel]);

    useFocusEffect(
        useCallback(() => {
            const { transaction } = route.params || {};

            if (transaction) {
                // Editing existing transaction - go straight to form
                // Deserialize amount if it's a string (from navigation params)
                const deserializedTransaction = {
                    ...transaction,
                    amount: typeof transaction.amount === 'string' ? new BigNumber(transaction.amount) : transaction.amount
                };
                setEditingTransaction(deserializedTransaction);
                setTransactionType(transaction.type);
                setViewMode('TRANSACTION');
                setModalVisible(false); // Hide modal when editing
            } else {
                // New record - show menu (only if not already in a process)
                if (viewModeRef.current !== 'AI_REVIEW') {
                    setViewMode('MENU');
                    setModalVisible(true);
                    setEditingTransaction(null);
                }
            }

            return () => {
                // Clear params on blur
                navigation.setParams({ transaction: undefined });
            };
        }, [route.params, navigation])
    );

    const handleTransactionSelect = (selectedType: TransactionType) => {
        setTransactionType(selectedType);
        setViewMode('TRANSACTION');
        setModalVisible(false); // Hide modal after selection
    };

    const { showAlert } = useAlert();

    const handleInvestmentSelect = (type: InvestmentType) => {
        if (type === 'STOCKS') {
            setInvestmentType(type);
            setViewMode('INVESTMENT');
            setModalVisible(false);
        } else {
            showAlert('Coming Soon', `${type} recording will be available in a future update.`);
        }
    };

    const handleDebtSelect = (debtType: DebtType) => {
        showAlert('Coming Soon', `${debtType} recording will be available in a future update.`);
    };

    const handleAISelect = (aiType: 'BROWSE' | 'CAPTURE', imageUri?: string) => {
        if (imageUri) {
            setCapturedImageUri(imageUri);
            setViewMode('AI_REVIEW');
            setModalVisible(false);
        } else {
            // Fallback
            setModalVisible(false);
            navigation.goBack();
        }
    };

    const handleReceiptSave = async (transactionBase: any, receiptData: ReceiptAnalysisResult, splitByCategory: boolean = false) => {
        try {
            if (splitByCategory && receiptData.items && receiptData.items.length > 0) {
                // Split Mode
                const groups: { [key: string]: typeof receiptData.items } = {};
                receiptData.items.forEach(item => {
                    const cat = item.category || 'Uncategorized';
                    if (!groups[cat]) groups[cat] = [];
                    groups[cat].push(item);
                });

                const groupKeys = Object.keys(groups);
                for (let i = 0; i < groupKeys.length; i++) {
                    const cat = groupKeys[i];
                    const items = groups[cat];
                    const total = items.reduce((sum, item) => sum.plus(item.amount), new BigNumber(0));

                    const newTransaction: Transaction = {
                        id: (Date.now() + i).toString(), // Ensure unique ID
                        type: 'EXPENSE',
                        amount: total,
                        category: cat,
                        subCategory: undefined,
                        date: transactionBase.date.toISOString(),
                        note: `${transactionBase.note} (${cat})`,
                        creationMethod: 'AI',
                        isRecurring: false,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                    };

                    // Clone receipt data but filters items for this transaction
                    const subReceiptData = {
                        ...receiptData,
                        items: items,
                        totalAmount: total
                    };

                    await saveTransactionWithReceipt(newTransaction, subReceiptData);
                }

                showAlert('Success', `Saved ${groupKeys.length} transactions from receipt!`, [
                    {
                        text: "OK", onPress: () => {
                            setViewMode('MENU');
                            setModalVisible(false);
                            setCapturedImageUri(null);
                        }
                    }
                ]);

            } else {
                // Single Transaction Mode (Original Logic)
                const newTransaction: Transaction = {
                    id: generateUUID(),
                    type: 'EXPENSE',
                    amount: transactionBase.amount,

                    category: 'Others', // Placeholder, will calculate below
                    subCategory: undefined,
                    date: transactionBase.date.toISOString(),
                    note: transactionBase.note,
                    creationMethod: 'AI',
                    isRecurring: false,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };

                // Calculate primary category
                if (receiptData.items) {
                    const categorySums: { [key: string]: BigNumber } = {};
                    receiptData.items.forEach(item => {
                        const cat = item.category || 'Uncategorized';
                        categorySums[cat] = (categorySums[cat] || new BigNumber(0)).plus(item.amount);
                    });

                    let maxSum = new BigNumber(0);
                    Object.entries(categorySums).forEach(([cat, sum]) => {
                        if (sum.gt(maxSum)) {
                            maxSum = sum;
                            newTransaction.category = cat;
                        }
                    });
                }

                await saveTransactionWithReceipt(newTransaction, receiptData);

                showAlert('Success', 'Transaction saved from receipt!', [
                    {
                        text: "OK", onPress: () => {
                            setViewMode('MENU');
                            setModalVisible(false);
                            setCapturedImageUri(null);
                        }
                    }
                ]);
            }

        } catch (error) {
            console.error(error);
            showAlert('Error', 'Failed to save receipt transaction.');
        }
    };

    const handleTransactionSave = () => {
        // Reset and go back
        setViewMode('MENU');
        setEditingTransaction(null);
        setEditingInvestment(null);
        navigation.goBack();
    };



    return (
        <ScreenWrapper scrollable={viewMode !== 'TRANSACTION' && viewMode !== 'AI_REVIEW' && viewMode !== 'INVESTMENT'}>
            {/* Transaction Form */}
            {viewMode === 'TRANSACTION' && transactionType !== 'TRANSFER_IN' && transactionType !== 'TRANSFER_OUT' && (
                <TransactionForm
                    key={`${transactionType}-${editingTransaction?.id || 'new'}`}
                    transactionType={transactionType}
                    initialTransaction={editingTransaction || undefined}
                    onSave={handleTransactionSave}
                    onCancel={handleTransactionCancel}
                />
            )}

            {/* Transfer Form */}
            {viewMode === 'TRANSACTION' && (transactionType === 'TRANSFER_IN' || transactionType === 'TRANSFER_OUT') && (
                <TransferForm
                    key={`TRANSFER-${transactionType}-${editingTransaction?.id || 'new'}`}
                    initialType={transactionType as 'TRANSFER_IN' | 'TRANSFER_OUT'}
                    initialTransaction={editingTransaction || undefined}
                    onSave={handleTransactionSave}
                    onCancel={handleTransactionCancel}
                />
            )}

            {/* Investment Form */}
            {viewMode === 'INVESTMENT' && (
                <InvestmentForm
                    key={`${investmentType}-${editingInvestment?.id || 'new'}`}
                    investmentType={investmentType}
                    initialInvestment={editingInvestment || undefined}
                    onSave={handleTransactionSave}
                    onCancel={handleTransactionCancel}
                />
            )}

            {/* AI Receipt Review Form */}
            {viewMode === 'AI_REVIEW' && capturedImageUri && (
                <ReceiptReviewForm
                    imageUri={capturedImageUri}
                    onSave={handleReceiptSave}
                    onCancel={handleTransactionCancel}
                />
            )}

            {/* Record Menu Modal */}
            <RecordMenuModal
                visible={modalVisible}
                onClose={() => {
                    setModalVisible(false);
                    if (viewMode === 'MENU' && navigation.canGoBack()) {
                        // Only go back if we haven't selected anything yet and can go back
                        navigation.goBack();
                    }
                }}
                onSelectTransaction={handleTransactionSelect}
                onSelectInvestment={handleInvestmentSelect}
                onSelectAI={handleAISelect}
                onSelectDebt={handleDebtSelect}
            />
        </ScreenWrapper>
    );
};

export default RecordScreen;
