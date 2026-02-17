import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { BigNumber } from 'bignumber.js';
import * as Clipboard from 'expo-clipboard';

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

interface DebtFormProps {
    currency: string;
    onSave: () => void;
    onCancel: () => void;
    initialDebt?: Debt;
}

export const DebtForm: React.FC<DebtFormProps> = ({ currency, onSave, onCancel, initialDebt }) => {
    const { colors } = useTheme();
    const { showAlert } = useAlert();

    // Form State
    const [name, setName] = useState(initialDebt?.name || '');
    const [debtType, setDebtType] = useState<DebtType>(initialDebt?.type || 'LOAN');
    const [direction, setDirection] = useState<DebtDirection>(initialDebt?.direction || 'PAYABLE');
    const [amount, setAmount] = useState(initialDebt?.initialAmount.toString() || '');
    const [formCurrency, setFormCurrency] = useState(initialDebt?.currency || currency);
    const [interestRate, setInterestRate] = useState(initialDebt?.interestRate.toString() || '');
    const [interestType, setInterestType] = useState<DebtInterestType>(initialDebt?.interestType || 'FIXED');
    const [minPayment, setMinPayment] = useState(initialDebt?.minPayment.toString() || '');
    const [fees, setFees] = useState(initialDebt?.fees?.toString() || '');
    const [termMonths, setTermMonths] = useState(initialDebt?.termMonths?.toString() || '');
    const [notes, setNotes] = useState(initialDebt?.notes || '');
    const [contactInfo, setContactInfo] = useState(initialDebt?.contactId || '');

    // UI Configuration State

    const [showInterestTypeModal, setShowInterestTypeModal] = useState(false);
    const [showAmountCalculator, setShowAmountCalculator] = useState(false);
    const [showTransactionInfo, setShowTransactionInfo] = useState(false);
    const [isMinPaymentManual, setIsMinPaymentManual] = useState(!!initialDebt?.minPayment);
    const [isPaymentDetailsExpanded, setIsPaymentDetailsExpanded] = useState(false);
    const [startDate, setStartDate] = useState<Date>(initialDebt?.startDate ? new Date(initialDebt.startDate) : new Date());
    const [showStartDatePicker, setShowStartDatePicker] = useState(false);

    // Get Templates based on Currency
    const templates = getTemplatesForCurrency(currency);

    useEffect(() => {
        if (!initialDebt) {
            setFormCurrency(currency);
        }
    }, [currency, initialDebt]);

    // Update Auto-Calculation logic to respect edits
    useEffect(() => {
        // If we have an initial debt and payments/amounts exactly match, we might want to respect that
        // But if user changes amount/rate, auto-calc should trigger.
    }, []);

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

    const handleMinPaymentChange = (text: string) => {
        setMinPayment(text);
        setIsMinPaymentManual(true);
    };

    // Auto-calculate Min Payment
    useEffect(() => {
        if (isMinPaymentManual || !amount) return;

        const principal = new BigNumber(amount);
        if (principal.isNaN() || principal.lte(0)) return;

        let calculatedPayment = new BigNumber(0);
        const rate = new BigNumber(interestRate || 0).div(100);
        const months = termMonths ? parseInt(termMonths, 10) : 0;

        if (months > 0) {
            // Term Loan Logic
            if (interestType === 'NONE') {
                calculatedPayment = principal.div(months);
            } else if (interestType === 'FLAT') {
                const totalInterest = principal.times(rate).times(months / 12);
                calculatedPayment = principal.plus(totalInterest).div(months);
            } else {
                // FIXED / VARIABLE (Standard Amortization)
                const monthlyRate = rate.div(12);
                if (monthlyRate.eq(0)) {
                    calculatedPayment = principal.div(months);
                } else {
                    const factor = monthlyRate.plus(1).pow(months);
                    // PMT = P * r * (1+r)^n / ((1+r)^n - 1)
                    calculatedPayment = principal.times(monthlyRate).times(factor).div(factor.minus(1));
                }
            }
        } else {
            // No Term (e.g. Credit Card) -> 3% or Interest + 1%
            // Defaulting to 3.00% of balance (common min payment)
            calculatedPayment = principal.times(0.03);

            // Ensure min payment covers at least interest if possible
            if (interestRate) {
                const monthlyInterest = principal.times(rate.div(12));
                if (calculatedPayment.lt(monthlyInterest)) {
                    calculatedPayment = monthlyInterest.plus(principal.times(0.01)); // Interest + 1% principal
                }
            }
        }

        // Round to 2 decimals
        setMinPayment(calculatedPayment.toFixed(2));
    }, [amount, interestRate, termMonths, interestType, isMinPaymentManual]);

    const handleSave = () => {
        if (!name || !amount) {
            showAlert('Missing Info', 'Please provide a name and initial amount.');
            return;
        }

        // If editing an existing debt, we just save directly (no new transaction prompt logic for edits usually)
        // OR if you want to support adding transaction on edit, you'd need more logic.
        // Assuming only NEW debts get the prompt, as per previous checkbox logic:
        if (initialDebt) {
            finalSave(false, false);
        } else {
            setShowTransactionInfo(true);
        }
    };

    const finalSave = async (shouldCreateTransaction: boolean, shouldCreateFeeTxn: boolean = false) => {
        setShowTransactionInfo(false); // Close modal


        const newId = initialDebt?.id || generateUUID();
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
            startDate: startDate.toISOString(),
            termMonths: termMonths ? parseInt(termMonths, 10) : undefined,
            notes: notes || undefined,
            contactId: contactInfo || undefined, // Storing Name/Number in contactId field as text for now
            status: initialDebt?.status || 'ACTIVE', // Default
            createdAt: initialDebt?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        try {
            await saveDebt(newDebt);

            const errors: any[] = [];
            const feesBN = new BigNumber(fees || 0);

            if (shouldCreateTransaction) {
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

                const netAmount = initialAmountBN.minus(feesBN);

                // Main Transaction
                const mainTxn: Transaction = {
                    id: generateUUID(),
                    date: new Date().toISOString(),
                    amount: netAmount,
                    type: txnType,
                    category: 'Loans',
                    subCategory: 'INITIAL_TRANSACTION',
                    transferAccount: debtType,
                    note: `Initial record for ${name}${feesBN.gt(0) ? ' (Net of fees)' : ''}`,
                    creationMethod: 'MANUAL',
                    isRecurring: false,
                    debtId: newDebt.id,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };

                await saveTransaction(mainTxn);
            }

            // Fee Transaction
            if (shouldCreateFeeTxn && feesBN.gt(0)) {
                const feeTxn: Transaction = {
                    id: generateUUID(),
                    date: new Date().toISOString(),
                    amount: feesBN,
                    type: 'EXPENSE',
                    category: 'Fees',
                    subCategory: 'INITIAL_TRANSACTION',
                    transferAccount: debtType,
                    note: `Processing fees for ${name}`,
                    creationMethod: 'MANUAL',
                    isRecurring: false,
                    debtId: newDebt.id,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };
                await saveTransaction(feeTxn);
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

    const renderPaymentBreakdown = () => {
        if (!amount || !minPayment) return null;

        const P = new BigNumber(amount);
        const rAnnual = new BigNumber(interestRate || 0).div(100);
        const monthlyPayment = new BigNumber(minPayment);
        const months = termMonths ? parseInt(termMonths, 10) : 0;

        let schedule: { month: number; principal: BigNumber; interest: BigNumber; balance: BigNumber; date: Date }[] = [];
        let totalInterest = new BigNumber(0);

        // Verify validity
        if (P.isNaN() || monthlyPayment.isNaN() || monthlyPayment.lte(0)) return null;

        // Generate Schedule
        // Limit simulation to avoid freezing UI on infinite loops or really long debts
        const maxMonths = months > 0 ? months : 120;

        let balance = P;

        // Simplified Simulation for display
        for (let i = 1; i <= maxMonths; i++) {
            let interestPart = new BigNumber(0);

            // Calculate payment date: Start Date + (i-1) months
            let paymentDate = new Date(startDate);
            paymentDate.setMonth(paymentDate.getMonth() + (i - 1));

            if (interestType === 'NONE') {
                interestPart = new BigNumber(0);
            } else if (interestType === 'FLAT') {
                // Standard Flat: Monthly Interest = (P_original * rate * years) / months = P_original * rate / 12
                interestPart = P.times(rAnnual).div(12);
            } else {
                // FIXED/VARIABLE - Reducing Balance
                interestPart = balance.times(rAnnual).div(12);
            }

            let principalPart = monthlyPayment.minus(interestPart);

            // Handle last payment or negative balance logic
            if (balance.lte(monthlyPayment) || (months > 0 && i === months)) { // Force closure if term ends
                if (months > 0 && i === months && balance.gt(monthlyPayment)) {
                    // Last month adjustment if balance remains (rounding issues)
                    principalPart = balance;
                    // Interest remains same
                } else if (balance.lte(monthlyPayment)) {
                    principalPart = balance;
                }

                balance = new BigNumber(0);
                schedule.push({ month: i, principal: principalPart, interest: interestPart, balance, date: paymentDate });
                totalInterest = totalInterest.plus(interestPart);
                break;
            }

            balance = balance.minus(principalPart);
            schedule.push({ month: i, principal: principalPart, interest: interestPart, balance, date: paymentDate });
            totalInterest = totalInterest.plus(interestPart);

            if (balance.lte(0)) break;
        }

        const handleCopySchedule = async () => {
            if (schedule.length === 0) return;

            const summary = [
                `Amount: ${formCurrency} ${new BigNumber(amount).toFormat(2)}`,
                `Interest: ${interestRate}% (${interestType})`,
                `Start Date: ${startDate.toLocaleDateString()}`,
                ''
            ].join('\n');

            const header = ['Date', 'Principal', 'Interest', 'Balance'].join('\t');
            const rows = schedule.map(item => {
                const dateStr = item.date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                return `${dateStr}\t${item.principal.toFixed(2)}\t${item.interest.toFixed(2)}\t${item.balance.toFixed(2)}`;
            }).join('\n');
            const result = `${summary}${header}\n${rows}`;

            await Clipboard.setStringAsync(result);
            showAlert('Copied', 'Payment schedule copied to clipboard!');
        };

        return (
            <Card style={{ marginBottom: 10, paddingVertical: 0, paddingHorizontal: 0, overflow: 'hidden' }}>
                <TouchableOpacity
                    onPress={() => setIsPaymentDetailsExpanded(!isPaymentDetailsExpanded)}
                    style={{ flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: colors.surface }}
                    activeOpacity={0.7}
                >
                    <Ionicons
                        name={isPaymentDetailsExpanded ? "chevron-down" : "chevron-forward"}
                        size={20}
                        color={colors.primary}
                        style={{ marginRight: 8 }}
                    />
                    <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Estimated Monthly Payment</Text>
                        <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold' }}>
                            {formCurrency} {new BigNumber(minPayment).toFormat(2)}
                        </Text>
                    </View>
                    <TouchableOpacity onPress={handleCopySchedule} style={{ padding: 4 }}>
                        <Ionicons name="copy-outline" size={20} color={colors.primary} />
                    </TouchableOpacity>
                </TouchableOpacity>

                {isPaymentDetailsExpanded && (
                    <View style={{ borderTopWidth: 1, borderTopColor: colors.border, padding: 12, backgroundColor: colors.surface }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, paddingHorizontal: 4 }}>
                            <Text style={{ color: colors.textSecondary, fontSize: 12, flex: 1.5 }}>Date</Text>
                            <Text style={{ color: colors.textSecondary, fontSize: 12, flex: 2, textAlign: 'right' }}>Principal</Text>
                            <Text style={{ color: colors.textSecondary, fontSize: 12, flex: 2, textAlign: 'right' }}>Interest</Text>
                            <Text style={{ color: colors.textSecondary, fontSize: 12, flex: 2, textAlign: 'right' }}>Balance</Text>
                        </View>

                        <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled showsVerticalScrollIndicator={true}>
                            {schedule.length === 0 ? (
                                <Text style={{ color: colors.textSecondary, textAlign: 'center', marginVertical: 10 }}>
                                    Calculation unavailable. Check amounts.
                                </Text>
                            ) : (
                                schedule.map((item) => (
                                    <View key={item.month} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: colors.border + '30', paddingHorizontal: 4 }}>
                                        <Text style={{ color: colors.text, fontSize: 12, flex: 1.5 }}>
                                            {item.date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
                                        </Text>
                                        <Text style={{ color: colors.success, fontSize: 12, flex: 2, textAlign: 'right' }}>{item.principal.toFormat(2)}</Text>
                                        <Text style={{ color: colors.error, fontSize: 12, flex: 2, textAlign: 'right' }}>{item.interest.toFormat(2)}</Text>
                                        <Text style={{ color: colors.textSecondary, fontSize: 12, flex: 2, textAlign: 'right' }}>{item.balance.toFormat(2)}</Text>
                                    </View>
                                ))
                            )}
                            {(months === 0 && schedule.length >= 120) && (
                                <Text style={{ color: colors.textSecondary, fontSize: 10, textAlign: 'center', marginTop: 8 }}>
                                    (Projection limited to 10 years)
                                </Text>
                            )}
                        </ScrollView>

                        {/* Summary Footer */}
                        <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ color: colors.text, fontSize: 12, fontWeight: '600' }}>Est. Total Interest:</Text>
                            <Text style={{ color: colors.error, fontSize: 12, fontWeight: 'bold' }}>
                                {formCurrency} {totalInterest.toFormat(2)}
                            </Text>
                        </View>
                    </View>
                )}
            </Card>
        );
    };

    return (
        <View style={{ flex: 1 }}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 4, paddingBottom: 120 }}>
                <Text style={{ color: colors.text, fontSize: 24, fontWeight: 'bold', marginVertical: 8 }}>
                    {initialDebt ? 'Edit Debt / Loan' : 'Add Debt / Loan'}
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

                {/* Start Date */}
                <Card style={{ marginBottom: 10, paddingVertical: 10 }}>
                    <TouchableOpacity
                        onPress={() => setShowStartDatePicker(true)}
                        style={{ flexDirection: 'row', alignItems: 'center' }}
                    >
                        <Ionicons name="calendar-outline" size={20} color={colors.primary} style={{ marginRight: 12 }} />
                        <View style={{ flex: 1 }}>
                            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Start Date (First Payment)</Text>
                            <Text style={{ color: colors.text, fontSize: 14, fontWeight: 'bold', marginTop: 2 }}>
                                {startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </Text>
                        </View>
                        {showStartDatePicker && (
                            <DateTimePicker
                                value={startDate}
                                mode="date"
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                onChange={(event: DateTimePickerEvent, date?: Date) => {
                                    setShowStartDatePicker(Platform.OS === 'ios');
                                    if (date) {
                                        setStartDate(date);
                                    }
                                }}
                            />
                        )}
                    </TouchableOpacity>
                </Card>

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

                {/* Add Transaction Checkbox - Only for New Debts */}


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
                                onChangeText={handleMinPaymentChange}
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

                {/* Payment Breakdown / Computation */}
                {renderPaymentBreakdown()}
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
                        WealthSnap treats your finances as a connected ecosystem. To keep your Cash Balance accurate, please clarify the cash flow.
                    </Text>

                    {/* The Core Question */}
                    <View style={{ backgroundColor: colors.primary + '10', padding: 20, borderRadius: 16, marginBottom: 24, alignItems: 'center', borderWidth: 1, borderColor: colors.primary + '30' }}>
                        <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.primary, textAlign: 'center', marginBottom: 8 }}>
                            &quot;Did this money actually enter my bank account or wallet?&quot;
                        </Text>
                    </View>

                    {/* Option 1: YES */}
                    <TouchableOpacity
                        onPress={() => finalSave(true, true)}
                        style={{ flexDirection: 'row', marginBottom: 16, backgroundColor: colors.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border }}
                    >
                        <View style={{ alignItems: 'center', marginRight: 16, width: 40, paddingTop: 4 }}>
                            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.success + '20', alignItems: 'center', justifyContent: 'center' }}>
                                <Ionicons name="checkmark" size={20} color={colors.success} />
                            </View>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ color: colors.text, fontWeight: 'bold', fontSize: 16, marginBottom: 4 }}>YES, I received the cash.</Text>
                            <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 20 }}>
                                Result: Debt Created + Cash Balance Updated {direction === 'PAYABLE' ? '(Income)' : '(Expense)'}
                            </Text>
                            <Text style={{ color: colors.success, fontSize: 12, fontWeight: 'bold', marginTop: 6 }}>TAP TO CONFIRM</Text>
                        </View>
                    </TouchableOpacity>

                    {/* Option 2: NO (Direct) */}
                    <TouchableOpacity
                        onPress={() => finalSave(false, true)}
                        style={{ flexDirection: 'row', marginBottom: 16, backgroundColor: colors.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border }}
                    >
                        <View style={{ alignItems: 'center', marginRight: 16, width: 40, paddingTop: 4 }}>
                            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.error + '20', alignItems: 'center', justifyContent: 'center' }}>
                                <Ionicons name="close" size={20} color={colors.error} />
                            </View>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ color: colors.text, fontWeight: 'bold', fontSize: 16, marginBottom: 4 }}>NO, it went straight to payment.</Text>
                            <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 20 }}>
                                Result: Debt Created. Fees recorded as Expense.
                            </Text>
                            <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 4, fontStyle: 'italic' }}>
                                e.g. Car Loan / Renovation paid to vendor.
                            </Text>
                            <View style={{ marginTop: 6, backgroundColor: colors.surface, padding: 6, borderRadius: 6, borderWidth: 1, borderColor: colors.border }}>
                                <Text style={{ fontSize: 11, color: colors.text, fontStyle: 'italic' }}>
                                    Note: Any fees entered will be recorded as an expense.
                                </Text>
                            </View>
                            <Text style={{ color: colors.error, fontSize: 12, fontWeight: 'bold', marginTop: 8 }}>TAP TO CONFIRM</Text>
                        </View>
                    </TouchableOpacity>

                    {/* Option 3: NO (Untracked) */}
                    <TouchableOpacity
                        onPress={() => finalSave(false, false)}
                        style={{ flexDirection: 'row', marginBottom: 24, backgroundColor: colors.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border }}
                    >
                        <View style={{ alignItems: 'center', marginRight: 16, width: 40, paddingTop: 4 }}>
                            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.error + '20', alignItems: 'center', justifyContent: 'center' }}>
                                <Ionicons name="close" size={20} color={colors.error} />
                            </View>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ color: colors.text, fontWeight: 'bold', fontSize: 16, marginBottom: 4 }}>NO, it&apos;s a dedicated untracked expense.</Text>
                            <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 20 }}>
                                Result: Debt Created Only.
                            </Text>
                            <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 4, fontStyle: 'italic' }}>
                                I don&apos;t want this specific expense in my transaction history.
                            </Text>
                            <Text style={{ color: colors.error, fontSize: 12, fontWeight: 'bold', marginTop: 6 }}>TAP TO CONFIRM</Text>
                        </View>
                    </TouchableOpacity>
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
