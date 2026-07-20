import React, { useState, useCallback } from 'react';
import { Modal, BackHandler } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';

import ImportDataModal from '@components/data/ImportDataModal';
import ImportProcessScreen from '@components/data/ImportProcessScreen';
import { useAlert } from '@context/AlertContext';
import { useSecurity } from '@context/SecurityContext';
import { Transaction } from '@types';
import { getUserProfile } from '@services/core/storageService';
import { bulkSaveTransactions, getAllTransactions } from '@services/domain/transactionService';
import * as Import from '@services/integrations';

interface CsvImportFlowProps {
    visible: boolean;
    onRequestClose: () => void;
}

const CsvImportFlow: React.FC<CsvImportFlowProps> = ({ visible, onRequestClose }) => {
    const { temporarilyDisableLock } = useSecurity();
    const { showAlert } = useAlert();

    const [showImportProcess, setShowImportProcess] = useState(false);
    const [isImportProcessing, setIsImportProcessing] = useState(false);
    const [isImportSaving, setIsImportSaving] = useState(false);
    const [importSummary, setImportSummary] = useState<Import.ImportSummary | null>(null);
    const [pendingTransactions, setPendingTransactions] = useState<Transaction[]>([]);
    const [currency, setCurrency] = useState('PHP');

    // Fetch currency on focus
    useFocusEffect(
        useCallback(() => {
            const fetchCurrency = async () => {
                const profile = await getUserProfile();
                if (profile?.currency) {
                    setCurrency(profile.currency);
                }
            };
            fetchCurrency();
        }, [])
    );

    // Handle back button during import process
    useFocusEffect(
        useCallback(() => {
            const backAction = () => {
                if (showImportProcess) {
                    // Block back during import process
                    return true;
                }
                return false;
            };

            const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
            return () => backHandler.remove();
        }, [showImportProcess])
    );

    /**
     * Handle file selection for import
     */
    const handleSelectImportFile = async () => {
        try {
            temporarilyDisableLock();
            const result = await DocumentPicker.getDocumentAsync({
                type: ['text/csv', 'text/tab-separated-values', 'text/plain', '*/*'],
                copyToCacheDirectory: true,
            });

            if (result.canceled) return;

            if (result.assets && result.assets.length > 0) {
                onRequestClose();
                setShowImportProcess(true);
                setIsImportProcessing(true);
                setImportSummary(null);
                setPendingTransactions([]);

                await processImportFile(result.assets[0].uri);
            }
        } catch {
            showAlert('Error', 'Failed to pick file');
        }
    };

    /**
     * Process the import file
     */
    const processImportFile = async (fileUri: string) => {
        try {
            // Read file content
            const content = await new File(fileUri).text();

            // Parse CSV/TSV
            const { headers, rows } = Import.parseCSV(content);

            // Validate headers
            const headerError = Import.validateHeaders(headers);
            if (headerError) {
                setIsImportProcessing(false);
                setShowImportProcess(false);
                showAlert('Invalid File Format', headerError);
                return;
            }

            if (rows.length === 0) {
                setIsImportProcessing(false);
                setShowImportProcess(false);
                showAlert('Empty File', 'The file contains no data rows to import.');
                return;
            }

            // Get existing transactions for duplicate detection
            const existingTransactions = await getAllTransactions();

            // Validate data
            const validationResult = Import.validateImportData(rows, existingTransactions);

            if (!validationResult.isValid) {
                setIsImportProcessing(false);
                setShowImportProcess(false);

                const errorDetails = Import.formatValidationErrors(validationResult.errors);
                const errorCount = validationResult.errors.length;

                showAlert(
                    'Validation Errors',
                    `Found ${errorCount} error${errorCount > 1 ? 's' : ''} in your file.`,
                    [{ text: 'OK' }],
                    { details: errorDetails }
                );
                return;
            }

            // Prepare transactions
            const transactions = Import.prepareTransactions(validationResult.validRows);
            const summary = Import.calculateImportSummary(transactions);

            setPendingTransactions(transactions);
            setImportSummary(summary);
            setIsImportProcessing(false);

        } catch (error) {
            setIsImportProcessing(false);
            setShowImportProcess(false);
            showAlert('Error', 'Failed to process file: ' + (error as Error).message);
        }
    };

    /**
     * Confirm and save imported transactions
     */
    const handleConfirmImport = async () => {
        setIsImportSaving(true);

        // Short delay to allow the UI to render the loading state before heavy processing begins
        await new Promise(resolve => setTimeout(resolve, 100));

        try {
            await bulkSaveTransactions(pendingTransactions);

            setIsImportSaving(false);
            setShowImportProcess(false);
            setPendingTransactions([]);
            setImportSummary(null);

            showAlert(
                'Import Successful',
                `Successfully imported ${pendingTransactions.length} transactions!`
            );

        } catch (error) {
            setIsImportSaving(false);
            showAlert('Error', 'Failed to save transactions: ' + (error as Error).message);
        }
    };

    /**
     * Cancel import
     */
    const handleCancelImport = () => {
        setShowImportProcess(false);
        setPendingTransactions([]);
        setImportSummary(null);
        setIsImportProcessing(false);
        setIsImportSaving(false);
    };

    return (
        <>
            {/* Import Modal */}
            <ImportDataModal
                visible={visible}
                onClose={onRequestClose}
                onSelectFile={handleSelectImportFile}
            />

            {/* Import Process Screen (Full Screen Modal) */}
            <Modal
                visible={showImportProcess}
                animationType="slide"
                presentationStyle="fullScreen"
                onRequestClose={() => {
                    // Block back during processing/saving
                    if (!isImportProcessing && !isImportSaving) {
                        handleCancelImport();
                    }
                }}
            >
                <ImportProcessScreen
                    isProcessing={isImportProcessing}
                    isSaving={isImportSaving}
                    summary={importSummary}
                    currency={currency}
                    onConfirm={handleConfirmImport}
                    onCancel={handleCancelImport}
                />
            </Modal>
        </>
    );
};

export default CsvImportFlow;
