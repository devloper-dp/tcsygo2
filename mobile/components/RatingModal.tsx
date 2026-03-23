import React, { useState } from 'react';
import { View, Modal, TouchableOpacity, TextInput, ScrollView, StyleSheet } from 'react-native';
import { Text } from './ui/text';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Star, ThumbsUp, X } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
 
interface RatingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (rating: number, feedback: string, tags: string[]) => void;
    tripDetails: {
        driverName: string;
        driverPhoto?: string;
        amount: number;
        pickup: string;
        drop: string;
    };
    isDriver?: boolean;
}
 
export function RatingModal({ isOpen, onClose, onSubmit, tripDetails, isDriver = false }: RatingModalProps) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
 
    const [rating, setRating] = useState(0);
    const [feedback, setFeedback] = useState('');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
 
    const driverTags = ["Polite", "Safe Driving", "Clean Car", "Good Music", "Conversation"];
    const passengerTags = ["Polite", "Punctual", "Respectful", "Tipped"];
    const tags = isDriver ? passengerTags : driverTags;
 
    const toggleTag = (tag: string) => {
        if (selectedTags.includes(tag)) {
            setSelectedTags(selectedTags.filter(t => t !== tag));
        } else {
            setSelectedTags([...selectedTags, tag]);
        }
    };
 
    const handleSubmit = () => {
        onSubmit(rating, feedback, selectedTags);
        onClose();
        setRating(0);
        setFeedback('');
        setSelectedTags([]);
    };
 
    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={isOpen}
            onRequestClose={onClose}
        >
            <View className="flex-1 justify-end bg-black/60">
                <View className="bg-white dark:bg-slate-900 rounded-t-[40px] p-8 max-h-[90%] border-t border-slate-100 dark:border-slate-800">
                    <ScrollView showsVerticalScrollIndicator={false}>
                        <View className="items-center mb-8">
                            <View className="w-12 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mb-8" />
                            <Text className="text-2xl font-black text-slate-900 dark:text-white">
                                {isDriver ? 'Rate Passenger' : 'How was your ride?'}
                            </Text>
                            <Text className="text-slate-500 dark:text-slate-400 text-center mt-2 font-medium px-4">
                                {isDriver ? `Rate your experience with passenger` : `How was your trip with ${tripDetails.driverName}?`}
                            </Text>
                        </View>
 
                        <View className="items-center mb-8">
                            <Avatar className="w-24 h-24 mb-4 border-4 border-slate-50 dark:border-slate-800 shadow-lg">
                                <AvatarImage src={tripDetails.driverPhoto} />
                                <AvatarFallback className="bg-slate-100 dark:bg-slate-800">
                                    <Text className="text-2xl font-black text-slate-400 dark:text-slate-500">{tripDetails.driverName.charAt(0)}</Text>
                                </AvatarFallback>
                            </Avatar>
                            <Text className="font-black text-xl text-slate-900 dark:text-white mb-2">{tripDetails.driverName}</Text>
                            <View className="bg-emerald-50 dark:bg-emerald-900/10 px-6 py-2 rounded-full border border-emerald-100 dark:border-emerald-900/20 shadow-sm shadow-emerald-500/10">
                                <Text className="text-2xl font-black text-emerald-500">₹{tripDetails.amount}</Text>
                            </View>
                        </View>
 
                        <View className="flex-row justify-center gap-4 mb-10">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <TouchableOpacity
                                    key={star}
                                    onPress={() => setRating(star)}
                                    activeOpacity={0.7}
                                    className="p-1"
                                >
                                    <Star
                                        size={44}
                                        color={rating >= star ? '#eab308' : (isDark ? '#334155' : '#e2e8f0')}
                                        fill={rating >= star ? '#eab308' : 'none'}
                                        strokeWidth={1.5}
                                    />
                                </TouchableOpacity>
                            ))}
                        </View>
 
                        <View className="flex-row flex-wrap justify-center gap-3 mb-8 px-2">
                            {tags.map((tag) => (
                                <TouchableOpacity
                                    key={tag}
                                    onPress={() => toggleTag(tag)}
                                    activeOpacity={0.7}
                                    className={`flex-row items-center px-5 py-3 rounded-2xl border shadow-sm ${
                                        selectedTags.includes(tag) 
                                            ? 'bg-blue-600 dark:bg-blue-500 border-blue-600 dark:border-blue-500' 
                                            : 'bg-white dark:bg-slate-800/20 border-slate-100 dark:border-slate-800'
                                    }`}
                                >
                                    {selectedTags.includes(tag) && <ThumbsUp size={16} color="white" className="mr-2" />}
                                    <Text className={`text-sm font-bold ${selectedTags.includes(tag) ? 'text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                                        {tag}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
 
                        <TextInput
                            placeholder="Additional comments (optional)..."
                            placeholderTextColor={isDark ? "#475569" : "#94a3b8"}
                            value={feedback}
                            onChangeText={setFeedback}
                            multiline
                            numberOfLines={3}
                            className="bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-[24px] p-5 mb-8 text-slate-800 dark:text-white text-sm font-medium h-32"
                            textAlignVertical="top"
                        />
 
                        <View className="flex-row gap-4 mb-6">
                            <TouchableOpacity 
                                className="flex-1 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 items-center justify-center" 
                                onPress={onClose}
                            >
                                <Text className="text-slate-500 dark:text-slate-400 font-bold">Skip</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                className={`flex-1 h-14 rounded-2xl items-center justify-center shadow-lg ${
                                    rating === 0 
                                        ? 'bg-slate-200 dark:bg-slate-800 shadow-none' 
                                        : 'bg-blue-600 shadow-blue-500/20'
                                }`}
                                onPress={handleSubmit}
                                disabled={rating === 0}
                            >
                                <Text className={`text-base font-bold ${rating === 0 ? 'text-slate-400 dark:text-slate-600' : 'text-white'}`}>Submit</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}
 
const styles = StyleSheet.create({});
