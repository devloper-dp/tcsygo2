import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Text } from './text';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
 
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
    const { isDark } = useTheme();
 
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
        <View className={cn('flex-row items-center justify-center gap-3', className)}>
            <TouchableOpacity
                onPress={handlePrevious}
                disabled={currentPage === 1}
                className={`px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 ${currentPage === 1 ? 'opacity-30' : 'active:bg-slate-100 dark:active:bg-slate-800'}`}
            >
                <Text className={`text-[10px] font-black uppercase tracking-widest ${currentPage === 1 ? 'text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                    Prev
                </Text>
            </TouchableOpacity>
 
            <View className="flex-row items-center gap-2">
                {getPageNumbers().map((page, index) => {
                    if (page === '...') {
                        return (
                            <View key={`dots-${index}`} className="w-10 h-10 items-center justify-center">
                                <Text className="text-slate-400 dark:text-slate-600 font-black">...</Text>
                            </View>
                        );
                    }
 
                    const pageNum = page as number;
                    const isActive = pageNum === currentPage;
 
                    return (
                        <TouchableOpacity
                            key={pageNum}
                            onPress={() => onPageChange(pageNum)}
                            className={`w-10 h-10 rounded-xl items-center justify-center border transition-all ${isActive 
                                ? 'bg-slate-900 dark:bg-white border-slate-900 dark:border-white shadow-lg' 
                                : 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800'}`}
                        >
                            <Text className={`text-xs font-black ${isActive ? 'text-white dark:text-slate-900' : 'text-slate-900 dark:text-white'}`}>
                                {pageNum}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
 
            <TouchableOpacity
                onPress={handleNext}
                disabled={currentPage === totalPages}
                className={`px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 ${currentPage === totalPages ? 'opacity-30' : 'active:bg-slate-100 dark:active:bg-slate-800'}`}
            >
                <Text className={`text-[10px] font-black uppercase tracking-widest ${currentPage === totalPages ? 'text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                    Next
                </Text>
            </TouchableOpacity>
        </View>
    );
}
