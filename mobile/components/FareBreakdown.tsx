import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface FareItem {
    label: string;
    amount: number;
    isDeduction?: boolean;
}

interface FareBreakdownProps {
    baseFare: number;
    distanceFare: number;
    timeFare: number;
    surgeMultiplier?: number;
    discount?: number;
    taxes: number;
    total: number;
    style?: any;
}

export function FareBreakdown(props: FareBreakdownProps) {
    const [expanded, setExpanded] = useState(false);

    return (
        <View style={[styles.container, props.style]}>
            <TouchableOpacity
                style={styles.header}
                onPress={() => setExpanded(!expanded)}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="receipt-outline" size={20} color="#6b7280" />
                    <Text style={styles.title}>Fare Breakdown</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.total}>₹{props.total.toFixed(2)}</Text>
                    <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={20} color="#6b7280" />
                </View>
            </TouchableOpacity>

            {expanded && (
                <View style={styles.details}>
                    <Row label="Base Fare" amount={props.baseFare} />
                    <Row label="Distance Fare" amount={props.distanceFare} />
                    <Row label="Time Fare" amount={props.timeFare} />

                    {props.surgeMultiplier && props.surgeMultiplier > 1 && (
                        <Row label={`Surge (x${props.surgeMultiplier})`} amount={0} isInfo />
                    )}

                    {props.discount && props.discount > 0 && (
                        <Row label="Discount" amount={props.discount} isDeduction />
                    )}

                    <Row label="Taxes & Fees" amount={props.taxes} />

                    <View style={styles.divider} />
                    <Row label="Total Amount" amount={props.total} isBold />
                    <Text style={styles.note}>Includes GST and platform fees</Text>
                </View>
            )}
        </View>
    );
}

function Row({ label, amount, isDeduction, isBold, isInfo }: { label: string, amount: number, isDeduction?: boolean, isBold?: boolean, isInfo?: boolean }) {
    return (
        <View style={styles.row}>
            <Text style={[styles.label, isBold && styles.boldLabel]}>{label}</Text>
            {!isInfo && (
                <Text style={[
                    styles.amount,
                    isDeduction && styles.deduction,
                    isBold && styles.boldAmount
                ]}>
                    {isDeduction ? '-' : ''}₹{amount.toFixed(2)}
                </Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'white',
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#f9fafb',
    },
    title: {
        fontSize: 16,
        fontWeight: '500',
        marginLeft: 8,
        color: '#374151',
    },
    total: {
        fontSize: 16,
        fontWeight: 'bold',
        marginRight: 8,
        color: '#1f2937',
    },
    details: {
        padding: 16,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    label: {
        fontSize: 14,
        color: '#6b7280',
    },
    amount: {
        fontSize: 14,
        color: '#374151',
    },
    boldLabel: {
        fontWeight: 'bold',
        color: '#1f2937',
    },
    boldAmount: {
        fontWeight: 'bold',
        color: '#1f2937',
    },
    deduction: {
        color: '#10b981',
    },
    divider: {
        height: 1,
        backgroundColor: '#e5e7eb',
        marginVertical: 12,
    },
    note: {
        fontSize: 10,
        color: '#9ca3af',
        textAlign: 'center',
        marginTop: 8,
    },
});
