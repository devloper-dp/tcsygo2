import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { IndianRupee, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface FareBreakdownProps {
    baseFare: number;
    distanceCharges: number;
    timeCharges: number;
    surgeCharges?: number;
    platformFee: number;
    gst: number;
    discount?: number;
    totalFare: number;
    className?: string;
}

export function FareBreakdown({
    baseFare,
    distanceCharges,
    timeCharges,
    surgeCharges = 0,
    platformFee,
    gst,
    discount = 0,
    totalFare,
    className = '',
}: FareBreakdownProps) {
    const subtotal = baseFare + distanceCharges + timeCharges + surgeCharges;

    return (
        <Card className={`p-4 ${className}`}>
            <h3 className="font-semibold mb-4 flex items-center gap-2">
                <IndianRupee className="w-4 h-4" />
                Fare Breakdown
            </h3>

            <div className="space-y-3">
                {/* Base Fare */}
                <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                        <span>Base Fare</span>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger>
                                    <Info className="w-3 h-3 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Minimum charge for the ride</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                    <span>₹{baseFare.toFixed(2)}</span>
                </div>

                {/* Distance Charges */}
                <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                        <span>Distance Charges</span>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger>
                                    <Info className="w-3 h-3 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Charges based on distance traveled</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                    <span>₹{distanceCharges.toFixed(2)}</span>
                </div>

                {/* Time Charges */}
                <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                        <span>Time Charges</span>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger>
                                    <Info className="w-3 h-3 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Charges based on ride duration</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                    <span>₹{timeCharges.toFixed(2)}</span>
                </div>

                {/* Surge Charges */}
                {surgeCharges > 0 && (
                    <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                            <span className="text-warning">Surge Charges</span>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger>
                                        <Info className="w-3 h-3 text-warning" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Additional charges due to high demand</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                        <span className="text-warning">₹{surgeCharges.toFixed(2)}</span>
                    </div>
                )}

                <Separator />

                {/* Subtotal */}
                <div className="flex items-center justify-between text-sm font-medium">
                    <span>Subtotal</span>
                    <span>₹{subtotal.toFixed(2)}</span>
                </div>

                {/* Platform Fee */}
                <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                        <span>Platform Fee</span>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger>
                                    <Info className="w-3 h-3 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Service fee for using the platform</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                    <span>₹{platformFee.toFixed(2)}</span>
                </div>

                {/* GST */}
                <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                        <span>GST (5%)</span>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger>
                                    <Info className="w-3 h-3 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Goods and Services Tax</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                    <span>₹{gst.toFixed(2)}</span>
                </div>

                {/* Discount */}
                {discount > 0 && (
                    <div className="flex items-center justify-between text-sm text-success">
                        <span>Discount Applied</span>
                        <span>-₹{discount.toFixed(2)}</span>
                    </div>
                )}

                <Separator />

                {/* Total */}
                <div className="flex items-center justify-between text-lg font-bold">
                    <span>Total Fare</span>
                    <span className="text-primary">₹{totalFare.toFixed(2)}</span>
                </div>
            </div>
        </Card>
    );
}
