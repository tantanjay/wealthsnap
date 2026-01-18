import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, Alert } from 'react-native';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { useTheme } from '../../context/ThemeContext';
import { Button, Card } from '../../components';
import { saveUserProfile, setOnboardingComplete } from '../../services/storageService';
import { UserProfile } from '../../types';

const SetupScreen = ({ navigation }: any) => {
    const { colors } = useTheme();
    const [name, setName] = useState('');
    const [currency, setCurrency] = useState('USD');
    const [salary, setSalary] = useState('');
    const [goals, setGoals] = useState<string[]>([]);

    const availableGoals = ['Save Money', 'Invest More', 'Reduce Debt', 'Track Spending', 'Retire Early'];

    const toggleGoal = (goal: string) => {
        if (goals.includes(goal)) setGoals(goals.filter(g => g !== goal));
        else setGoals([...goals, goal]);
    };

    const handleFinish = async () => {
        if (!name) {
            Alert.alert('Required', 'Please enter your name.');
            return;
        }

        const profile: UserProfile = {
            id: Date.now().toString(),
            name,
            currency,
            monthlySalary: parseFloat(salary) || 0,
            financialGoals: goals,
            isOnboardingComplete: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await saveUserProfile(profile);
        await setOnboardingComplete();
        navigation.replace('Main');
    };

    return (
        <ScreenWrapper>
            <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={{ color: colors.primary, fontSize: 24, fontWeight: 'bold', marginVertical: 20 }}>Setup Profile</Text>

                <Card>
                    <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>Preferred Name</Text>
                    <TextInput
                        style={{ color: colors.text, fontSize: 16, borderBottomWidth: 1, borderBottomColor: colors.border, padding: 8 }}
                        value={name}
                        onChangeText={setName}
                        placeholder="John Doe"
                        placeholderTextColor={colors.gray500}
                    />
                </Card>

                <Card>
                    <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>Currency</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                        {['USD', 'EUR', 'GBP', 'JPY', 'PHP'].map(curr => (
                            <Text
                                key={curr}
                                onPress={() => setCurrency(curr)}
                                style={{
                                    color: currency === curr ? colors.white : colors.text,
                                    backgroundColor: currency === curr ? colors.primary : 'transparent',
                                    paddingVertical: 8,
                                    paddingHorizontal: 12,
                                    borderRadius: 8,
                                    marginRight: 8,
                                    marginBottom: 8,
                                    overflow: 'hidden',
                                    borderWidth: 1,
                                    borderColor: currency === curr ? colors.primary : colors.border
                                }}
                            >
                                {curr}
                            </Text>
                        ))}
                    </View>
                </Card>

                <Card>
                    <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>Monthly Salary (Estimate)</Text>
                    <TextInput
                        style={{ color: colors.text, fontSize: 16, borderBottomWidth: 1, borderBottomColor: colors.border, padding: 8 }}
                        value={salary}
                        onChangeText={setSalary}
                        keyboardType="numeric"
                        placeholder="5000"
                        placeholderTextColor={colors.gray500}
                    />
                </Card>

                <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold', marginVertical: 10 }}>Financial Goals</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    {availableGoals.map(goal => (
                        <Text
                            key={goal}
                            onPress={() => toggleGoal(goal)}
                            style={{
                                color: goals.includes(goal) ? colors.white : colors.text,
                                backgroundColor: goals.includes(goal) ? colors.primary : 'transparent',
                                padding: 10,
                                borderRadius: 20,
                                marginRight: 8,
                                marginBottom: 8,
                                overflow: 'hidden',
                                borderWidth: 1,
                                borderColor: goals.includes(goal) ? colors.primary : colors.border
                            }}
                        >
                            {goal}
                        </Text>
                    ))}
                </View>

                <Button title="Complete Setup" onPress={handleFinish} style={{ marginTop: 20, marginBottom: 40 }} />
            </ScrollView>
        </ScreenWrapper>
    );
};
export default SetupScreen;
