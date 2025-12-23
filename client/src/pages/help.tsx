import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Mail, Phone, MessageCircle, HelpCircle } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export default function HelpPage() {
    const { toast } = useToast();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const faqItems = [
        {
            question: 'How do I book a trip?',
            answer: 'Go to the Search page, enter your pickup and drop locations, select a trip from the results, and click "Book Now". Follow the payment process to confirm your booking.',
        },
        {
            question: 'How do I become a driver?',
            answer: 'Click on "Become a Driver" from your profile menu. Complete the driver onboarding process by providing your vehicle details, license information, and required documents. Our team will verify your information within 24-48 hours.',
        },
        {
            question: 'How are payments handled?',
            answer: 'We use Razorpay, a secure payment gateway, to process all transactions. You can pay using credit/debit cards, UPI, net banking, or wallets. All payment information is encrypted and secure.',
        },
        {
            question: 'Can I cancel my booking?',
            answer: 'Yes, you can cancel your booking from the "My Trips" page. Cancellation policies vary based on how far in advance you cancel. Check the specific trip\'s cancellation policy before booking.',
        },
        {
            question: 'How do I track my ride?',
            answer: 'Once your trip starts, you\'ll see a "Track Trip" button in your booking details. This will show you the driver\'s real-time location and estimated arrival time.',
        },
        {
            question: 'What if I have an issue during the trip?',
            answer: 'Use the emergency button in the trip tracking screen to contact support immediately. You can also report issues after the trip through the rating and review system.',
        },
        {
            question: 'How do driver ratings work?',
            answer: 'After each trip, passengers can rate drivers on a 5-star scale and leave reviews. These ratings help maintain quality and safety on our platform.',
        },
        {
            question: 'How do I update my profile information?',
            answer: 'Go to your Profile page and click "Edit Profile". You can update your name, phone number, profile photo, and other details.',
        },
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // Simulate sending message
        setTimeout(() => {
            toast({
                title: 'Message sent',
                description: 'We\'ll get back to you within 24 hours.',
            });
            setName('');
            setEmail('');
            setMessage('');
            setLoading(false);
        }, 1000);
    };

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-6 py-12 max-w-6xl">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-display font-bold mb-4">Help & Support</h1>
                    <p className="text-lg text-muted-foreground">
                        Find answers to common questions or get in touch with our support team
                    </p>
                </div>

                {/* Contact Options */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    <Card>
                        <CardHeader className="text-center">
                            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                                <Mail className="w-8 h-8 text-primary" />
                            </div>
                            <CardTitle className="text-lg">Email Support</CardTitle>
                        </CardHeader>
                        <CardContent className="text-center">
                            <p className="text-sm text-muted-foreground mb-4">
                                Get help via email
                            </p>
                            <a href="mailto:support@tcsygo.com" className="text-primary hover:underline">
                                support@tcsygo.com
                            </a>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="text-center">
                            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                                <Phone className="w-8 h-8 text-success" />
                            </div>
                            <CardTitle className="text-lg">Phone Support</CardTitle>
                        </CardHeader>
                        <CardContent className="text-center">
                            <p className="text-sm text-muted-foreground mb-4">
                                Call us for immediate help
                            </p>
                            <a href="tel:+919876543210" className="text-primary hover:underline">
                                +91 98765 43210
                            </a>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="text-center">
                            <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center mx-auto mb-4">
                                <MessageCircle className="w-8 h-8 text-warning" />
                            </div>
                            <CardTitle className="text-lg">Live Chat</CardTitle>
                        </CardHeader>
                        <CardContent className="text-center">
                            <p className="text-sm text-muted-foreground mb-4">
                                Chat with our support team
                            </p>
                            <Button variant="outline" size="sm">
                                Start Chat
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {/* FAQ Section */}
                <Card className="mb-12">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <HelpCircle className="w-6 h-6 text-primary" />
                            <CardTitle>Frequently Asked Questions</CardTitle>
                        </div>
                        <CardDescription>
                            Quick answers to common questions
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Accordion type="single" collapsible className="w-full">
                            {faqItems.map((item, index) => (
                                <AccordionItem key={index} value={`item-${index}`}>
                                    <AccordionTrigger className="text-left">
                                        {item.question}
                                    </AccordionTrigger>
                                    <AccordionContent className="text-muted-foreground">
                                        {item.answer}
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </CardContent>
                </Card>

                {/* Contact Form */}
                <Card>
                    <CardHeader>
                        <CardTitle>Send us a message</CardTitle>
                        <CardDescription>
                            Can't find what you're looking for? Send us a message and we'll get back to you.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Name</Label>
                                    <Input
                                        id="name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Your name"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="your@email.com"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="message">Message</Label>
                                <Textarea
                                    id="message"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Describe your issue or question..."
                                    rows={5}
                                    required
                                />
                            </div>

                            <Button type="submit" disabled={loading}>
                                {loading ? 'Sending...' : 'Send Message'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
