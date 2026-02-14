import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BigNumber } from 'bignumber.js';

import { Button, Card } from '@components/index';
import BottomModal from '@components/common/BottomModal';
import { CalculatorModal } from '@components/record/CalculatorModal';
import { useTheme } from '@context/ThemeContext';
import { useAlert } from '@context/AlertContext';
import { Debt, DebtType, DebtDirection, DebtInterestType, Transaction, TransactionType } from '@types';
import { generateUUID } from '@utils/uuid';
import { saveDebt } from '@services/domain/debtService';
import { saveTransaction } from '@services/domain/transactionService';
import { getTemplatesForCurrency, DebtTemplate } from '@constants/debtTemplates';

interface DebtsFormProps {
    currency: string;
    onSave: () => void;
    onCancel: () => void;
}

export const DebtsForm: React.FC<DebtsFormProps> = ({ currency, onSave, onCancel }) => {
    const { colors } = useTheme();
    const { showAlert } = useAlert();

    // Form State
    const [name, setName] = useState('');
    const [debtType, setDebtType] = useState<DebtType>('LOAN');
    const [direction, setDirection] = useState<DebtDirection>('PAYABLE');
    const [amount, setAmount] = useState('');
    const [formCurrency, setFormCurrency] = useState(currency); // Local state if needed, but mainly use prop
    const [interestRate, setInterestRate] = useState('');
    const [interestType, setInterestType] = useState<DebtInterestType>('FIXED');
    const [minPayment, setMinPayment] = useState('');
    const [fees, setFees] = useState('');
    const [termMonths, setTermMonths] = useState('');
    const [notes, setNotes] = useState('');
    const [contactInfo, setContactInfo] = useState(''); // Contact/Lender Name/Number

    // UI Configuration State
    const [createTransaction, setCreateTransaction] = useState(false);
    const [showInterestTypeModal, setShowInterestTypeModal] = useState(false);
    const [showAmountCalculator, setShowAmountCalculator] = useState(false);
    const [showTransactionInfo, setShowTransactionInfo] = useState(false);

    // Get Templates based on Currency
    const templates = getTemplatesForCurrency(currency);

    useEffect(() => {
        setFormCurrency(currency);
    }, [currency]);

    const applyTemplate = (template: DebtTemplate) => {
        setName(template.label);
        setDebtType(template.type);
        setInterestType(template.interestType);
        if (template.interestRate) setInterestRate(template.interestRate);
        setDirection('PAYABLE'); // Most templates are loans (Payable)
        if (template.termMonths) setTermMonths(template.termMonths);
        if (template.notes) setNotes(template.notes);
    };

    // Auto-set direction based on type (heuristic)
    useEffect(() => {
        if (debtType === 'I_OWE_YOU') setDirection('PAYABLE');
        else if (debtType === 'YOU_OWE_ME') setDirection('RECEIVABLE');
        else if (debtType === 'CREDIT_CARD' || debtType === 'MORTGAGE' || debtType === 'LOAN') setDirection('PAYABLE');
    }, [debtType]);

    const handleSave = async () => {
        if (!name || !amount) {
            showAlert('Missing Info', 'Please provide a name and initial amount.');
            return;
        }

        const newId = generateUUID();
        const initialAmountBN = new BigNumber(amount);

        const newDebt: Debt = {
            id: newId,
            name,
            type: debtType,
            direction,
            initialAmount: initialAmountBN,
            currency: formCurrency,
            interestRate: new BigNumber(interestRate || 0),
            interestType,
            minPayment: new BigNumber(minPayment || 0),
            fees: fees ? new BigNumber(fees) : undefined,
            termMonths: termMonths ? parseInt(termMonths, 10) : undefined,
            notes: notes || undefined,
            contactId: contactInfo || undefined, // Storing Name/Number in contactId field as text for now
            status: 'ACTIVE', // Default
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        try {
            await saveDebt(newDebt);

            if (createTransaction) {
                // If taking a loan (PAYABLE) -> It's Cash In (Transfer In) to your pocket
                // If lending money (RECEIVABLE) -> It's Cash Out (Transfer Out) from your pocket

                let txnType: TransactionType = 'TRANSFER_IN'; // Default mapping for Loan Receipt
                if (direction === 'PAYABLE') {
                    // I borrowed money -> Cash Balance Increases
                    txnType = 'TRANSFER_IN';
                } else {
                    // I lent money -> Cash Balance Decreases
                    txnType = 'TRANSFER_OUT';
                }

                const feesBN = new BigNumber(fees || 0);
                const netAmount = initialAmountBN.minus(feesBN);

                // Main Transaction (Net Amount)
                const mainTxn: Transaction = {
                    id: generateUUID(),
                    date: new Date().toISOString(),
                    amount: netAmount,
                    type: txnType,
                    category: debtType,
                    subCategory: debtType,
                    note: `Initial record for ${name}${feesBN.gt(0) ? ' (Net of fees)' : ''}`,
                    creationMethod: 'MANUAL',
                    isRecurring: false,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };

                await saveTransaction(mainTxn);

                // Add Fee Transaction if applicable
                if (feesBN.gt(0)) {
                    const feeTxn: Transaction = {
                        id: generateUUID(),
                        date: new Date().toISOString(),
                        amount: feesBN,
                        type: 'EXPENSE',
                        category: 'Debt',
                        subCategory: 'Fees',
                        note: `Processing fees for ${name}`,
                        creationMethod: 'MANUAL',
                        isRecurring: false,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                    };
                    await saveTransaction(feeTxn);
                }
            }

            onSave();
        } catch (error) {
            console.error(error);
            showAlert('Error', 'Failed to save debt record.');
        }
    };

    const interestTypesDetails: { type: DebtInterestType; label: string; description: string }[] = [
        { type: 'FIXED', label: 'FIXED', description: 'Government/Bank Loans (Rate stays same, interest amount drops monthly)' },
        { type: 'VARIABLE', label: 'VARIABLE', description: 'Housing Loans (Rate can change every year)' },
        { type: 'FLAT', label: 'FLAT', description: 'Interest is calculated on the original principal amount for the entire duration.' },
        { type: 'NONE', label: 'NONE', description: 'Friends/Family (0% interest)' },
    ];

    return (
        <View style={{ flex: 1 }}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 4, paddingBottom: 120 }}>
                <Text style={{ color: colors.text, fontSize: 24, fontWeight: 'bold', marginVertical: 8 }}>
                    Add Debt / Loan
                </Text>

                {/* Templates ScrollView */}
                <View style={{ marginBottom: 12 }}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                        {templates.map((t) => (
                            <TouchableOpacity
                                key={t.label}
                                onPress={() => applyTemplate(t)}
                                style={{
                                    backgroundColor: colors.surface,
                                    paddingHorizontal: 12,
                                    paddingVertical: 8,
                                    borderRadius: 16,
                                    borderWidth: 1,
                                    borderColor: colors.border,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 6
                                }}
                            >
                                <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 12 }}>+ {t.label}</Text>
                                {t.interestRate && (
                                    <View style={{ backgroundColor: colors.primary + '15', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4 }}>
                                        <Text style={{ color: colors.primary, fontSize: 10, fontWeight: 'bold' }}>{t.interestRate}%</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Name */}
                <Card style={{ marginBottom: 10, paddingVertical: 10 }}>
                    <Text style={{ color: colors.textSecondary, marginBottom: 2, fontSize: 12 }}>Name / Description</Text>
                    <TextInput
                        style={{ color: colors.text, fontSize: 18, fontWeight: 'bold', padding: 0 }}
                        value={name}
                        onChangeText={setName}
                        placeholder="e.g. Car Loan"
                        placeholderTextColor={colors.gray500}
                    />
                </Card>

                {/* Type & Direction - Compact Row */}
                <View style={{ marginBottom: 10 }}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                        {(['LOAN', 'CREDIT_CARD', 'MORTGAGE', 'I_OWE_YOU', 'YOU_OWE_ME'] as DebtType[]).map((t) => (
                            <TouchableOpacity
                                key={t}
                                onPress={() => setDebtType(t)}
                                style={{
                                    paddingHorizontal: 12,
                                    paddingVertical: 6,
                                    borderRadius: 8,
                                    backgroundColor: debtType === t ? colors.primary : colors.surface,
                                    borderWidth: 1,
                                    borderColor: debtType === t ? colors.primary : colors.border
                                }}
                            >
                                <Text style={{ color: debtType === t ? '#FFF' : colors.text, fontWeight: 'bold', fontSize: 11 }}>
                                    {t.replace(/_/g, ' ')}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Direction Toggle - Non Clickable */}
                <View style={{ flexDirection: 'row', marginBottom: 10, backgroundColor: colors.surface, borderRadius: 12, padding: 3 }}>
                    <View
                        style={{ flex: 1, padding: 8, alignItems: 'center', backgroundColor: direction === 'PAYABLE' ? colors.error : 'transparent', borderRadius: 8 }}
                    >
                        <Text style={{ color: direction === 'PAYABLE' ? '#FFF' : colors.text, fontWeight: 'bold', fontSize: 11 }}>Payable</Text>
                    </View>
                    <View
                        style={{ flex: 1, padding: 8, alignItems: 'center', backgroundColor: direction === 'RECEIVABLE' ? colors.success : 'transparent', borderRadius: 8 }}
                    >
                        <Text style={{ color: direction === 'RECEIVABLE' ? '#FFF' : colors.text, fontWeight: 'bold', fontSize: 11 }}>Receivable</Text>
                    </View>
                </View>

                {/* Amount */}
                <Card style={{ marginBottom: 10, paddingVertical: 10 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Initial Amount ({formCurrency})</Text>
                        <TouchableOpacity onPress={() => setShowAmountCalculator(true)} style={{ padding: 2 }}>
                            <Ionicons name="calculator" size={18} color={colors.primary} />
                        </TouchableOpacity>
                    </View>
                    <TextInput
                        style={{ color: colors.text, fontSize: 24, fontWeight: 'bold', paddingTop: 2, paddingBottom: 0 }}
                        value={amount}
                        onChangeText={setAmount}
                        keyboardType="numeric"
                        placeholder="0.00"
                        placeholderTextColor={colors.gray300}
                    />
                </Card>

                {/* Add Transaction Checkbox - Moved to Top */}
                <Card style={{ marginBottom: 10, paddingVertical: 10 }}>
                    <TouchableOpacity
                        onPress={() => setCreateTransaction(!createTransaction)}
                        activeOpacity={0.7}
                        style={{ flexDirection: 'row', alignItems: 'center' }}
                    >
                        <Ionicons
                            name={createTransaction ? "checkbox" : "square-outline"}
                            size={24}
                            color={createTransaction ? colors.primary : colors.textSecondary}
                            style={{ marginRight: 12 }}
                        />
                        <View style={{ flex: 1 }}>
                            <Text style={{ color: colors.text, fontSize: 14, fontWeight: 'bold' }}>
                                Add corresponding transaction?
                            </Text>
                            <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>
                                {createTransaction
                                    ? (direction === 'PAYABLE' ? "Will record as Income (Cash In)" : "Will record as Expense (Cash Out)")
                                    : "No transaction will be recorded"}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={() => setShowTransactionInfo(true)} style={{ padding: 4 }}>
                            <Ionicons name="information-circle-outline" size={22} color={colors.primary} />
                        </TouchableOpacity>
                    </TouchableOpacity>
                </Card>

                {/* Interest Section - Side by Side and Compact */}
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
                    <View style={[styles.inputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <View style={{ flex: 1 }}>
                            <Text style={{ color: colors.textSecondary, fontSize: 10 }}>Interest Rate (%)</Text>
                            <TextInput
                                style={{ color: colors.text, fontSize: 14, fontWeight: 'bold', padding: 0, marginTop: 2 }}
                                value={interestRate}
                                onChangeText={setInterestRate}
                                keyboardType="numeric"
                                placeholder="0"
                                placeholderTextColor={colors.gray300}
                            />
                        </View>
                    </View>
                    <TouchableOpacity
                        onPress={() => setShowInterestTypeModal(true)}
                        style={[styles.inputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    >
                        <View style={{ flex: 1 }}>
                            <Text style={{ color: colors.textSecondary, fontSize: 10 }}>Type</Text>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                                <Text style={{ color: colors.text, fontSize: 14, fontWeight: 'bold' }}>{interestType}</Text>
                                <Ionicons name="help-circle-outline" size={16} color={colors.primary} />
                            </View>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Terms and Min Pay */}
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
                    <View style={[styles.inputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <View style={{ flex: 1 }}>
                            <Text style={{ color: colors.textSecondary, fontSize: 10 }}>Term (Months)</Text>
                            <TextInput
                                style={{ color: colors.text, fontSize: 14, fontWeight: 'bold', padding: 0, marginTop: 2 }}
                                value={termMonths}
                                onChangeText={setTermMonths}
                                keyboardType="numeric"
                                placeholder="#"
                                placeholderTextColor={colors.gray300}
                            />
                        </View>
                    </View>
                    <View style={[styles.inputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <View style={{ flex: 1 }}>
                            <Text style={{ color: colors.textSecondary, fontSize: 10 }}>Min. Payment</Text>
                            <TextInput
                                style={{ color: colors.text, fontSize: 14, fontWeight: 'bold', padding: 0, marginTop: 2 }}
                                value={minPayment}
                                onChangeText={setMinPayment}
                                keyboardType="numeric"
                                placeholder="0.00"
                                placeholderTextColor={colors.gray300}
                            />
                        </View>
                    </View>
                </View>

                {/* Fees and Contact */}
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
                    <View style={[styles.inputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <View style={{ flex: 1 }}>
                            <Text style={{ color: colors.textSecondary, fontSize: 10 }}>Fees</Text>
                            <TextInput
                                style={{ color: colors.text, fontSize: 14, fontWeight: 'bold', padding: 0, marginTop: 2 }}
                                value={fees}
                                onChangeText={setFees}
                                keyboardType="numeric"
                                placeholder="0.00"
                                placeholderTextColor={colors.gray300}
                            />
                        </View>
                    </View>
                    <View style={[styles.inputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <View style={{ flex: 1 }}>
                            <Text style={{ color: colors.textSecondary, fontSize: 10 }}>Contact Info</Text>
                            <TextInput
                                style={{ color: colors.text, fontSize: 14, fontWeight: 'bold', padding: 0, marginTop: 2 }}
                                value={contactInfo}
                                onChangeText={setContactInfo}
                                placeholder="Name / #"
                                placeholderTextColor={colors.gray300}
                            />
                        </View>
                    </View>
                </View>

                {/* Notes */}
                <Card style={{ marginBottom: 10, paddingVertical: 10 }}>
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Notes</Text>
                    <TextInput
                        style={{ color: colors.text, fontSize: 14, marginTop: 2, padding: 0 }}
                        value={notes}
                        onChangeText={setNotes}
                        placeholder="Description"
                        placeholderTextColor={colors.gray500}
                        multiline
                    />
                </Card>
            </ScrollView>

            {/* Fixed Footer Actions */}
            <View style={[styles.footer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Button
                    title="Cancel"
                    variant="outline"
                    onPress={onCancel}
                    style={{ flex: 1 }}
                />
                <Button
                    title="Save Debt"
                    onPress={handleSave}
                    style={{ flex: 1 }}
                />
            </View>

            {/* Transaction Info Modal */}
            <BottomModal
                visible={showTransactionInfo}
                onClose={() => setShowTransactionInfo(false)}
                title="Syncing Your Cash Flow"
                maxHeight="85%"
            >
                <ScrollView showsVerticalScrollIndicator={false}>
                    <Text style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 22, marginBottom: 20 }}>
                        WealthSnap treats your finances as a connected ecosystem. When you take on debt or lend money, cash actually moves.
                    </Text>

                    {/* Visual Flow Diagram */}
                    <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: colors.border }}>
                        <Text style={{ color: colors.text, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' }}>🔄 The Money Flow</Text>

                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <View style={{ alignItems: 'center', flex: 1 }}>
                                <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary + '20', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                                    <Ionicons name="wallet" size={24} color={colors.primary} />
                                </View>
                                <Text style={{ color: colors.text, fontSize: 12, fontWeight: '600' }}>Cash / Bank</Text>
                            </View>

                            <View style={{ flex: 1, alignItems: 'center' }}>
                                <Ionicons name="swap-horizontal" size={24} color={colors.textSecondary} />
                                <Text style={{ color: colors.textSecondary, fontSize: 10, marginTop: 4 }}>Transaction</Text>
                            </View>

                            <View style={{ alignItems: 'center', flex: 1 }}>
                                <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.error + '20', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                                    <Ionicons name="document-text" size={24} color={colors.error} />
                                </View>
                                <Text style={{ color: colors.text, fontSize: 12, fontWeight: '600' }}>Debt Record</Text>
                            </View>
                        </View>
                    </View>

                    <Text style={{ color: colors.text, fontSize: 16, fontWeight: 'bold', marginBottom: 12 }}>What happens if checked?</Text>

                    {/* Scenario: PAYABLE (Taking a Loan) */}
                    <View style={{ flexDirection: 'row', marginBottom: 16 }}>
                        <View style={{ width: 4, backgroundColor: colors.success, borderRadius: 2, marginRight: 12 }} />
                        <View style={{ flex: 1 }}>
                            <Text style={{ color: colors.text, fontWeight: 'bold', fontSize: 14 }}>Taking a Loan (Payable)</Text>
                            <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 4 }}>
                                You receive money. We record this as <Text style={{ fontWeight: 'bold', color: colors.success }}>Transfer In</Text> so your Cash Balance increases.
                            </Text>
                        </View>
                    </View>

                    {/* Scenario: RECEIVABLE (Lending Money) */}
                    <View style={{ flexDirection: 'row', marginBottom: 24 }}>
                        <View style={{ width: 4, backgroundColor: colors.error, borderRadius: 2, marginRight: 12 }} />
                        <View style={{ flex: 1 }}>
                            <Text style={{ color: colors.text, fontWeight: 'bold', fontSize: 14 }}>Lending Money (Receivable)</Text>
                            <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 4 }}>
                                You give money away. We record this as an <Text style={{ fontWeight: 'bold', color: colors.error }}>Transfer Out</Text> so your Cash Balance decreases.
                            </Text>
                        </View>
                    </View>

                    <View style={{ backgroundColor: colors.primary + '15', padding: 12, borderRadius: 8, flexDirection: 'row' }}>
                        <Ionicons name="bulb-outline" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                        <Text style={{ color: colors.primary, fontSize: 12, flex: 1, lineHeight: 18 }}>
                            <Text style={{ fontWeight: 'bold' }}>Pro Tip:</Text> Uncheck this box if you are just tracking an old debt where the cash has already been spent/received long ago.
                        </Text>
                    </View>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </BottomModal>

            {/* Interest Type Info Modal (Existing) */}
            <BottomModal
                visible={showInterestTypeModal}
                onClose={() => setShowInterestTypeModal(false)}
                title="Interest Method"
                subtitle="How is interest calculated?"
                maxHeight="85%"
            >
                <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
                    {interestTypesDetails.map((details) => (
                        <TouchableOpacity
                            key={details.type}
                            onPress={() => {
                                setInterestType(details.type);
                                setShowInterestTypeModal(false);
                            }}
                            style={{
                                padding: 16,
                                borderBottomWidth: 1,
                                borderBottomColor: colors.border,
                                backgroundColor: interestType === details.type ? colors.primary + '10' : 'transparent',
                                flexDirection: 'row',
                                alignItems: 'center'
                            }}
                        >
                            <View style={{ flex: 1 }}>
                                <Text style={{ color: colors.text, fontWeight: 'bold', fontSize: 16, marginBottom: 4 }}>
                                    {details.label}
                                </Text>
                                <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
                                    {details.description}
                                </Text>
                            </View>
                            {interestType === details.type && (
                                <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                            )}
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </BottomModal>

            <CalculatorModal
                visible={showAmountCalculator}
                onClose={() => setShowAmountCalculator(false)}
                initialValue={amount}
                onApply={setAmount}
                type={direction === 'PAYABLE' ? 'INCOME' : 'EXPENSE'}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    inputRow: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12, // Increased to match Card/InvestmentForm standard
        borderRadius: 12,
        borderWidth: 1,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingTop: 16,
        paddingHorizontal: 16,
        paddingBottom: 24, // Extra space for safe area
        borderTopWidth: 1,
        flexDirection: 'row',
        gap: 12
    }
});
