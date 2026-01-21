import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Card } from '..';
import { Transaction } from '../../types';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrencyAmount } from '../../utils/currencyUtils';
import { Skeleton } from '../common/Skeleton';

interface HomeTransactionsCardProps {
    recentTransactions: Transaction[];
    topTransactions: Transaction[];
    currency: string;
    onTransactionPress?: (transaction: Transaction) => void;
    isPrivacyEnabled?: boolean;
    isLoading?: boolean;
}

const HomeTransactionsCard: React.FC<HomeTransactionsCardProps> = ({
    recentTransactions,
    topTransactions,
    currency,
    onTransactionPress,
    isPrivacyEnabled = false,
    isLoading = false
}) => {
    const { colors } = useTheme();
    const [activeTab, setActiveTab] = useState<'RECENT' | 'TOP'>('RECENT');

    const getCategoryIcon = (category: string): string => {
        const iconMap: { [key: string]: string } = {
            'Food': 'fast-food',
            'Groceries': 'cart',
            'Shopping': 'bag',
            'Transportation': 'car',
            'Entertainment': 'film',
            'Bills': 'receipt',
            'Salary': 'briefcase',
            'Business': 'business',
        };
        return iconMap[category] || 'wallet';
    };

    const currentData = activeTab === 'RECENT' ? recentTransactions : topTransactions;
    const isEmpty = currentData.length === 0;

    const renderHeader = () => (
        <View style={styles.headerContainer}>
            <View style={styles.tabsContainer}>
                <TouchableOpacity
                    onPress={() => setActiveTab('RECENT')}
                    style={[
                        styles.tab,
                        activeTab === 'RECENT' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }
                    ]}
                >
                    <Text style={[
                        styles.tabText,
                        { color: activeTab === 'RECENT' ? colors.primary : colors.textSecondary }
                    ]}>
                        Recent
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => setActiveTab('TOP')}
                    style={[
                        styles.tab,
                        activeTab === 'TOP' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }
                    ]}
                >
                    <Text style={[
                        styles.tabText,
                        { color: activeTab === 'TOP' ? colors.primary : colors.textSecondary }
                    ]}>
                        Top Expenses
                    </Text>
                </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => onTransactionPress?.(currentData[0])}>
                <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600' }}>See All</Text>
            </TouchableOpacity>
        </View>
    );

    const renderSkeleton = () => (
        <View>
            {[1, 2, 3, 4, 5].map((key) => (
                <View key={key} style={[styles.itemContainer, { borderBottomColor: colors.border, borderBottomWidth: key < 5 ? 1 : 0 }]}>
                    <Skeleton width={24} height={24} borderRadius={12} style={{ marginRight: 12 }} />
                    <Skeleton width={40} height={40} borderRadius={20} style={{ marginRight: 12 }} />
                    <View style={{ flex: 1, marginRight: 12 }}>
                        <Skeleton width="60%" height={16} style={{ marginBottom: 6 }} />
                        <Skeleton width="40%" height={12} />
                    </View>
                    <Skeleton width={80} height={16} />
                </View>
            ))}
        </View>
    );

    return (
        <Card>
            {renderHeader()}

            {isLoading ? (
                renderSkeleton()
            ) : isEmpty ? (
                <View style={{ padding: 20, alignItems: 'center' }}>
                    <Ionicons name="receipt-outline" size={48} color={colors.textSecondary} />
                    <Text style={{ color: colors.textSecondary, marginTop: 10, textAlign: 'center' }}>
                        No transactions found
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={currentData}
                    scrollEnabled={false}
                    keyExtractor={(item, index) => `${item.id}-${index}`}
                    renderItem={({ item, index }) => (
                        <TouchableOpacity
                            onPress={() => onTransactionPress?.(item)}
                            style={[
                                styles.itemContainer,
                                {
                                    borderBottomColor: colors.border,
                                    borderBottomWidth: index < currentData.length - 1 ? 1 : 0
                                }
                            ]}
                        >
                            {/* Rank/Index Badge */}
                            <View style={[
                                styles.badge,
                                {
                                    backgroundColor: activeTab === 'TOP'
                                        ? (index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : colors.surface)
                                        : colors.surface
                                }
                            ]}>
                                <Text style={{
                                    color: (activeTab === 'TOP' && index < 3) ? '#000' : colors.text,
                                    fontSize: 12,
                                    fontWeight: 'bold'
                                }}>
                                    {index + 1}
                                </Text>
                            </View>

                            {/* Icon */}
                            <View style={[
                                styles.iconContainer,
                                { backgroundColor: item.type === 'EXPENSE' ? '#F4433620' : '#4CAF5020' }
                            ]}>
                                <Ionicons
                                    name={getCategoryIcon(item.category) as any}
                                    size={20}
                                    color={item.type === 'EXPENSE' ? '#F44336' : '#4CAF50'}
                                />
                            </View>

                            {/* Details */}
                            <View style={{ flex: 1 }}>
                                <Text
                                    style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}
                                    numberOfLines={1}
                                    ellipsizeMode="tail"
                                >
                                    {item.note || item.category}
                                </Text>
                                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                                    {item.note ? `${item.category} • ` : ''}{new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </Text>
                            </View>

                            {/* Amount */}
                            <Text style={{
                                color: item.type === 'EXPENSE' ? '#F44336' : '#4CAF50',
                                fontSize: 16,
                                fontWeight: 'bold'
                            }}>
                                {item.type === 'EXPENSE' ? '-' : '+'}{isPrivacyEnabled ? '****' : formatCurrencyAmount(item.amount, currency)}
                            </Text>
                        </TouchableOpacity>
                    )}
                />
            )}
        </Card>
    );
};

const styles = StyleSheet.create({
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
        paddingBottom: 5
    },
    tabsContainer: {
        flexDirection: 'row',
        gap: 20,
    },
    tab: {
        paddingVertical: 5,
        paddingHorizontal: 5,
    },
    tabText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    itemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
    },
    badge: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    }
});

export default HomeTransactionsCard;
