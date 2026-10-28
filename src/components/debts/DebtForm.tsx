import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { BigNumber } from 'bignumber.js';
import * as Clipboard from 'expo-clipboard';

import { Row, SectionHeader } from '@components/ds';
import BottomModal from '@components/common/BottomModal';
import { CalculatorModal } from '@components/record/CalculatorModal';
import { useTheme } from '@context/ThemeContext';
import { useAlert } from '@context/AlertContext';
import { type, space, radius, fontFamily } from '@styles/theme';
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
    // Type pre-selected from the Quick Actions menu (e.g. "I Owe You", "Credit Card") for a new debt.
    // Ignored when editing an existing debt (initialDebt.type wins).
    defaultType?: DebtType;
}

// Shared with the auto-set-direction effect below so the initial render and
// any later debtType change compute the same default, instead of the first
// render flashing 'PAYABLE' before the effect corrects it.
const getAutoDirection = (type: DebtType): DebtDirection => {
    return type === 'YOU_OWE_ME' ? 'RECEIVABLE' : 'PAYABLE';
};

export const DebtForm: React.FC<DebtFormProps> = ({ currency, onSave, onCancel, initialDebt, defaultType }) => {
    const { ds } = useTheme();
    const { showAlert } = useAlert();

    // Form State
    const [name, setName] = useState(initialDebt?.name || '');
    const [debtType, setDebtType] = useState<DebtType>(initialDebt?.type || defaultType || 'LOAN');
    const [direction, setDirection] = useState<DebtDirection>(initialDebt?.direction || getAutoDirection(initialDebt?.type || defaultType || 'LOAN'));
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
            // eslint-disable-next-line react-hooks/set-state-in-effect -- resyncs default currency when app currency changes; see FIXES.md
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

    // Auto-set direction based on type (heuristic) - not user-overridable; see FIXES.md
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- smart default derived from debt type, not user-editable; see FIXES.md
        setDirection(getAutoDirection(debtType));
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
        // eslint-disable-next-line react-hooks/set-state-in-effect -- auto-calc the user can still override manually (isMinPaymentManual); see FIXES.md
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

                // Main Transaction
                // NOTE: Use the full initialAmount here, not netted against fees. Fees are
                // recorded as their own EXPENSE transaction below, so netting here as well
                // would subtract the fee from your cash balance twice.
                const mainTxn: Transaction = {
                    id: generateUUID(),
                    date: new Date().toISOString(),
                    amount: initialAmountBN,
                    type: txnType,
                    category: 'Loans',
                    subCategory: 'INITIAL_TRANSACTION',
                    transferAccount: debtType,
                    note: `Initial record for ${name}`,
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
            <>
                <SectionHeader title="Payment schedule" actionLabel="Copy" onAction={handleCopySchedule} />
                <Row
                    title="Estimated monthly payment"
                    value={`${formCurrency} ${new BigNumber(minPayment).toFormat(2)}`}
                    onPress={() => setIsPaymentDetailsExpanded(!isPaymentDetailsExpanded)}
                    trailing={<Ionicons name={isPaymentDetailsExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={ds.text3} />}
                    last={!isPaymentDetailsExpanded}
                />

                {isPaymentDetailsExpanded && (
                    <View>
                        <View style={[styles.scheduleRow, { borderBottomColor: ds.hairline }]}>
                            <Text style={[type.caption, styles.colDate, { color: ds.text2 }]}>Date</Text>
                            <Text style={[type.caption, styles.colNum, { color: ds.text2 }]}>Principal</Text>
                            <Text style={[type.caption, styles.colNum, { color: ds.text2 }]}>Interest</Text>
                            <Text style={[type.caption, styles.colNum, { color: ds.text2 }]}>Balance</Text>
                        </View>

                        <ScrollView style={styles.schedule} nestedScrollEnabled showsVerticalScrollIndicator={true}>
                            {schedule.length === 0 ? (
                                <Text style={[type.small, styles.scheduleEmpty, { color: ds.text2 }]}>
                                    Calculation unavailable. Check amounts.
                                </Text>
                            ) : (
                                schedule.map((item) => (
                                    <View key={item.month} style={[styles.scheduleRow, { borderBottomColor: ds.hairline }]}>
                                        <Text style={[type.smallNum, styles.colDate, { color: ds.text }]}>
                                            {item.date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
                                        </Text>
                                        <Text style={[type.smallNum, styles.colNum, { color: ds.text }]}>{item.principal.toFormat(2)}</Text>
                                        <Text style={[type.smallNum, styles.colNum, { color: ds.text }]}>{item.interest.toFormat(2)}</Text>
                                        <Text style={[type.smallNum, styles.colNum, { color: ds.text2 }]}>{item.balance.toFormat(2)}</Text>
                                    </View>
                                ))
                            )}
                            {(months === 0 && schedule.length >= 120) && (
                                <Text style={[type.caption, styles.scheduleEmpty, { color: ds.text2 }]}>
                                    Projection limited to 10 years
                                </Text>
                            )}
                        </ScrollView>

                        <View style={styles.scheduleTotal}>
                            <Text style={[type.small, { color: ds.text2 }]}>Est. total interest</Text>
                            <Text style={[type.smallMediumNum, { color: ds.text }]}>
                                {formCurrency} {totalInterest.toFormat(2)}
                            </Text>
                        </View>
                    </View>
                )}
            </>
        );
    };

    const debtTypes: { type: DebtType; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
        { type: 'LOAN', label: 'Loan', icon: 'cash-outline' },
        { type: 'CREDIT_CARD', label: 'Credit card', icon: 'card-outline' },
        { type: 'MORTGAGE', label: 'Mortgage', icon: 'home-outline' },
        { type: 'I_OWE_YOU', label: 'I owe', icon: 'arrow-redo-outline' },
        { type: 'YOU_OWE_ME', label: 'Owed to me', icon: 'arrow-undo-outline' },
    ];

    const fieldInput = [type.bodyNum, styles.input, { color: ds.text }];

    return (
        <View style={[styles.page, { backgroundColor: ds.bg }]}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                <Text style={[type.title, styles.title, { color: ds.text }]}>
                    {initialDebt ? 'Edit loan' : 'New loan'}
                </Text>

                {/* Templates */}
                <Text style={[type.small, styles.label, { color: ds.text2 }]}>Start from a template</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.shelf} contentContainerStyle={styles.shelfContent}>
                    {templates.map((t) => (
                        <TouchableOpacity key={t.label} onPress={() => applyTemplate(t)} style={styles.chip}>
                            <Ionicons name="add-outline" size={16} color={ds.text2} />
                            <Text style={[type.smallMedium, { color: ds.text2 }]}>
                                {t.label}{t.interestRate ? ` · ${t.interestRate}%` : ''}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Type; direction follows it and isn't user-editable */}
                <Text style={[type.small, styles.label, styles.groupLabel, { color: ds.text2 }]}>Type</Text>
                <View style={styles.tiles}>
                    {debtTypes.map((t) => {
                        const selected = debtType === t.type;
                        const tint = selected ? ds.accent : ds.text2;
                        return (
                            <TouchableOpacity
                                key={t.type}
                                onPress={() => setDebtType(t.type)}
                                style={[styles.tile, { backgroundColor: selected ? ds.accentSoft : ds.inset }]}
                            >
                                <Ionicons name={t.icon} size={20} color={tint} />
                                <Text
                                    style={[type.small, styles.tileLabel, { color: selected ? ds.accent : ds.text }]}
                                    numberOfLines={1}
                                    adjustsFontSizeToFit
                                >
                                    {t.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
                <Text style={[type.small, styles.hint, { color: ds.text2 }]}>
                    {direction === 'PAYABLE' ? 'You owe this.' : 'This is owed to you.'}
                </Text>

                {/* Amount */}
                <View style={[styles.amountLabel, styles.groupLabel]}>
                    <Text style={[type.small, { color: ds.text2 }]}>Initial amount ({formCurrency})</Text>
                    <TouchableOpacity onPress={() => setShowAmountCalculator(true)} hitSlop={space[2]}>
                        <Ionicons name="calculator-outline" size={22} color={ds.text2} />
                    </TouchableOpacity>
                </View>
                <TextInput
                    style={[styles.amountInput, { color: ds.text, borderBottomColor: ds.hairline }]}
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={ds.text3}
                />

                {/* Name */}
                <Text style={[type.small, styles.label, styles.groupLabel, { color: ds.text2 }]}>Name</Text>
                <View style={[styles.field, { backgroundColor: ds.inset }]}>
                    <Ionicons name="pricetag-outline" size={18} color={ds.text2} />
                    <TextInput
                        style={[type.body, styles.input, { color: ds.text }]}
                        value={name}
                        onChangeText={setName}
                        placeholder="e.g. Car loan"
                        placeholderTextColor={ds.text3}
                    />
                </View>

                {/* Start date */}
                <Text style={[type.small, styles.label, { color: ds.text2 }]}>Start date (first payment)</Text>
                <TouchableOpacity onPress={() => setShowStartDatePicker(true)} style={[styles.field, { backgroundColor: ds.inset }]}>
                    <Ionicons name="calendar-outline" size={18} color={ds.text2} />
                    <Text style={[type.bodyNum, { color: ds.text }]}>
                        {startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </Text>
                </TouchableOpacity>
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

                <SectionHeader title="Interest and payments" />

                {/* Interest rate and method */}
                <View style={styles.pair}>
                    <View style={styles.pairItem}>
                        <Text style={[type.small, styles.label, { color: ds.text2 }]}>Interest rate (%)</Text>
                        <View style={[styles.field, { backgroundColor: ds.inset }]}>
                            <Ionicons name="trending-up-outline" size={18} color={ds.text2} />
                            <TextInput
                                style={fieldInput}
                                value={interestRate}
                                onChangeText={setInterestRate}
                                keyboardType="numeric"
                                placeholder="0"
                                placeholderTextColor={ds.text3}
                            />
                        </View>
                    </View>
                    <View style={styles.pairItem}>
                        <Text style={[type.small, styles.label, { color: ds.text2 }]}>Method</Text>
                        <TouchableOpacity
                            onPress={() => setShowInterestTypeModal(true)}
                            style={[styles.field, { backgroundColor: ds.inset }]}
                        >
                            <Ionicons name="list-outline" size={18} color={ds.text2} />
                            <Text style={[type.body, styles.input, { color: ds.text }]} numberOfLines={1}>
                                {interestType.charAt(0) + interestType.slice(1).toLowerCase()}
                            </Text>
                            <Ionicons name="chevron-down" size={16} color={ds.text3} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Term and min payment */}
                <View style={styles.pair}>
                    <View style={styles.pairItem}>
                        <Text style={[type.small, styles.label, { color: ds.text2 }]}>Term (months)</Text>
                        <View style={[styles.field, { backgroundColor: ds.inset }]}>
                            <Ionicons name="hourglass-outline" size={18} color={ds.text2} />
                            <TextInput
                                style={fieldInput}
                                value={termMonths}
                                onChangeText={setTermMonths}
                                keyboardType="numeric"
                                placeholder="#"
                                placeholderTextColor={ds.text3}
                            />
                        </View>
                    </View>
                    <View style={styles.pairItem}>
                        <Text style={[type.small, styles.label, { color: ds.text2 }]}>Min. payment</Text>
                        <View style={[styles.field, { backgroundColor: ds.inset }]}>
                            <Ionicons name="cash-outline" size={18} color={ds.text2} />
                            <TextInput
                                style={fieldInput}
                                value={minPayment}
                                onChangeText={handleMinPaymentChange}
                                keyboardType="numeric"
                                placeholder="0.00"
                                placeholderTextColor={ds.text3}
                            />
                        </View>
                    </View>
                </View>

                <SectionHeader title="Details" />

                {/* Fees and contact */}
                <View style={styles.pair}>
                    <View style={styles.pairItem}>
                        <Text style={[type.small, styles.label, { color: ds.text2 }]}>Fees</Text>
                        <View style={[styles.field, { backgroundColor: ds.inset }]}>
                            <Ionicons name="receipt-outline" size={18} color={ds.text2} />
                            <TextInput
                                style={fieldInput}
                                value={fees}
                                onChangeText={setFees}
                                keyboardType="numeric"
                                placeholder="0.00"
                                placeholderTextColor={ds.text3}
                            />
                        </View>
                    </View>
                    <View style={styles.pairItem}>
                        <Text style={[type.small, styles.label, { color: ds.text2 }]}>Contact</Text>
                        <View style={[styles.field, { backgroundColor: ds.inset }]}>
                            <Ionicons name="person-outline" size={18} color={ds.text2} />
                            <TextInput
                                style={[type.body, styles.input, { color: ds.text }]}
                                value={contactInfo}
                                onChangeText={setContactInfo}
                                placeholder="Name / #"
                                placeholderTextColor={ds.text3}
                            />
                        </View>
                    </View>
                </View>

                {/* Notes */}
                <Text style={[type.small, styles.label, { color: ds.text2 }]}>Notes</Text>
                <View style={[styles.field, { backgroundColor: ds.inset }]}>
                    <Ionicons name="create-outline" size={18} color={ds.text2} />
                    <TextInput
                        style={[type.body, styles.input, { color: ds.text }]}
                        value={notes}
                        onChangeText={setNotes}
                        placeholder="Optional"
                        placeholderTextColor={ds.text3}
                        multiline
                    />
                </View>

                {/* Payment Breakdown / Computation */}
                {renderPaymentBreakdown()}
            </ScrollView>

            {/* Fixed Footer Actions */}
            <View style={[styles.footer, { backgroundColor: ds.inset, borderTopColor: ds.hairline }]}>
                <TouchableOpacity onPress={onCancel} style={styles.cancelButton}>
                    <Text style={[type.body, { color: ds.text2 }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSave} style={[styles.saveButton, { backgroundColor: ds.accent }]}>
                    <Text style={[type.bodyStrong, { color: ds.onAccent }]}>Save loan</Text>
                </TouchableOpacity>
            </View>

            {/* Transaction Info Modal */}
            <BottomModal
                visible={showTransactionInfo}
                onClose={() => setShowTransactionInfo(false)}
                title="Syncing Your Cash Flow"
                maxHeight="85%"
            >
                <ScrollView showsVerticalScrollIndicator={false}>
                    <Text style={[type.small, { color: ds.text2 }]}>
                        WealthSnap treats your finances as a connected ecosystem. To keep your Cash Balance accurate, please clarify the cash flow.
                    </Text>

                    {/* The core question */}
                    <View style={[styles.question, { backgroundColor: ds.inset }]}>
                        <Text style={[type.body, styles.questionText, { color: ds.text }]}>
                            {direction === 'PAYABLE'
                                ? '"Did this money actually enter my bank account or wallet?"'
                                : '"Did this money actually leave your bank account or wallet?"'}
                        </Text>
                    </View>

                    <SectionHeader title="Choose one" />
                    <Row
                        icon="wallet-outline"
                        title={direction === 'PAYABLE' ? 'Yes, I received the cash' : 'Yes, I sent the cash'}
                        subtitle={`Debt created + cash balance updated ${direction === 'PAYABLE' ? '(income)' : '(expense)'}`}
                        chevron
                        onPress={() => finalSave(true, true)}
                    />
                    <Row
                        icon="storefront-outline"
                        title="No, it went straight to payment"
                        subtitle="Debt created. Any fees entered are recorded as an expense."
                        chevron
                        onPress={() => finalSave(false, true)}
                    >
                        <Text style={[type.caption, styles.example, { color: ds.text2 }]}>
                            {direction === 'PAYABLE' ? 'e.g. Car loan / renovation paid to vendor.' : 'e.g. Paid a vendor directly on their behalf.'}
                        </Text>
                    </Row>
                    <Row
                        icon="eye-off-outline"
                        title="No, it's an untracked expense"
                        subtitle="Debt created only."
                        chevron
                        onPress={() => finalSave(false, false)}
                        last
                    >
                        <Text style={[type.caption, styles.example, { color: ds.text2 }]}>
                            I don&apos;t want this specific expense in my transaction history.
                        </Text>
                    </Row>
                </ScrollView>
            </BottomModal>

            {/* Interest Type Info Modal (Existing) */}
            <BottomModal
                visible={showInterestTypeModal}
                onClose={() => setShowInterestTypeModal(false)}
                title="Interest method"
                subtitle="How is interest calculated?"
                maxHeight="85%"
            >
                <ScrollView>
                    {interestTypesDetails.map((details, i) => {
                        const selected = interestType === details.type;
                        return (
                            <Row
                                key={details.type}
                                leading={
                                    <View style={[styles.radio, { borderColor: selected ? ds.accent : ds.text3 }]}>
                                        {selected && <View style={[styles.radioDot, { backgroundColor: ds.accent }]} />}
                                    </View>
                                }
                                title={details.label}
                                subtitle={details.description}
                                onPress={() => {
                                    setInterestType(details.type);
                                    setShowInterestTypeModal(false);
                                }}
                                last={i === interestTypesDetails.length - 1}
                            />
                        );
                    })}
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

const FOOTER_HEIGHT = space[3] + 48 + space[4] + 1;

const styles = StyleSheet.create({
    // RecordScreen adds no padding, so the page color and footer run edge to edge.
    page: {
        flex: 1,
    },
    content: {
        paddingHorizontal: space[5],
        paddingBottom: FOOTER_HEIGHT + space[6],
    },
    title: {
        marginTop: space[4],
        marginBottom: space[4],
    },
    label: {
        marginTop: space[3],
        marginBottom: space[1],
    },
    groupLabel: {
        marginTop: space[6],
    },
    hint: {
        marginTop: space[2],
    },
    // Bleeds to the screen edges; inner padding lines the first chip's text up with the gutter.
    shelf: {
        marginHorizontal: -space[5],
    },
    shelfContent: {
        paddingHorizontal: space[2],
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[1],
        paddingVertical: space[2],
        paddingHorizontal: space[3],
        borderRadius: radius.sm,
    },
    tiles: {
        flexDirection: 'row',
        gap: space[2],
    },
    // Tile recipe with tightened padding so five fit a phone width (matches the Record menu).
    tile: {
        flex: 1,
        aspectRatio: 1,
        padding: space[2],
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tileLabel: {
        marginTop: space[2],
        textAlign: 'center',
    },
    amountLabel: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: space[1],
    },
    amountInput: {
        fontFamily: fontFamily.semibold,
        fontSize: 44,
        lineHeight: 52,
        fontVariant: ['tabular-nums'],
        padding: 0,
        paddingBottom: space[2],
        borderBottomWidth: 1,
    },
    field: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[2],
        padding: space[3],
        borderRadius: radius.md,
    },
    // Android TextInput adds its own padding; zero it so typed fields match the pressable ones.
    input: {
        flex: 1,
        padding: 0,
    },
    pair: {
        flexDirection: 'row',
        gap: space[3],
    },
    pairItem: {
        flex: 1,
    },
    schedule: {
        maxHeight: 200,
    },
    scheduleRow: {
        flexDirection: 'row',
        paddingVertical: space[2],
        borderBottomWidth: 1,
    },
    colDate: {
        flex: 1.5,
    },
    colNum: {
        flex: 2,
        textAlign: 'right',
    },
    scheduleEmpty: {
        textAlign: 'center',
        marginVertical: space[2],
    },
    scheduleTotal: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: space[3],
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        gap: space[3],
        paddingTop: space[3],
        paddingHorizontal: space[5],
        paddingBottom: space[4],
        borderTopWidth: 1,
    },
    cancelButton: {
        flex: 1,
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveButton: {
        flex: 2,
        height: 48,
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    question: {
        borderRadius: radius.md,
        padding: space[4],
        marginTop: space[4],
    },
    questionText: {
        textAlign: 'center',
    },
    example: {
        marginTop: space[1],
    },
    radio: {
        width: 20,
        height: 20,
        borderRadius: radius.full,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioDot: {
        width: 10,
        height: 10,
        borderRadius: radius.full,
    },
});
