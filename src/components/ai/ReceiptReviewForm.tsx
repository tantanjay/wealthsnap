import React, { useState, useEffect, useMemo } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BigNumber } from 'bignumber.js';
import { View, Text, ScrollView, TouchableOpacity, BackHandler, TextInput, ActivityIndicator, Platform, Modal, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@components/index';
import { useAlert } from '@context/AlertContext';
import { useTheme } from '@context/ThemeContext';
import { analyzeReceiptImage } from '@services/integrations';
import { getUserProfile } from '@services/core/storageService';
import { ReceiptAnalysisResult, ReceiptItem } from '@types';
import { CategorySelectModal } from '@components/record/CategorySelectModal';
import { formatCurrencyAmount } from '@utils/currencyUtils';
import { EXPENSE_CATEGORY_GROUPS } from '@constants/categories';

interface ReceiptReviewFormProps {
    imageUri: string;
    onSave: (transactionData: any, receiptData: ReceiptAnalysisResult, splitByCategory: boolean) => Promise<void>;
    onCancel: () => void;
}

export const ReceiptReviewForm: React.FC<ReceiptReviewFormProps> = ({ imageUri, onSave, onCancel }) => {
    const { colors } = useTheme();
    const { showAlert } = useAlert();
    const insets = useSafeAreaInsets();
    const [loading, setLoading] = useState(true);
    const [processingStep, setProcessingStep] = useState<string>('Analyzing receipt...');

    // Receipt Data State
    const [date, setDate] = useState<Date>(new Date());
    const [merchant, setMerchant] = useState('');
    const [items, setItems] = useState<ReceiptItem[]>([]);
    const [note, setNote] = useState('');
    const [currency, setCurrency] = useState('PHP');
    const [splitByCategory, setSplitByCategory] = useState(false);

    // UI State
    const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [categoryModalVisible, setCategoryModalVisible] = useState(false);
    const [activeEditingItemIndex, setActiveEditingItemIndex] = useState<number | null>(null);
    const [mainCategory, setMainCategory] = useState<string>('Uncategorized');

    // Guard against repeated analysis calls if dependencies change
    const analysisStartedRef = React.useRef<string | null>(null);

    // Block Back Button
    useEffect(() => {
        const backAction = () => {
            showAlert("Discard Analysis?", "Are you sure you want to discard this receipt?", [
                { text: "No", onPress: () => { } },
                { text: "Yes", onPress: onCancel }
            ]);
            return true;
        };

        const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
        return () => backHandler.remove();
    }, [loading, onCancel, showAlert]);

    // Initial Analysis
    useEffect(() => {
        let isMounted = true;

        const init = async () => {
            // Prevent running if already analyzed this specific image
            if (analysisStartedRef.current === imageUri) return;
            analysisStartedRef.current = imageUri;

            try {
                // Fetch Currency
                const profile = await getUserProfile();
                if (isMounted && profile && profile.currency) {
                    setCurrency(profile.currency);
                }

                // Analyze Image
                setProcessingStep('Extracting receipt data...');
                const result = await analyzeReceiptImage(imageUri);

                if (!isMounted) return;

                if (result.isValidReceipt && result.items) {

                    if (result.merchantName) setMerchant(result.merchantName);
                    setItems(result.items);

                    // Determine Main Category (Highest Sum)
                    const catSums: { [key: string]: BigNumber } = {};
                    result.items.forEach(item => {
                        const cat = item.category || 'Uncategorized';
                        catSums[cat] = (catSums[cat] || new BigNumber(0)).plus(item.amount);
                    });
                    let maxCat = 'Uncategorized';
                    let maxVal = new BigNumber(-1);
                    Object.entries(catSums).forEach(([c, v]) => {
                        if (v.isGreaterThan(maxVal)) {
                            maxVal = v;
                            maxCat = c;
                        }
                    });
                    setMainCategory(maxCat);

                    // Pre-fill note
                    const noteText = `Receipt from ${result.merchantName || 'Unknown'}`;
                    setNote(noteText);

                    if (isMounted) setLoading(false);
                } else {
                    if (result.validationError === "Gemini API Key is not configured") {
                        showAlert(
                            "Missing API Key",
                            "Please configure, go to Profile -> Google Gemini",
                            [{ text: "OK", onPress: onCancel }]
                        );
                    } else {
                        showAlert(
                            "Analysis Failed",
                            result.validationError || "Could not extract receipt data.",
                            [{ text: "Go Back", onPress: onCancel }]
                        );
                    }
                }
            } catch {
                if (isMounted) showAlert("Error", "Failed to process image.", [{ text: "Go Back", onPress: onCancel }]);
            }
        };
        init();
        return () => { isMounted = false; };
    }, [imageUri, showAlert, onCancel]);

    // Group Items by Category
    const groupedItems = useMemo(() => {
        const groups: { [key: string]: { items: ReceiptItem[], total: BigNumber, count: number } } = {};

        items.forEach(item => {
            const cat = item.category || 'Uncategorized';
            if (!groups[cat]) {
                groups[cat] = { items: [], total: new BigNumber(0), count: 0 };
            }
            groups[cat].items.push(item);
            groups[cat].total = groups[cat].total.plus(item.amount);
            groups[cat].count += 1;
        });

        return groups;
    }, [items]);

    const totalAmount = useMemo(() => {
        return items.reduce((sum, item) => sum.plus(item.amount), new BigNumber(0));
    }, [items]);

    const handleSave = async () => {
        if (totalAmount.isLessThanOrEqualTo(0)) {
            return;
        }

        let finalItems = items;

        // Consolidate items by category if splitting is enabled
        if (splitByCategory) {
            const groups: { [key: string]: BigNumber } = {};
            items.forEach(item => {
                const cat = item.category || 'Uncategorized';
                groups[cat] = (groups[cat] || new BigNumber(0)).plus(item.amount);
            });

            finalItems = Object.entries(groups).map(([cat, amount]) => ({
                description: `${cat} Items`, // Simplified description for the group
                quantity: 1,
                unitPrice: amount,
                amount: amount,
                category: cat
            }));
        }

        const data: ReceiptAnalysisResult = {
            isValidReceipt: true,
            merchantName: merchant,
            date: date.toISOString(),
            totalAmount: totalAmount,
            items: finalItems,
            confidence: 100
        };

        const transactionBase = {
            amount: totalAmount,
            date: date,
            note: note,
            category: mainCategory,
        };

        await onSave(transactionBase, data, splitByCategory);
    };

    const handleCategorySelect = (categoryValue: string) => {
        if (activeEditingItemIndex !== null) {
            // Edit Item Category
            const newItems = [...items];
            newItems[activeEditingItemIndex].category = categoryValue;
            setItems(newItems);
            setCategoryModalVisible(false);
            setActiveEditingItemIndex(null);
        } else {
            // Edit Main Category 
            setMainCategory(categoryValue);
            setCategoryModalVisible(false);
        }
    };

    if (loading) {
        return (
            <Modal
                visible={true}
                animationType="fade"
                presentationStyle="fullScreen"
                onRequestClose={() => {
                    // Prevent back button during loading or handle with alert
                    showAlert("Discard Analysis?", "Are you sure you want to discard this receipt?", [
                        { text: "No", onPress: () => { } },
                        { text: "Yes", onPress: onCancel }
                    ]);
                }}
            >
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={{ marginTop: 20, color: colors.text, fontSize: 16 }}>{processingStep}</Text>
                </View>
            </Modal>
        );
    }

    return (
        <Modal
            visible={true}
            animationType="slide"
            presentationStyle="fullScreen"
            onRequestClose={() => {
                // Handle hardware back button for Android
                showAlert("Discard Analysis?", "Are you sure you want to discard this receipt?", [
                    { text: "No", onPress: () => { } },
                    { text: "Yes", onPress: onCancel }
                ]);
            }}
        >
            <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
                <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: colors.text, fontSize: 20, fontWeight: 'bold' }}>Review Receipt</Text>
                    {/* Split Toggle */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Save as Items</Text>
                        <Switch
                            value={splitByCategory}
                            onValueChange={setSplitByCategory}
                            trackColor={{ false: colors.border, true: colors.primary }}
                            thumbColor={Platform.OS === 'ios' ? '#fff' : splitByCategory ? colors.primary : '#f4f3f4'}
                        />
                    </View>
                </View>

                <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 150 }}>
                    {/* Warning Strip */}
                    <View style={{ backgroundColor: 'rgba(255, 152, 0, 0.1)', padding: 12, borderRadius: 8, marginBottom: 16, flexDirection: 'row' }}>
                        <Ionicons name="warning-outline" size={20} color="#FF9800" style={{ marginRight: 8, marginTop: 2 }} />
                        <Text style={{ color: colors.text, fontSize: 13, flex: 1, lineHeight: 18 }}>
                            AI analysis may contain errors. Please verify all details before saving.
                        </Text>
                    </View>

                    {/* Global Info */}
                    <View style={{ gap: 12 }}>
                        {/* Date & Time Selection */}
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <TouchableOpacity
                                onPress={() => setShowDatePicker(true)}
                                style={{
                                    flex: 1,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    backgroundColor: colors.surface,
                                    padding: 12,
                                    borderRadius: 12,
                                    borderWidth: 1,
                                    borderColor: colors.border
                                }}
                            >
                                <Ionicons name="calendar-outline" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                                <View>
                                    <Text style={{ color: colors.textSecondary, fontSize: 10 }}>Date</Text>
                                    <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>
                                        {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </Text>
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => setShowTimePicker(true)}
                                style={{
                                    flex: 1,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    backgroundColor: colors.surface,
                                    padding: 12,
                                    borderRadius: 12,
                                    borderWidth: 1,
                                    borderColor: colors.border
                                }}
                            >
                                <Ionicons name="time-outline" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                                <View>
                                    <Text style={{ color: colors.textSecondary, fontSize: 10 }}>Time</Text>
                                    <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>
                                        {date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        </View>

                        {/* Merchant */}
                        <View>
                            <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 4 }}>Merchant</Text>
                            <TextInput
                                value={merchant}
                                onChangeText={setMerchant}
                                style={{ color: colors.text, borderBottomWidth: 1, borderColor: colors.border, paddingVertical: 4, fontWeight: 'bold', fontSize: 16 }}
                            />
                        </View>

                        {/* Note */}
                        <View>
                            <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 4 }}>Note</Text>
                            <TextInput
                                value={note}
                                onChangeText={setNote}
                                style={{ color: colors.text, borderBottomWidth: 1, borderColor: colors.border, paddingVertical: 4 }}
                                placeholder="Add a note..."
                                placeholderTextColor={colors.gray500}
                            />
                        </View>
                    </View>

                    {/* Main Category Selection (Only if NOT splitting) */}
                    {!splitByCategory && (
                        <View style={{ marginBottom: 20, marginTop: 10 }}>
                            <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 4 }}>Main Category</Text>
                            <TouchableOpacity
                                onPress={() => {
                                    setActiveEditingItemIndex(null); // Null implies Main Category
                                    setCategoryModalVisible(true);
                                }}
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    backgroundColor: colors.surface,
                                    padding: 12,
                                    borderRadius: 12,
                                    borderWidth: 1,
                                    borderColor: colors.border
                                }}
                            >
                                <View style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 16,
                                    backgroundColor: colors.primary + '20',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginRight: 12
                                }}>
                                    <Ionicons name="folder-open" size={16} color={colors.primary} />
                                </View>
                                <Text style={{ color: colors.text, fontSize: 16, flex: 1, fontWeight: '600' }}>{mainCategory}</Text>
                                <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Categories & Items */}
                    <Text style={{ color: colors.text, fontSize: 16, fontWeight: 'bold', marginBottom: 12, marginTop: 8 }}>
                        Items by Category
                    </Text>

                    {Object.entries(groupedItems).map(([category, data]) => (
                        <View key={category} style={{ marginBottom: 16 }}>
                            <TouchableOpacity
                                onPress={() => setExpandedCategory(expandedCategory === category ? null : category)}
                                style={{
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    backgroundColor: colors.surface,
                                    padding: 16,
                                    borderRadius: 12,
                                    borderWidth: 1,
                                    borderColor: expandedCategory === category ? colors.primary : colors.border
                                }}
                            >
                                <View>
                                    <Text style={{ color: colors.text, fontWeight: 'bold', fontSize: 16 }}>{category}</Text>
                                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{data.count} items</Text>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={{ color: colors.primary, fontWeight: 'bold', fontSize: 16 }}>
                                        {formatCurrencyAmount(data.total, currency)}
                                    </Text>
                                    <Ionicons name={expandedCategory === category ? "chevron-up" : "chevron-down"} size={16} color={colors.textSecondary} />
                                </View>
                            </TouchableOpacity>

                            {/* Expanded Items List */}
                            {expandedCategory === category && (
                                <View style={{ marginTop: 8, paddingLeft: 8 }}>
                                    {data.items.map((item, idx) => {
                                        const realIndex = items.indexOf(item);
                                        return (
                                            <View key={idx} style={{
                                                backgroundColor: colors.surface,
                                                borderRadius: 8,
                                                padding: 12,
                                                marginBottom: 8,
                                                flexDirection: 'row',
                                                justifyContent: 'space-between',
                                                alignItems: 'center'
                                            }}>
                                                <TouchableOpacity
                                                    onPress={() => {
                                                        setActiveEditingItemIndex(realIndex);
                                                        setCategoryModalVisible(true);
                                                    }}
                                                    style={{
                                                        marginRight: 12,
                                                        width: 32,
                                                        height: 32,
                                                        borderRadius: 16,
                                                        backgroundColor: colors.primary + '15',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}
                                                >
                                                    <Ionicons name="folder-open" size={16} color={colors.primary} />
                                                </TouchableOpacity>
                                                <View style={{ flex: 1, marginRight: 8 }}>
                                                    <TextInput
                                                        value={item.description}
                                                        onChangeText={(txt) => {
                                                            const newItems = [...items];
                                                            newItems[realIndex].description = txt;
                                                            setItems(newItems);
                                                        }}
                                                        style={{ color: colors.text, fontWeight: '500', marginBottom: 4 }}
                                                    />
                                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>x</Text>
                                                        <TextInput
                                                            value={item.quantity.toString()}
                                                            keyboardType="numeric"
                                                            onChangeText={(txt) => {
                                                                const qty = parseFloat(txt) || 0;
                                                                const newItems = [...items];
                                                                newItems[realIndex].quantity = qty;
                                                                newItems[realIndex].amount = newItems[realIndex].unitPrice.multipliedBy(qty);
                                                                setItems(newItems);
                                                            }}
                                                            style={{ color: colors.textSecondary, fontSize: 12, borderBottomWidth: 1, borderColor: colors.border, marginHorizontal: 4, minWidth: 20, textAlign: 'center' }}
                                                        />
                                                    </View>
                                                </View>
                                                <View style={{ alignItems: 'flex-end', minWidth: 80 }}>
                                                    <TextInput
                                                        value={item.amount.toString()}
                                                        keyboardType="numeric"
                                                        onChangeText={(txt) => {
                                                            const rawBn = new BigNumber(txt);
                                                            const amt = rawBn.isNaN() ? new BigNumber(0) : rawBn;
                                                            const newItems = [...items];
                                                            newItems[realIndex].amount = amt;
                                                            if (newItems[realIndex].quantity > 0)
                                                                newItems[realIndex].unitPrice = amt.dividedBy(newItems[realIndex].quantity);
                                                            setItems(newItems);
                                                        }}
                                                        style={{ color: colors.text, fontWeight: 'bold', borderBottomWidth: 1, borderColor: colors.border, textAlign: 'right' }}
                                                    />
                                                    <TouchableOpacity onPress={() => {
                                                        const newItems = items.filter((_, i) => i !== realIndex);
                                                        setItems(newItems);
                                                    }}>
                                                        <Text style={{ color: colors.error, fontSize: 10, marginTop: 4 }}>Remove</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        );
                                    })}
                                    <TouchableOpacity
                                        onPress={() => {
                                            const newItem: ReceiptItem = {
                                                description: "New Item",
                                                quantity: 1,
                                                unitPrice: new BigNumber(0),
                                                amount: new BigNumber(0),
                                                category: category
                                            };
                                            setItems([...items, newItem]);
                                        }}
                                        style={{ padding: 12, alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: colors.border, borderRadius: 8 }}
                                    >
                                        <Text style={{ color: colors.primary }}>+ Add Item</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    ))}

                    {/* Total Summary */}
                    <View style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        backgroundColor: colors.surface,
                        padding: 16,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: colors.border
                    }}>
                        <Text style={{ color: colors.textSecondary, fontSize: 16 }}>Total Estimate</Text>
                        <Text style={{ color: colors.text, fontSize: 24, fontWeight: 'bold' }}>
                            {formatCurrencyAmount(totalAmount, currency)}
                        </Text>
                    </View>
                </ScrollView>

                {/* Footer Actions */}
                <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, paddingTop: 16, paddingHorizontal: 16, paddingBottom: 16 + insets.bottom, backgroundColor: colors.surface, borderTopWidth: 1, borderColor: colors.border, flexDirection: 'row', gap: 12 }}>
                    <Button
                        title="Cancel"
                        variant="outline"
                        onPress={onCancel}
                        style={{ flex: 1 }}
                    />
                    <Button
                        title="Save Record"
                        onPress={handleSave}
                        style={{ flex: 1 }}
                    />
                </View>

                {/* Date Pickers */}
                {showDatePicker && (
                    <DateTimePicker
                        value={date}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={(event: any, selectedDate?: Date) => {
                            setShowDatePicker(Platform.OS === 'ios');
                            if (selectedDate) {
                                const newDate = new Date(date);
                                newDate.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
                                setDate(newDate);
                            }
                        }}
                    />
                )}
                {showTimePicker && (
                    <DateTimePicker
                        value={date}
                        mode="time"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={(event: any, selectedDate?: Date) => {
                            setShowTimePicker(Platform.OS === 'ios');
                            if (selectedDate) {
                                const newDate = new Date(date);
                                newDate.setHours(selectedDate.getHours(), selectedDate.getMinutes());
                                setDate(newDate);
                            }
                        }}
                    />
                )}
            </View>

            <CategorySelectModal
                visible={categoryModalVisible}
                onClose={() => setCategoryModalVisible(false)}
                onSelect={handleCategorySelect}
                categoryGroups={EXPENSE_CATEGORY_GROUPS}
            />
        </Modal>
    );
};
