import React from 'react';
import { View, Dimensions, StyleSheet } from 'react-native';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { Text } from './text';
import { cn } from '@/lib/utils';

const screenWidth = Dimensions.get('window').width;

interface ChartData {
    labels: string[];
    datasets: {
        data: number[];
        color?: (opacity: number) => string;
    }[];
}

interface PieChartData {
    name: string;
    population: number;
    color: string;
    legendFontColor: string;
    legendFontSize: number;
}

interface ChartProps {
    type: 'line' | 'bar' | 'pie';
    data: ChartData | PieChartData[];
    title?: string;
    className?: string;
    width?: number;
    height?: number;
}

const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
    style: {
        borderRadius: 16,
    },
    propsForDots: {
        r: '6',
        strokeWidth: '2',
        stroke: '#3b82f6',
    },
};

export function Chart({
    type,
    data,
    title,
    className,
    width = screenWidth - 40,
    height = 220,
}: ChartProps) {
    const renderChart = () => {
        switch (type) {
            case 'line':
                return (
                    <LineChart
                        data={data as ChartData}
                        width={width}
                        height={height}
                        chartConfig={chartConfig}
                        bezier
                        style={styles.chart}
                    />
                );
            case 'bar':
                return (
                    <BarChart
                        data={data as ChartData}
                        width={width}
                        height={height}
                        chartConfig={chartConfig}
                        style={styles.chart}
                        yAxisLabel=""
                        yAxisSuffix=""
                    />
                );
            case 'pie':
                return (
                    <PieChart
                        data={data as PieChartData[]}
                        width={width}
                        height={height}
                        chartConfig={chartConfig}
                        accessor="population"
                        backgroundColor="transparent"
                        paddingLeft="15"
                        absolute
                        style={styles.chart}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <View className={cn('bg-white rounded-2xl p-4', className)} style={styles.container}>
            {title && <Text style={styles.title}>{title}</Text>}
            {renderChart()}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 12,
    },
    chart: {
        borderRadius: 16,
    },
});
