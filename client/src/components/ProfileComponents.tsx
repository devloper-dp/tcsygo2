import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Circle } from 'lucide-react';

interface ProfileCompletionProps {
  user: {
    fullName?: string;
    email?: string;
    phone?: string;
    profilePhoto?: string;
    bio?: string;
  };
  isDriver?: boolean;
  driverProfile?: {
    licenseNumber?: string;
    vehicleMake?: string;
    verificationStatus?: string;
  };
}

export function ProfileCompletion({ user, isDriver, driverProfile }: ProfileCompletionProps) {
  const completionItems = [
    { label: 'Full Name', completed: !!user.fullName, required: true },
    { label: 'Email', completed: !!user.email, required: true },
    { label: 'Phone Number', completed: !!user.phone, required: true },
    { label: 'Profile Photo', completed: !!user.profilePhoto, required: false },
    { label: 'Bio', completed: !!user.bio, required: false },
  ];

  if (isDriver) {
    completionItems.push(
      { label: 'License Details', completed: !!driverProfile?.licenseNumber, required: true },
      { label: 'Vehicle Information', completed: !!driverProfile?.vehicleMake, required: true },
      { label: 'Driver Verification', completed: driverProfile?.verificationStatus === 'verified', required: true }
    );
  }

  const totalItems = completionItems.length;
  const completedItems = completionItems.filter(item => item.completed).length;
  const completionPercentage = Math.round((completedItems / totalItems) * 100);

  const requiredItems = completionItems.filter(item => item.required);
  const completedRequiredItems = requiredItems.filter(item => item.completed).length;
  const isProfileComplete = completedRequiredItems === requiredItems.length;

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Profile Completion</h3>
          <Badge variant={isProfileComplete ? 'default' : 'secondary'}>
            {completionPercentage}%
          </Badge>
        </div>

        <Progress value={completionPercentage} className="h-2" />

        <div className="space-y-2">
          {completionItems.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              {item.completed ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <Circle className="w-4 h-4 text-gray-300" />
              )}
              <span className={`text-sm ${item.completed ? 'text-foreground' : 'text-muted-foreground'}`}>
                {item.label}
                {item.required && !item.completed && (
                  <span className="text-destructive ml-1">*</span>
                )}
              </span>
            </div>
          ))}
        </div>

        {!isProfileComplete && (
          <p className="text-sm text-muted-foreground">
            Complete your profile to unlock all features and build trust with other users.
          </p>
        )}
      </div>
    </Card>
  );
}

interface AccountDeletionProps {
  onDelete: () => void;
}

export function AccountDeletion({ onDelete }: AccountDeletionProps) {
  return (
    <Card className="p-6 border-destructive">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-destructive">Delete Account</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Permanently delete your account and all associated data
          </p>
        </div>

        <div className="space-y-2 text-sm">
          <p className="font-medium">This action will:</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Delete all your personal information</li>
            <li>Cancel all upcoming trips and bookings</li>
            <li>Remove your reviews and ratings</li>
            <li>Permanently delete your account</li>
          </ul>
        </div>

        <div className="pt-2">
          <button
            onClick={onDelete}
            className="text-sm text-destructive hover:underline font-medium"
          >
            I understand, delete my account
          </button>
        </div>
      </div>
    </Card>
  );
}
