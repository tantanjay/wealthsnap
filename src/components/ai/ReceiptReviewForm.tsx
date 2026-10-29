import React, { useState, useEffect, useMemo } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BigNumber } from 'bignumber.js';
import { View, Text, ScrollView, Pressable, BackHandler, TextInput, ActivityIndicator, Platform, Modal, Switch, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Group, Row, SectionHeader } from '@components/ds';
import { Disclaimer } from '@components/common/Disclaimer';
import { useAlert } from '@context/AlertContext';
import { useTheme } from '@context/ThemeContext';
import { type, space, radius, layout } from '@styles/theme';
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
    const { ds } = useTheme();
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
                <View style={[styles.loading, { backgroundColor: ds.canvas }]}>
                    <ActivityIndicator size="large" color={ds.accent} />
                    <Text style={[type.body, { marginTop: space[5], color: ds.text2 }]}>{processingStep}</Text>
                </View>
            </Modal>
        );
    }

    const groupEntries = Object.entries(groupedItems);

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
            <View style={{ flex: 1, backgroundColor: ds.canvas, paddingTop: insets.top }}>
                <View style={styles.topBar}>
                    <Text style={[type.title, styles.title, { color: ds.text }]}>Review receipt</Text>
                </View>

                <ScrollView contentContainerStyle={styles.content}>
                    <Disclaimer severity="warning" style={{ marginTop: 0 }}>
                        AI analysis may contain errors. Please verify all details before saving.
                    </Disclaimer>

                    {/* Total is derived from the items below, so it reads like the amount input but isn't editable */}
                    <Group padded style={styles.firstGroup}>
                        <Text style={[type.small, { color: ds.text2 }]}>Total estimate</Text>
                        <Text style={[type.recordAmount, styles.amount, { color: ds.text }]} numberOfLines={1} adjustsFontSizeToFit>
                            {formatCurrencyAmount(totalAmount, currency)}
                        </Text>
                    </Group>

                    {/* Date, time, merchant and note */}
                    <SectionHeader title="Details" grouped />
                    <Group padded>
                        <View style={styles.dateRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={[type.small, styles.label, { color: ds.text2 }]}>Date</Text>
                                <Pressable onPress={() => setShowDatePicker(true)} style={[styles.field, { backgroundColor: ds.inset }]}>
                                    <Ionicons name="calendar-outline" size={18} color={ds.text2} />
                                    <Text style={[type.bodyNum, styles.fieldValue, { color: ds.text }]} numberOfLines={1}>
                                        {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </Text>
                                </Pressable>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[type.small, styles.label, { color: ds.text2 }]}>Time</Text>
                                <Pressable onPress={() => setShowTimePicker(true)} style={[styles.field, { backgroundColor: ds.inset }]}>
                                    <Ionicons name="time-outline" size={18} color={ds.text2} />
                                    <Text style={[type.bodyNum, styles.fieldValue, { color: ds.text }]} numberOfLines={1}>
                                        {date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                    </Text>
                                </Pressable>
                            </View>
                        </View>

                        <Text style={[type.small, styles.label, styles.fieldGap, { color: ds.text2 }]}>Merchant</Text>
                        <View style={[styles.field, { backgroundColor: ds.inset }]}>
                            <Ionicons name="storefront-outline" size={18} color={ds.text2} />
                            <TextInput
                                value={merchant}
                                onChangeText={setMerchant}
                                style={[type.body, styles.fieldValue, { color: ds.text }]}
                            />
                        </View>

                        <Text style={[type.small, styles.label, styles.fieldGap, { color: ds.text2 }]}>Note</Text>
                        <View style={[styles.field, { backgroundColor: ds.inset }]}>
                            <Ionicons name="document-text-outline" size={18} color={ds.text2} />
                            <TextInput
                                value={note}
                                onChangeText={setNote}
                                style={[type.body, styles.fieldValue, { color: ds.text }]}
                                placeholder="Add a note..."
                                placeholderTextColor={ds.text3}
                            />
                        </View>
                    </Group>

                    {/* Main category (only when not splitting) and the split toggle */}
                    <SectionHeader title="Category" grouped />
                    <Group>
                        {!splitByCategory && (
                            <Row
                                icon="folder-open-outline"
                                title={mainCategory}
                                subtitle="Main category"
                                onPress={() => {
                                    setActiveEditingItemIndex(null); // Null implies Main Category
                                    setCategoryModalVisible(true);
                                }}
                                trailing={<Ionicons name="chevron-down" size={16} color={ds.text3} />}
                            />
                        )}
                        <Row
                            icon="albums-outline"
                            title="Save as items"
                            subtitle="One expense per category instead of one total"
                            trailing={
                                <Switch
                                    value={splitByCategory}
                                    onValueChange={setSplitByCategory}
                                    trackColor={{ false: ds.hairline, true: ds.accent }}
                                />
                            }
                            last
                        />
                    </Group>

                    {/* Categories & Items */}
                    <SectionHeader title="Items by category" grouped />
                    <Group>
                        {groupEntries.map(([category, data], groupIndex) => {
                            const isExpanded = expandedCategory === category;
                            return (
                                <View key={category}>
                                    <Row
                                        title={category}
                                        subtitle={`${data.count} items`}
                                        value={formatCurrencyAmount(data.total, currency)}
                                        trailing={<Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={16} color={ds.text3} />}
                                        onPress={() => setExpandedCategory(isExpanded ? null : category)}
                                        last={groupIndex === groupEntries.length - 1 && !isExpanded}
                                    />

                                    {/* Expanded Items List */}
                                    {isExpanded && (
                                        <View style={[styles.itemList, { borderBottomColor: ds.hairline }]}>
                                            {data.items.map((item, idx) => {
                                                const realIndex = items.indexOf(item);
                                                return (
                                                    <View key={idx} style={[styles.itemRow, { borderBottomColor: ds.hairline }]}>
                                                        <Pressable
                                                            onPress={() => {
                                                                setActiveEditingItemIndex(realIndex);
                                                                setCategoryModalVisible(true);
                                                            }}
                                                            hitSlop={space[2]}
                                                            accessibilityLabel="Change item category"
                                                        >
                                                            <Ionicons name="folder-open-outline" size={20} color={ds.text2} />
                                                        </Pressable>
                                                        <View style={{ flex: 1 }}>
                                                            <TextInput
                                                                value={item.description}
                                                                onChangeText={(txt) => {
                                                                    const newItems = [...items];
                                                                    newItems[realIndex].description = txt;
                                                                    setItems(newItems);
                                                                }}
                                                                style={[type.body, styles.inlineInput, { color: ds.text }]}
                                                            />
                                                            <View style={styles.qtyRow}>
                                                                <Text style={[type.small, { color: ds.text2 }]}>Qty</Text>
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
                                                                    style={[type.smallNum, styles.qtyInput, { color: ds.text, backgroundColor: ds.inset }]}
                                                                />
                                                            </View>
                                                        </View>
                                                        <View style={styles.itemEnd}>
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
                                                                style={[type.bodyNum, styles.amountField, { color: ds.text, backgroundColor: ds.inset }]}
                                                            />
                                                            <Pressable
                                                                onPress={() => {
                                                                    const newItems = items.filter((_, i) => i !== realIndex);
                                                                    setItems(newItems);
                                                                }}
                                                                hitSlop={space[2]}
                                                            >
                                                                <Text style={[type.smallMedium, { color: ds.danger }]}>Remove</Text>
                                                            </Pressable>
                                                        </View>
                                                    </View>
                                                );
                                            })}
                                            <Pressable
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
                                                style={styles.addItem}
                                            >
                                                <Ionicons name="add-outline" size={18} color={ds.accent} />
                                                <Text style={[type.smallMedium, { color: ds.accent }]}>Add item</Text>
                                            </Pressable>
                                        </View>
                                    )}
                                </View>
                            );
                        })}
                    </Group>
                </ScrollView>

                {/* Footer Actions */}
                <View style={[styles.footer, { paddingBottom: space[4] + insets.bottom, backgroundColor: ds.group, borderTopColor: ds.hairline }]}>
                    <Pressable onPress={onCancel} style={styles.cancelButton}>
                        <Text style={[type.body, { color: ds.text2 }]}>Cancel</Text>
                    </Pressable>
                    <Pressable onPress={handleSave} style={[styles.primaryButton, { backgroundColor: ds.accent }]}>
                        <Text style={[type.bodyStrong, { color: ds.onAccent }]}>
                            {splitByCategory ? 'Save expenses' : 'Save expense'}
                        </Text>
                    </Pressable>
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

const styles = StyleSheet.create({
    loading: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    topBar: {
        paddingHorizontal: layout.groupInset,
        paddingTop: space[3],
        paddingBottom: space[4],
    },
    title: {
        paddingHorizontal: layout.groupPadding,
    },
    // Bottom padding clears the fixed footer.
    content: {
        paddingHorizontal: layout.groupInset,
        paddingBottom: 150,
    },
    firstGroup: {
        marginTop: space[4],
    },
    amount: {
        paddingTop: space[1],
    },
    dateRow: {
        flexDirection: 'row',
        gap: space[3],
    },
    label: {
        marginBottom: space[1],
    },
    fieldGap: {
        marginTop: space[3],
    },
    field: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[2],
        padding: space[3],
        borderRadius: radius.md,
    },
    fieldValue: {
        flex: 1,
        padding: 0,
    },
    itemList: {
        paddingLeft: space[5],
        borderBottomWidth: 1,
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[3],
        paddingVertical: space[3],
        borderBottomWidth: 1,
    },
    inlineInput: {
        padding: 0,
    },
    qtyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[2],
        marginTop: space[1],
    },
    qtyInput: {
        minWidth: 32,
        paddingVertical: 0,
        paddingHorizontal: space[2],
        borderRadius: radius.sm,
        textAlign: 'center',
    },
    itemEnd: {
        alignItems: 'flex-end',
        gap: space[1],
        minWidth: 88,
    },
    amountField: {
        minWidth: 88,
        paddingVertical: space[1],
        paddingHorizontal: space[2],
        borderRadius: radius.sm,
        textAlign: 'right',
    },
    addItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[1],
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
        paddingHorizontal: layout.groupInset,
        borderTopWidth: 1,
    },
    cancelButton: {
        flex: 1,
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryButton: {
        flex: 2,
        height: 48,
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
