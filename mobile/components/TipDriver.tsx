import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/ui/card';

interface TipDriverProps {
    driverName: string;
    onTipSelected?: (amount: number) => void;
    style?: any;
}

const PRESET_TIPS = [10, 20, 30, 50];

export function TipDriver({ driverName, onTipSelected, style }: TipDriverProps) {
    const [selectedTip, setSelectedTip] = useState<number | null>(null);
    const [customTip, setCustomTip] = useState('');
    const [showCustom, setShowCustom] = useState(false);

    const handlePresetTip = (amount: number) => {
        setSelectedTip(amount);
        setShowCustom(false);
        setCustomTip('');
        onTipSelected?.(amount);
    };

    const handleCustomSubmit = () => {
        const amount = parseFloat(customTip);
        if (!isNaN(amount) && amount > 0) {
            setSelectedTip(amount);
            onTipSelected?.(amount);
        }
    };

    return (
        <Card style={[styles.container, style]}>
            <View style={styles.header}>
                <View style={styles.iconBg}>
                    <Ionicons name="heart" size={24} color="#f59e0b" />
                </View>
                <Text style={styles.title}>Tip Your Driver</Text>
                <Text style={styles.subtitle}>Show appreciation for {driverName}</Text>
            </View>

            <View style={styles.grid}>
                {PRESET_TIPS.map(amount => (
                    <TouchableOpacity
                        key={amount}
                        style={[
                            styles.chip,
                            selectedTip === amount && styles.chipSelected
                        ]}
                        onPress={() => handlePresetTip(amount)}
                    >
                        <Text style={[
                            styles.chipText,
                            selectedTip === amount && styles.chipTextSelected
                        ]}>₹{amount}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {showCustom ? (
                <View style={styles.customRow}>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter amount"
                        keyboardType="numeric"
                        value={customTip}
                        onChangeText={setCustomTip}
                    />
                    <TouchableOpacity style={styles.addBtn} onPress={handleCustomSubmit}>
                        <Text style={styles.addBtnText}>Add</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <TouchableOpacity
                    style={styles.customLink}
                    onPress={() => setShowCustom(true)}
                >
                    <Text style={styles.customLinkText}>Enter Custom Amount</Text>
                </TouchableOpacity>
            )}

            {selectedTip !== null && selectedTip > 0 && (
                <View style={styles.successMsg}>
                    <Ionicons name="star" size={16} color="#10b981" />
                    <Text style={styles.successText}>₹{selectedTip} tip added to bill</Text>
                </View>
            )}
        </Card>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
        backgroundColor: 'white',
        borderRadius: 12,
    },
    header: {
        alignItems: 'center',
        marginBottom: 20,
    },
    iconBg: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#fef3c7',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    subtitle: {
        fontSize: 14,
        color: '#6b7280',
    },
    grid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    chip: {
        flex: 1,
        marginHorizontal: 4,
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        alignItems: 'center',
    },
    chipSelected: {
        backgroundColor: '#3b82f6',
        borderColor: '#3b82f6',
    },
    chipText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
    },
    chipTextSelected: {
        color: 'white',
    },
    customLink: {
        alignItems: 'center',
        padding: 12,
    },
    customLinkText: {
        color: '#3b82f6',
        fontWeight: '600',
    },
    customRow: {
        flexDirection: 'row',
        gap: 8,
    },
    input: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        padding: 10,
        fontSize: 16,
    },
    addBtn: {
        backgroundColor: '#3b82f6',
        justifyContent: 'center',
        paddingHorizontal: 20,
        borderRadius: 8,
    },
    addBtnText: {
        color: 'white',
        fontWeight: '600',
    },
    successMsg: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ecfdf5',
        padding: 12,
        borderRadius: 8,
        marginTop: 12,
        gap: 6,
    },
    successText: {
        color: '#059669',
        fontWeight: '600',
        fontSize: 14,
    },
});
