import { useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Download, Share2, Receipt, MapPin, Calendar, User, Car, CreditCard } from 'lucide-react';
import { formatCurrency } from '@/lib/fareCalculator';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface PaymentReceiptProps {
    bookingId: string;
    tripDate: Date;
    driverName: string;
    vehicleNumber: string;
    vehicleModel?: string;
    pickupLocation: string;
    dropLocation: string;
    distance: number;
    duration: number;
    baseFare: number;
    distanceCharge: number;
    timeCharge: number;
    surgePricing?: number;
    platformFee: number;
    gst: number;
    discount?: number;
    tip?: number;
    totalFare: number;
    paymentMethod: string;
    paymentId: string;
    autoDownload?: boolean;
    className?: string;
}

export function PaymentReceipt({
    bookingId,
    tripDate,
    driverName,
    vehicleNumber,
    vehicleModel,
    pickupLocation,
    dropLocation,
    distance,
    duration,
    baseFare,
    distanceCharge,
    timeCharge,
    surgePricing = 0,
    platformFee,
    gst,
    discount = 0,
    tip = 0,
    totalFare,
    paymentMethod,
    paymentId,
    autoDownload = false,
    className = '',
}: PaymentReceiptProps) {
    const { toast } = useToast();

    useEffect(() => {
        if (autoDownload) {
            handleDownload();
        }
    }, [autoDownload]);

    const handleDownload = async () => {
        try {
            toast({
                title: 'Generating PDF',
                description: 'Please wait while we generate your receipt...',
            });

            const { jsPDF } = await import('jspdf');
            const doc = new jsPDF();

            // Header Background
            doc.setFillColor(34, 197, 94); // Success green
            doc.rect(0, 0, 210, 40, 'F');

            // Logo/Title
            doc.setFontSize(28);
            doc.setTextColor(255, 255, 255);
            doc.text('TCSYGO', 105, 25, { align: 'center' });

            doc.setFontSize(14);
            doc.text('Official Ride Receipt', 105, 35, { align: 'center' });

            // Receipt Info
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(10);
            let y = 55;
            doc.text(`Booking ID: ${bookingId.toUpperCase()}`, 20, y);
            doc.text(`Date: ${format(tripDate, 'PPpp')}`, 190, y, { align: 'right' });

            y += 10;
            doc.setDrawColor(230, 230, 230);
            doc.line(20, y, 190, y);
            y += 15;

            // Trip Details Section
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('TRIP DETAILS', 20, y);
            doc.setFont('helvetica', 'normal');
            y += 10;

            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text('PICKUP', 20, y);
            doc.text('DROP', 105, y);
            y += 6;

            doc.setTextColor(0, 0, 0);
            const pickupLines = doc.splitTextToSize(pickupLocation, 80);
            const dropLines = doc.splitTextToSize(dropLocation, 80);
            const maxLines = Math.max(pickupLines.length, dropLines.length);

            doc.text(pickupLines, 20, y);
            doc.text(dropLines, 105, y);
            y += (maxLines * 5) + 10;

            // Driver & Vehicle
            doc.setTextColor(100, 100, 100);
            doc.text('DRIVER', 20, y);
            doc.text('VEHICLE', 105, y);
            y += 6;
            doc.setTextColor(0, 0, 0);
            doc.text(driverName, 20, y);
            doc.text(`${vehicleNumber} ${vehicleModel ? `• ${vehicleModel}` : ''}`, 105, y);
            y += 15;

            doc.line(20, y, 190, y);
            y += 15;

            // Fare Breakdown
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('FARE BREAKDOWN', 20, y);
            doc.setFont('helvetica', 'normal');
            y += 10;

            doc.setFontSize(10);
            const addRow = (label: string, value: string, isBold = false, color = [0, 0, 0]) => {
                doc.setTextColor(color[0], color[1], color[2]);
                if (isBold) doc.setFont('helvetica', 'bold');
                doc.text(label, 20, y);
                doc.text(value, 190, y, { align: 'right' });
                doc.setFont('helvetica', 'normal');
                y += 8;
            };

            addRow('Base Fare', formatCurrency(baseFare));
            addRow(`Distance Charge (${distance.toFixed(1)} km)`, formatCurrency(distanceCharge));
            addRow(`Time Charge (${duration} min)`, formatCurrency(timeCharge));

            if (surgePricing > 0) {
                addRow('Surge Pricing', formatCurrency(surgePricing), false, [220, 38, 38]);
            }

            addRow('Platform Fee', formatCurrency(platformFee));
            addRow('GST (5%)', formatCurrency(gst));

            if (discount > 0) {
                addRow('Discount Applied', `-${formatCurrency(discount)}`, false, [22, 163, 74]);
            }

            if (tip > 0) {
                addRow('Driver Tip', formatCurrency(tip), false, [37, 99, 235]);
            }

            y += 4;
            doc.setDrawColor(0, 0, 0);
            doc.line(130, y, 190, y);
            y += 10;

            doc.setFontSize(14);
            addRow('Total Amount Paid', formatCurrency(totalFare), true, [34, 197, 94]);

            // Payment Method Info
            y += 10;
            doc.setFontSize(9);
            doc.setTextColor(100, 100, 100);
            doc.text(`Paid via ${paymentMethod.toUpperCase()}`, 105, y, { align: 'center' });
            y += 5;
            doc.text(`Transaction ID: ${paymentId}`, 105, y, { align: 'center' });

            // Footer
            doc.setFontSize(8);
            doc.text('This is a computer-generated receipt and does not require a physical signature.', 105, 280, { align: 'center' });
            doc.text('Thank you for riding with TCSYGO!', 105, 285, { align: 'center' });

            doc.save(`TCSYGO_Receipt_${bookingId.slice(0, 8)}.pdf`);

            toast({
                title: 'Receipt Downloaded',
                description: 'Your ride receipt is ready.',
            });
        } catch (error) {
            console.error('Error generating PDF:', error);
            toast({
                title: 'Download Failed',
                description: 'Could not generate PDF receipt.',
                variant: 'destructive',
            });
        }
    };

    const handleShare = async () => {
        const shareText = `TCSYGO Ride Receipt\nBooking: ${bookingId}\nTotal: ${formatCurrency(totalFare)}\nDate: ${format(tripDate, 'PPpp')}`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'TCSYGO Receipt',
                    text: shareText,
                });
            } catch (error) {
                console.error('Error sharing:', error);
            }
        } else {
            navigator.clipboard.writeText(shareText);
            toast({
                title: 'Copied to Clipboard',
                description: 'Receipt details copied for sharing.',
            });
        }
    };

    return (
        <Card className={`overflow-hidden border-primary/20 shadow-lg ${className}`}>
            {/* Header Section */}
            <div className="bg-primary text-primary-foreground p-6 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-2">
                    <Receipt className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight">Ride Receipt</h2>
                <div className="flex items-center justify-center gap-2">
                    <Badge variant="secondary" className="bg-white/10 text-white border-white/20 font-mono">
                        {bookingId.slice(0, 8).toUpperCase()}
                    </Badge>
                    <Badge variant="outline" className="bg-green-500/20 text-green-300 border-green-500/30">
                        Paid
                    </Badge>
                </div>
                <p className="text-sm opacity-80">
                    {format(tripDate, 'PPpp')}
                </p>
            </div>

            <div className="p-6 space-y-6">
                {/* Trip Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            <MapPin className="w-4 h-4" /> Trip Details
                        </h3>
                        <div className="space-y-3 relative pl-4 border-l-2 border-primary/20">
                            <div>
                                <p className="text-xs text-muted-foreground">Pickup</p>
                                <p className="text-sm font-medium leading-tight">{pickupLocation}</p>
                            </div>
                            <div className="py-1">
                                <p className="text-[10px] font-bold text-primary/60">{distance.toFixed(1)} km • {duration} min</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Drop</p>
                                <p className="text-sm font-medium leading-tight">{dropLocation}</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            <Car className="w-4 h-4" /> Driver & Vehicle
                        </h3>
                        <div className="flex items-center gap-3 bg-muted/50 p-3 rounded-lg">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <User className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <p className="text-sm font-bold">{driverName}</p>
                                <p className="text-xs text-muted-foreground">{vehicleNumber} {vehicleModel ? `• ${vehicleModel}` : ''}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <Separator />

                {/* Fare Breakdown */}
                <div className="space-y-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <CreditCard className="w-4 h-4" /> Fare Details
                    </h3>
                    <div className="space-y-2.5 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Base Fare</span>
                            <span>{formatCurrency(baseFare)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Distance Charge</span>
                            <span>{formatCurrency(distanceCharge)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Time Charge</span>
                            <span>{formatCurrency(timeCharge)}</span>
                        </div>
                        {surgePricing > 0 && (
                            <div className="flex justify-between text-destructive font-medium">
                                <span className="flex items-center gap-1">Surge Pricing <Badge variant="outline" className="scale-75 origin-left py-0">High Demand</Badge></span>
                                <span>{formatCurrency(surgePricing)}</span>
                            </div>
                        )}
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Platform Fee (5%)</span>
                            <span>{formatCurrency(platformFee)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">GST (5%)</span>
                            <span>{formatCurrency(gst)}</span>
                        </div>
                        {discount > 0 && (
                            <div className="flex justify-between text-green-600 font-medium">
                                <span>Promo Discount</span>
                                <span>-{formatCurrency(discount)}</span>
                            </div>
                        )}
                        {tip > 0 && (
                            <div className="flex justify-between text-primary font-medium">
                                <span>Driver Tip</span>
                                <span>{formatCurrency(tip)}</span>
                            </div>
                        )}

                        <div className="pt-2 border-t flex justify-between items-center">
                            <span className="text-base font-bold">Total Paid</span>
                            <span className="text-2xl font-bold text-primary">
                                {formatCurrency(totalFare)}
                            </span>
                        </div>
                    </div>
                </div>

                <Separator />

                {/* Payment Info */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-muted/30 p-4 rounded-xl border border-border">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-background rounded-full border border-border shadow-sm">
                            <CreditCard className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Payment Method</p>
                            <p className="text-sm font-bold capitalize">{paymentMethod}</p>
                        </div>
                    </div>
                    <div className="text-left sm:text-right">
                        <p className="text-xs text-muted-foreground">Transaction ID</p>
                        <p className="text-xs font-mono break-all">{paymentId}</p>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                    <Button
                        variant="default"
                        onClick={handleDownload}
                        className="flex-1 shadow-md hover:shadow-lg transition-all"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Download PDF
                    </Button>
                    <Button
                        variant="outline"
                        onClick={handleShare}
                        className="flex-1 border-primary/20 bg-primary/5 hover:bg-primary/10"
                    >
                        <Share2 className="w-4 h-4 mr-2" />
                        Share
                    </Button>
                </div>

                {/* Footer */}
                <p className="text-[10px] text-center text-muted-foreground px-4">
                    This receipt is computer-generated and serves as official proof of payment for your ride with TCSYGO. If you have any questions, please contact our support team.
                </p>
            </div>
        </Card>
    );
}
