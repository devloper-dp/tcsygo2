import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, FileText, Phone, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RideInsuranceInfoProps {
    tripId: string;
    insuranceCoverage: number;
    policyNumber: string;
    className?: string;
}

export function RideInsuranceInfo({
    tripId,
    insuranceCoverage = 500000,
    policyNumber,
    className = '',
}: RideInsuranceInfoProps) {
    const handleDownloadCertificate = async () => {
        try {
            const { jsPDF } = await import('jspdf');
            const doc = new jsPDF();

            // Header
            doc.setFillColor(33, 197, 94); // Primary color (green-500)
            doc.rect(0, 0, 210, 40, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(22);
            doc.text('Ride Insurance Certificate', 20, 25);
            doc.setFontSize(10);
            doc.text('Provided by TCSYGO Insurance Partners', 140, 25);

            // Policy Details
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(14);
            doc.text('Policy Information', 20, 60);

            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);

            const details = [
                { label: 'Trip ID:', value: tripId },
                { label: 'Policy Number:', value: policyNumber },
                { label: 'Coverage Amount:', value: `INR ${insuranceCoverage.toLocaleString()}` },
                { label: 'Date Issued:', value: new Date().toLocaleDateString() },
                { label: 'Status:', value: 'Active' }
            ];

            let yPos = 80;
            details.forEach(detail => {
                doc.text(detail.label, 20, yPos);
                doc.text(detail.value, 80, yPos);
                yPos += 10;
            });

            // Coverage Details
            doc.setFontSize(14);
            doc.setTextColor(0, 0, 0);
            doc.text('Coverage Inclusions', 20, yPos + 10);

            const inclusions = [
                'Personal accident coverage for passenger',
                'Medical expenses up to INR 50,000',
                'Third-party liability protection',
                '24/7 emergency roadside assistance',
                'Trip interruption reimbursement'
            ];

            yPos += 30;
            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            inclusions.forEach(item => {
                doc.circle(22, yPos - 1, 1, 'F');
                doc.text(item, 28, yPos);
                yPos += 10;
            });

            // Footer
            doc.setDrawColor(200, 200, 200);
            doc.line(20, 260, 190, 260);
            doc.setFontSize(8);
            doc.text('This is a computer generated document and does not require a signature.', 20, 270);
            doc.text('For claims and support, call 1800-XXX-XXXX', 20, 275);

            doc.save(`Insurance_Certificate_${tripId}.pdf`);

        } catch (error) {
            console.error('Failed to generate PDF:', error);
        }
    };

    return (
        <Card className={`p-4 ${className}`}>
            <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">Ride Insurance</h3>
                        <Badge variant="outline" className="bg-success/10 text-success border-success">
                            Active
                        </Badge>
                    </div>

                    <div className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex items-center justify-between">
                            <span>Coverage Amount:</span>
                            <span className="font-semibold text-foreground">₹{insuranceCoverage.toLocaleString()}</span>
                        </div>

                        <div className="flex items-center justify-between">
                            <span>Policy Number:</span>
                            <span className="font-mono text-xs text-foreground">{policyNumber}</span>
                        </div>

                        <div className="pt-2 space-y-2">
                            <p className="text-xs">
                                <strong>Coverage includes:</strong>
                            </p>
                            <ul className="text-xs space-y-1 ml-4 list-disc">
                                <li>Personal accident coverage</li>
                                <li>Medical expenses up to ₹50,000</li>
                                <li>Third-party liability</li>
                                <li>24/7 emergency assistance</li>
                            </ul>
                        </div>

                        <div className="pt-3 flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 gap-2"
                                onClick={handleDownloadCertificate}
                            >
                                <Download className="w-3 h-3" />
                                Certificate
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 gap-2"
                                onClick={() => window.open('tel:1800-123-4567')}
                            >
                                <Phone className="w-3 h-3" />
                                Claim Support
                            </Button>
                        </div>

                        <div className="mt-4 pt-3 border-t">
                            <h4 className="font-semibold text-xs mb-2">How to Claim</h4>
                            <ol className="text-[10px] space-y-1 text-muted-foreground">
                                <li>1. Report incident in the app</li>
                                <li>2. Call helpline: 1800-123-4567</li>
                                <li>3. Submit docs within 48 hours</li>
                            </ol>
                        </div>

                        <p className="text-[10px] pt-2 border-t">
                            <FileText className="w-3 h-3 inline mr-1" />
                            Insurance provided by HDFC ERGO General Insurance
                        </p>
                    </div >
                </div >
            </div >
        </Card >
    );
}
