import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from './text';
import { cn } from '@/lib/utils';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    className?: string;
    maxVisible?: number;
}

export function Pagination({
    currentPage,
    totalPages,
    onPageChange,
    className,
    maxVisible = 5,
}: PaginationProps) {
    const getPageNumbers = () => {
        const pages: (number | string)[] = [];

        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            const leftSiblingIndex = Math.max(currentPage - 1, 1);
            const rightSiblingIndex = Math.min(currentPage + 1, totalPages);

            const shouldShowLeftDots = leftSiblingIndex > 2;
            const shouldShowRightDots = rightSiblingIndex < totalPages - 1;

            if (!shouldShowLeftDots && shouldShowRightDots) {
                const leftRange = Array.from({ length: 3 }, (_, i) => i + 1);
                pages.push(...leftRange, '...', totalPages);
            } else if (shouldShowLeftDots && !shouldShowRightDots) {
                pages.push(1, '...');
                const rightRange = Array.from({ length: 3 }, (_, i) => totalPages - 2 + i);
                pages.push(...rightRange);
            } else {
                pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
            }
        }

        return pages;
    };

    const handlePrevious = () => {
        if (currentPage > 1) {
            onPageChange(currentPage - 1);
        }
    };

    const handleNext = () => {
        if (currentPage < totalPages) {
            onPageChange(currentPage + 1);
        }
    };

    return (
        <View className={cn('flex-row items-center justify-center gap-2', className)}>
            <TouchableOpacity
                onPress={handlePrevious}
                disabled={currentPage === 1}
                style={[styles.button, currentPage === 1 && styles.buttonDisabled]}
            >
                <Text style={[styles.buttonText, currentPage === 1 && styles.textDisabled]}>
                    Previous
                </Text>
            </TouchableOpacity>

            {getPageNumbers().map((page, index) => {
                if (page === '...') {
                    return (
                        <View key={`dots-${index}`} style={styles.dots}>
                            <Text style={styles.dotsText}>...</Text>
                        </View>
                    );
                }

                const pageNum = page as number;
                const isActive = pageNum === currentPage;

                return (
                    <TouchableOpacity
                        key={pageNum}
                        onPress={() => onPageChange(pageNum)}
                        style={[styles.pageButton, isActive && styles.pageButtonActive]}
                    >
                        <Text style={[styles.pageText, isActive && styles.pageTextActive]}>
                            {pageNum}
                        </Text>
                    </TouchableOpacity>
                );
            })}

            <TouchableOpacity
                onPress={handleNext}
                disabled={currentPage === totalPages}
                style={[styles.button, currentPage === totalPages && styles.buttonDisabled]}
            >
                <Text style={[styles.buttonText, currentPage === totalPages && styles.textDisabled]}>
                    Next
                </Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    button: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 6,
        backgroundColor: '#f3f4f6',
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    buttonText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#1f2937',
    },
    textDisabled: {
        color: '#9ca3af',
    },
    pageButton: {
        width: 36,
        height: 36,
        borderRadius: 6,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f3f4f6',
    },
    pageButtonActive: {
        backgroundColor: '#3b82f6',
    },
    pageText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#1f2937',
    },
    pageTextActive: {
        color: '#ffffff',
    },
    dots: {
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dotsText: {
        fontSize: 14,
        color: '#9ca3af',
    },
});
